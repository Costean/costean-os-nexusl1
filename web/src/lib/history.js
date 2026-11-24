// History for the stock NexusL1 firmware.
// 1) On the miner: GET /api/system/info?ts=&cur=&limit=&history_span= returns up to 3 h of samples kept in PSRAM (lost on reboot).
//    Format (same as the stock UI reads it): timestamps[] relative to timestampBase (s or ms), hashrate_1m/10m/1h/1d in units of
//    100 H/s for Scrypt (stock UI multiplies by 1e4 to get H/s), vregTemp/asicTemp in 1/100 °C.
// 2) In this browser: 15-minute averages of what the page has seen, kept 30 days in localStorage. Pure functions, unit tested.
export const DEVICE_SPAN_MS = 3 * 3600e3, BUCKET_MS = 15 * 60e3, KEEP_DAYS = 30;
const fin = v => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const temp = v => { const n = fin(v); return n != null && n > 0 ? n / 100 : null; };
export function absTs(base, t) { let a = Number(base || 0) + Number(t); if (a > 0 && a < 1e12) a *= 1e3; return Number.isFinite(a) && a > 0 ? a : null; }
/** Device history chunk -> [{t, mh, mh10, mh1h, asic, vr}] (MH/s, °C), sorted, invalid points dropped. */
export function deviceHistory(h) {
  if (!h || !Array.isArray(h.timestamps)) return [];
  const g = k => Array.isArray(h[k]) ? h[k] : [];
  const a = g('hashrate_1m'), b = g('hashrate_10m'), c = g('hashrate_1h'), at = g('asicTemp'), vr = g('vregTemp');
  const n = Math.min(h.timestamps.length, a.length); const out = [];
  for (let k = 0; k < n; k++) {
    const t = absTs(h.timestampBase, h.timestamps[k]); const mh = fin(a[k]);
    if (t == null || mh == null) continue;
    out.push({ t, mh: mh / 100, mh10: fin(b[k]) != null ? b[k] / 100 : null, mh1h: fin(c[k]) != null ? c[k] / 100 : null, asic: temp(at[k]), vr: temp(vr[k]) });
  }
  return out.sort((x, y) => x.t - y.t);
}
export const lastAbsTs = h => { const p = deviceHistory(h); return p.length ? p[p.length - 1].t : null; };
const FIELDS = ['mh', 'asic', 'vr', 'w'];
/** Add one sample {t, mh, asic, vr, w} to the 15-minute buckets (running averages, per-field counts). Returns the array. */
export function addSample(buckets, s) {
  if (!s || !Number.isFinite(s.t)) return buckets;
  const t0 = Math.floor(s.t / BUCKET_MS) * BUCKET_MS;
  let b = buckets.length ? buckets[buckets.length - 1] : null;
  if (b && t0 < b.t) { b = buckets.find(x => x.t === t0); if (!b) return buckets; }   // late sample for an old bucket we no longer have
  else if (!b || b.t !== t0) { b = { t: t0 }; buckets.push(b); }
  for (const f of FIELDS) { const v = Number(s[f]); if (s[f] == null || !Number.isFinite(v) || (f !== 'mh' && v <= 0)) continue; const n = (b[f + 'n'] || 0) + 1; b[f] = (b[f] ?? 0) + (v - (b[f] ?? 0)) / n; b[f + 'n'] = n; }
  return buckets;
}
export const prune = (buckets, now, days = KEEP_DAYS) => buckets.filter(b => b.t >= now - days * 86400e3);
/** Merge device samples newer than `after` into the buckets (avoids counting the same minutes twice). */
export function mergeDevice(buckets, pts, after = 0) { for (const p of pts) if (p.t > after) addSample(buckets, { t: p.t, mh: p.mh, asic: p.asic, vr: p.vr }); return buckets; }
export function summary(points, fromT, toT) {
  const avg = k => { const v = points.map(p => p[k]).filter(x => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const mx = k => { const v = points.map(p => p[k]).filter(x => x != null && Number.isFinite(x)); return v.length ? Math.max(...v) : null; };
  const span = Math.max(1, (toT ?? Date.now()) - (fromT ?? (points[0]?.t ?? 0)));
  const covered = new Set(points.map(p => Math.floor(p.t / BUCKET_MS))).size * BUCKET_MS;
  return { mh: avg('mh'), asic: avg('asic'), asicMax: mx('asic'), vr: avg('vr'), vrMax: mx('vr'), w: avg('w'), coverage: Math.min(100, covered / span * 100), n: points.length };
}
export function toCsv(points) {
  const r = ['time_utc,hashrate_mhs,asic_c,vr_c,power_w'];
  for (const p of points) r.push([new Date(p.t).toISOString(), p.mh?.toFixed(2) ?? '', p.asic?.toFixed(1) ?? '', p.vr?.toFixed(1) ?? '', p.w?.toFixed(1) ?? ''].join(','));
  return r.join('\n') + '\n';
}
