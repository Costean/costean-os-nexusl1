// Health score + rule-based insights for the NexusL1 (stock v1 /api/system/info). Board-level only: the BM1491 board has no
// per-chip temperatures or per-chip error counters. Builds on model.health(). Pure, unit tested.
import { health, efficiency, expectedMH, fmtMH } from './model.js';
const PENALTY = { crit: 30, warn: 10, info: 2, ok: 0 };
export const LIMITS = { pingWarn: 150, lossWarn: 5, cvWarn: 0.08 };
/** ring = recent samples [{t, mh}] (optional) */
export function analyze(i, asic, ring = []) {
  if (!i) return { score: 0, grade: 'offline', items: [{ level: 'crit', title: 'Miner offline', why: 'No response from the miner API.' }] };
  const items = health(i, asic).filter(c => c.level !== 'ok');
  const add = (level, title, why) => items.push({ level, title, why });
  if (Number(i.recentpingloss) >= LIMITS.lossWarn) add('warn', `Pool packet loss ${(+i.recentpingloss).toFixed(1)}%`, 'Recent ping loss to the pool. Check Wi-Fi / Ethernet and the pool host.');
  if (Number(i.lastpingrtt) > LIMITS.pingWarn) add('info', `Pool ping ${(+i.lastpingrtt).toFixed(0)} ms`, 'High latency increases stale (rejected) shares. A closer pool helps.');
  if (Number(i.fanspeed) > 0 && Number(i.fanrpm) === 0 && i.uptimeSeconds > 60) add('crit', 'Fan reports 0 rpm', 'The fan is driven but no rotation is measured. Check the fan and its cable now.');
  if (i.minVoltage && i.voltage && i.voltage / 1000 < i.minVoltage) add('warn', `Input voltage low ${(i.voltage / 1000).toFixed(2)} V`, `Below ${i.minVoltage} V. PSU may be undersized or the cable too thin.`);
  if (/panic|brownout/i.test(i.lastResetReason || '') && i.uptimeSeconds < 86400) add('warn', 'Last restart: ' + i.lastResetReason, 'The miner restarted unexpectedly within the last day.');
  const pts = ring.slice(-60).map(p => +p.mh).filter(v => Number.isFinite(v) && v > 0);
  if (pts.length >= 20) { const m = pts.reduce((a, b) => a + b, 0) / pts.length; const sd = Math.sqrt(pts.reduce((a, b) => a + (b - m) ** 2, 0) / pts.length); if (m > 0 && sd / m > LIMITS.cvWarn) add('info', 'Hashrate is jumpy', `±${(sd / m * 100).toFixed(0)}% over the last ${pts.length} readings. Normal short-term, worth watching if it persists.`); }
  let score = 100; for (const c of items) score -= PENALTY[c.level] ?? 0; score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 50 ? 'fair' : 'poor';
  const exp = expectedMH(i), eff = efficiency(i.power, i.hashRate);
  const facts = [exp ? `${((i.hashRate || 0) / exp * 100).toFixed(1)}% of ${fmtMH(exp)} core math` : null, eff ? `${eff.toFixed(1)} mJ/MH` : null].filter(Boolean);
  if (!items.length) items.push({ level: 'ok', title: 'All checks passed', why: 'Temperatures, hashrate, shares, fan, power and pool look healthy.' });
  return { score, grade, items, facts };
}
