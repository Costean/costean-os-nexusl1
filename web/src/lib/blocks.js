// Block Found helpers (pure, unit-tested). Only fields the stock nexus.v1.0.4.4 API really returns are used:
// /api/system/info: foundBlocks (this boot), totalFoundBlocks (all time, NVS "totalblocks"), bestDiff, bestSessionDiff,
// networkDifficulty (from the current LTC job nBits), poolDifficulty, hashRate (MH/s); /api/alert/info: block-found toggles.
export const TWO32 = 4294967296;
export const LTC_BLOCK_SECS = 150;
/** stock UI's convertBestDiffToNumber: numbers pass through, "16.0M"-style strings are expanded. */
export function toNum(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (!v || typeof v !== 'string') return 0;
  const n = parseFloat(v); if (isNaN(n)) return 0;
  const m = { K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15, E: 1e18 }[v.trim().slice(-1).toUpperCase()];
  return m ? n * m : n;
}
/** expected seconds to hit difficulty d at mh MH/s (standard difficulty-1 = 2^32 hashes) */
export const expectSecs = (d, mh) => (d > 0 && mh > 0) ? d * TWO32 / (mh * 1e6) : Infinity;
export const probWithin = (d, mh, T) => { const e = expectSecs(d, mh); return isFinite(e) ? 1 - Math.exp(-T / e) : 0; };
/** network hashrate implied by difficulty d at the 2.5 min Litecoin block time, in H/s (sanity check for units) */
export const impliedNetHash = d => d > 0 ? d * TWO32 / LTC_BLOCK_SECS : 0;
export const fmtHash = h => { if (!(h > 0)) return '—'; const u = ['H/s', 'kH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s']; let i = 0; while (h >= 1000 && i < u.length - 1) { h /= 1000; i++; } return h.toFixed(2) + ' ' + u[i]; };
export const fmtDur = s => { if (!isFinite(s)) return '∞'; const u = [['yr', 31557600], ['d', 86400], ['h', 3600], ['min', 60], ['s', 1]];
  for (const [n, v] of u) if (s >= v) { const x = s / v; return (x >= 1e6 ? x.toExponential(1) : x >= 100 ? Math.round(x).toLocaleString('en-US') : x.toFixed(1)) + ' ' + n; } return s.toFixed(1) + ' s'; };
export const fmtOdds = p => !(p > 0) ? '—' : p >= 0.01 ? (p * 100).toFixed(2) + '%' : '1 in ' + Math.round(1 / p).toLocaleString('en-US');
/** log-scale progress of best share toward the network target, 0..100 */
export const progressPct = (best, net) => (best > 1 && net > 1) ? Math.min(100, Math.log10(best) / Math.log10(net) * 100) : 0;
/** localStorage key per miner (MAC, else hostname) */
export const seenKey = info => 'costean.blocks.' + String(info?.macAddr || info?.hostname || 'miner').replace(/[^\w:.-]/g, '');
/**
 * Browser-side block log. The firmware exposes counters only (no history, no timestamps), so this records
 * when THIS browser first saw a counter go up. prev: stored state or null. Returns the new state.
 * state = { since, baseSession, baseTotal, lastSession, lastTotal, events: [{ t, total, session, delta, bestDiff, networkDifficulty, uptime }] }
 */
export function observe(prev, info, now = Date.now()) {
  if (!info) return prev;
  const session = Math.max(0, Math.floor(+info.foundBlocks || 0)), total = Math.max(0, Math.floor(+info.totalFoundBlocks || 0));
  if (!prev || typeof prev !== 'object' || !Array.isArray(prev.events)) return { since: now, baseSession: session, baseTotal: total, lastSession: session, lastTotal: total, events: [] };
  const s = { ...prev, events: prev.events.slice() };
  // all-time counter is authoritative; if it went down (stats reset / reflash) re-baseline without an event
  let delta = 0;
  if (total > s.lastTotal) delta = total - s.lastTotal;
  else if (total === s.lastTotal && session > s.lastSession) delta = session - s.lastSession;
  if (delta > 0) s.events.push({ t: now, total, session, delta, bestDiff: toNum(info.bestDiff), networkDifficulty: +info.networkDifficulty || 0, uptime: +info.uptimeSeconds || 0 });
  if (s.events.length > 50) s.events.splice(0, s.events.length - 50);
  s.lastSession = session; s.lastTotal = total;
  return s;
}
