// Pure helpers (unit-tested). Nexus L1 = Scrypt: firmware reports hashRate in MH/s.
export const isLtc = m => m === 'NexusL1' || m === 'NexusL1_9' || m === 'ms06';
export const fmtMH = mh => mh == null || isNaN(mh) ? '—' : mh >= 1000 ? (mh / 1000).toFixed(2) + ' GH/s' : mh.toFixed(1) + ' MH/s';
export const fmtDiff = d => { d = Number(d); if (!d) return '0'; const u = ['', 'K', 'M', 'G', 'T', 'P', 'E']; let i = 0; while (d >= 1000 && i < u.length - 1) { d /= 1000; i++; } return d.toFixed(i ? 2 : 0) + u[i]; };
export const fmtUptime = s => { s = Math.floor(s || 0); const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return (d ? d + 'd ' : '') + h + 'h ' + m + 'm'; };
export const fmtBytes = b => b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(0) + ' KB';
export const rssiLabel = r => r == null ? '—' : r > -55 ? 'Excellent' : r > -67 ? 'Good' : r > -75 ? 'Fair' : 'Weak';
/**
 * Physical chip count. The NexusL1 has 4 BM1491 chips, but the stock v1.0.4.4 firmware hard-codes asicCount = 6 for
 * this board (board constructor; asicTemps is also 6 long), so for the NexusL1 we show 4. Other models: asicCount.
 * This is display only; nothing is written back to the miner.
 */
export const NEXUS_L1_CHIPS = 4;
export function chipCount(i) {
  if (i?.deviceModel === 'NexusL1' || (!i?.deviceModel && (i?.ASICModel || 'BM1491') === 'BM1491')) return NEXUS_L1_CHIPS;
  const n = Number(i?.asicCount) || (Array.isArray(i?.asicTemps) ? i.asicTemps.length : 0);
  return n > 0 ? n : NEXUS_L1_CHIPS;
}
/** True when the firmware's asicCount differs from the physical chip count (NexusL1: firmware says 6). */
export const fwCountMismatch = i => Number(i?.asicCount) > 0 && Number(i.asicCount) !== chipCount(i);
/** Same formula the stock Nexus web UI uses (MH/s for LTC devices). Uses the firmware's asicCount as-is: the stock
 *  constant (×6 / 3332) is calibrated to the L1's rated ~330 MH/s, so it stays the stock expectation. */
export function expectedMH(i) {
  const f = +i?.frequency, c = +i?.smallCoreCount, n = +i?.asicCount; if (!f || !c || !n) return 0;
  return i.ASICModel === 'M2510' || i.deviceModel === 'ms06' ? f * (8 * (c - 2) * n) / 47616 : f * (c * n / (isLtc(i.deviceModel) ? 3332 : 1000));
}
/** mJ/MH (= J/GH) from watts and MH/s */
export const efficiency = (w, mh) => (mh > 0 && w > 0) ? w / mh * 1000 : null;
export const rejectPct = i => { const a = +i?.sharesAccepted || 0, r = +i?.sharesRejected || 0; return a + r ? r / (a + r) * 100 : 0; };
export const errLevel = p => p >= 2 ? 'crit' : p >= 1 ? 'warn' : 'ok';
/** Stock tuning from /api/system/asic (falls back to info). */
export const stock = (asic, info) => ({ f: asic?.defaultFrequency ?? info?.defaultFrequency, v: asic?.defaultVoltage ?? info?.defaultCoreVoltage });
export function isAboveStock(f, v, asic, info) {
  const s = stock(asic, info); return (f != null && s.f && f > s.f) || (v != null && s.v && v > s.v);
}
export function outOfLimits(f, v, asic) {
  if (!asic) return null;
  if (f != null && asic.absMaxFrequency && f > asic.absMaxFrequency) return `Frequency above firmware limit ${asic.absMaxFrequency} MHz`;
  if (v != null && asic.absMaxVoltage && v > asic.absMaxVoltage) return `Voltage above firmware limit ${asic.absMaxVoltage} mV`;
  if (v != null && asic.absMinVoltage && v < asic.absMinVoltage) return `Voltage below firmware limit ${asic.absMinVoltage} mV`;
  return null;
}
export function modeOf(info, asic) {
  if (!info) return null; const s = stock(asic, info); const f = info.frequency, v = info.coreVoltage;
  const eco = asic?.ecoFrequency && f === asic.ecoFrequency && v === asic.ecoVoltage;
  const label = f === s.f && v === s.v ? 'STOCK' : eco ? 'ECO' : isAboveStock(f, v, asic, info) ? 'TUNED+' : 'CUSTOM';
  return { label, text: `${label} | ${f} MHz | ${v} mV`, level: label === 'TUNED+' ? 'warn' : 'ok' };
}
/**
 * Pool list exactly as the stock Nexus UI sends it in PATCH /api/system: password only when changed,
 * enonceSubscribe/tls as booleans, sourceIndex preserved. edits: optional array of per-pool overrides.
 */
export function poolsPayload(info, edits = null) {
  const src = edits ?? (info?.pools?.length ? info.pools : [{ url: info?.stratumURL, port: info?.stratumPort, user: info?.stratumUser, enonceSubscribe: info?.stratumEnonceSubscribe, tls: info?.stratumTLS, protocol: info?.stratumProtocol, sv2AuthorityPubkey: info?.sv2AuthorityPubkey, sv2ChannelType: info?.sv2ChannelType, weight: 100 }]);
  return src.map((p, n) => {
    const o = { sourceIndex: p.sourceIndex ?? (p.url ? n : -1), url: p.url ?? '', port: +(p.port ?? 3333), user: p.user ?? '', enonceSubscribe: p.enonceSubscribe == 1 || p.enonceSubscribe === true, tls: p.tls == 1 || p.tls === true,
      protocol: +(p.protocol ?? 0), sv2AuthorityPubkey: p.sv2AuthorityPubkey ?? '', sv2ChannelType: +(p.sv2ChannelType ?? 0), weight: +(p.weight ?? 25) };
    if (p.password != null && p.password !== '' && p.password !== '*****') o.password = p.password;
    return o;
  });
}
/** Every PATCH carries the current pool block unchanged (mirrors stock UI, so pools are never dropped). */
export function withPools(info, patch) {
  const out = { ...patch };
  if (!('pools' in out)) out.pools = poolsPayload(info);
  if (!('poolMode' in out)) out.poolMode = info?.stratum?.poolMode ?? 0;
  if (!('poolBalance' in out)) out.poolBalance = info?.stratum?.poolBalance ?? 50;
  return out;
}
export function validatePool(p) {
  if (!p.url) return 'Pool URL is required';
  if (/stratum\+tcp:\/\//i.test(p.url)) return 'Enter the host only, without stratum+tcp://';
  if (/:/.test(p.url)) return 'Enter the port in the Port field, not in the URL';
  if (!(+p.port >= 1 && +p.port <= 65353)) return 'Port must be 1-65353';
  if (!p.user) return 'Worker / wallet user is required';
  return null;
}
export const redact = o => JSON.parse(JSON.stringify(o, (k, v) => /pass|token|totp/i.test(k) && v ? '••••••' : v));
export const RESET_REASONS = { 'Power on': 'Normal power-on', 'Software reset': 'Restarted by software', 'Panic': 'Firmware crash (panic) - check logs', 'Brownout': 'Power dip (brownout) - check PSU' };
/** Health checks shown on Dashboard/Diagnostics. */
export function health(i, asic) {
  if (!i) return [{ level: 'crit', title: 'Miner offline', why: 'No response from /api/system/info' }];
  const out = []; const exp = expectedMH(i); const ot = i.overheat_temp || 70;
  if (i.shutdown) out.push({ level: 'crit', title: 'ASICs shut down', why: 'Thermal/power protection or user shutdown. Restart after fixing the cause.' });
  const bt = boardTemp(i);
  if (bt != null && bt >= ot - 3) out.push({ level: 'crit', title: 'ASIC temperature near overheat limit', why: `${bt.toFixed(1)} °C vs limit ${ot} °C` });
  else if (bt != null && bt >= ot - 10) out.push({ level: 'warn', title: 'Chips running warm', why: `${bt.toFixed(1)} °C, limit ${ot} °C` });
  if (i.vrTemp >= 85) out.push({ level: 'warn', title: 'Voltage regulator hot', why: `${i.vrTemp?.toFixed(1)} °C` });
  if (exp && i.uptimeSeconds > 600 && i.hashRate < 0.85 * exp) out.push({ level: 'warn', title: 'Hashrate below expected', why: `${fmtMH(i.hashRate)} vs ${fmtMH(exp)} core math` });
  const rp = rejectPct(i); if (rp >= 2) out.push({ level: 'warn', title: 'High share reject rate', why: rp.toFixed(2) + '% rejected' });
  if (i.duplicateHWNonces > 0) out.push({ level: 'warn', title: 'Duplicate hardware nonces', why: `${i.duplicateHWNonces} duplicates (possible chip/communication errors)` });
  const pool = (i.stratum?.pools || [])[0]; if (pool && pool.connected === false && !i.stratum?.usingFallback) out.push({ level: 'warn', title: 'Primary pool not connected', why: i.stratumURL || '' });
  (i.stratum?.pools || []).forEach((p, k) => { if (p?.poolDiffErr) out.push({ level: 'warn', title: `Pool ${k + 1} difficulty below chip minimum`, why: 'Multi-pool mode: use a higher-difficulty port/setting on that pool (see Pools)' }); });
  if (i.stratum?.usingFallback) out.push({ level: 'warn', title: 'Running on fallback pool', why: i.fallbackStratumURL || '' });
  if (i.wifiRSSI != null && i.wifiRSSI < -75 && !i.ethConnected) out.push({ level: 'warn', title: 'Weak Wi-Fi', why: i.wifiRSSI + ' dBm' });
  if (isAboveStock(i.frequency, i.coreVoltage, asic, i)) out.push({ level: 'warn', title: 'Above stock tuning', why: `${i.frequency} MHz / ${i.coreVoltage} mV` });
  if (!out.length) out.push({ level: 'ok', title: 'All checks passed', why: 'Temperatures, hashrate, shares and pool look healthy' });
  return out;
}
export class Ring { constructor(n) { this.n = n; this.a = []; } push(x) { this.a.push(x); if (this.a.length > this.n) this.a.shift(); } }
/**
 * Per-chip temperatures as the stock Nexus firmware reports them.
 * /api/system/info always sends `asicTemps` with one entry per chip (board->getChipTemp(i)). That array is only filled
 * when the firmware polls each chip's temperature register, which stock v1.0.4.4 does only on boards with
 * register-based chip monitoring. The NexusL1 (BM1491) board has that switched off, so every entry stays 0.
 * Returns the array (0/invalid entries -> null) or null when the firmware has no real per-chip data.
 */
export function chipTemps(i) {
  const a = i?.asicTemps; if (!Array.isArray(a) || !a.length) return null;
  const v = a.map(x => { const n = Number(x); return x != null && Number.isFinite(n) && n > 0 ? n : null; });
  return v.some(x => x != null) ? v : null;
}
/** Hottest chip reading: max real per-chip value, else the board-level `temp` the firmware reports; null if 0/missing (stock maxAsicTemp logic). */
export function boardTemp(i) {
  const c = chipTemps(i); if (c) return Math.max(...c.filter(x => x != null));
  const t = Number(i?.temp); return Number.isFinite(t) && t > 0 ? t : null;
}
/** Real (non-zero) temperature or null, so a missing sensor shows "—" instead of a fake 0.0. */
export const realTemp = v => { const n = Number(v); return v != null && Number.isFinite(n) && n > 0 ? n : null; };
/** Fan patch exactly like the Thermal page sends it (legacy fields + fans[] for the stock v1.0.4.4 firmware). */
export function fanPatch(i, { mode, manual, target, overheat } = {}) {
  const f0 = i?.fans?.[0] || {};
  const m = mode ?? (i?.autofanspeed === 0 ? 0 : 2), ms = manual ?? i?.manualFanSpeed ?? 100, tg = target ?? (i?.pidTargetTemp > 0 ? i.pidTargetTemp : 60), oh = overheat ?? i?.overheat_temp ?? 70;
  const pid = { targetTemp: +tg, p: f0.pid?.p ?? i?.pidP, i: f0.pid?.i ?? i?.pidI, d: f0.pid?.d ?? i?.pidD };
  const fans = [{ mode: +m, manualSpeed: +ms, overheatTemp: +oh, pid }];
  if ((i?.fans?.length || i?.fanCount || 1) > 1 && i?.fans?.[1]) { const f1 = i.fans[1]; fans.push({ mode: f1.mode, manualSpeed: f1.manualSpeed, overheatTemp: f1.overheatTemp, pid: f1.pid }); }
  return { autofanspeed: +m, manualFanSpeed: +ms, pidTargetTemp: +tg, overheat_temp: +oh, fans };
}
