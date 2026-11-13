// Multi-pool hashrate split helpers (pure, unit-tested).
// The stock NexusL1 v1.0.4.4 firmware already has "Simultaneous Multi-Pool (1-4 Pools)" (poolMode 1):
//   exactly 2 pools -> poolBalance (pool 1 gets poolBalance %, pool 2 the rest), as the stock UI sends it;
//   3-4 pools      -> per-pool `weight` (relative share of jobs; NVS poolwt0..3).
// The firmware hands out jobs to all chips in proportion over time; it does not assign chips to pools.
export const MAX_POOLS = 4;
export const MODE_FAILOVER = 0, MODE_MULTI = 1;
/** Even split that totals exactly 100 (remainder goes to the first pools): 3 -> [34,33,33]. */
export function evenSplit(n) {
  n = Math.max(1, Math.min(MAX_POOLS, n | 0)); const b = Math.floor(100 / n), r = 100 - b * n;
  return Array.from({ length: n }, (_, k) => b + (k < r ? 1 : 0));
}
/** Scale arbitrary non-negative numbers to integers totalling 100 (largest-remainder). */
export function normalize(ws) {
  const v = ws.map(w => Math.max(0, +w || 0)); const s = v.reduce((a, b) => a + b, 0);
  if (!v.length) return []; if (!s) return evenSplit(v.length);
  const raw = v.map(w => w / s * 100), fl = raw.map(Math.floor); let left = 100 - fl.reduce((a, b) => a + b, 0);
  raw.map((x, k) => [x - fl[k], k]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, k]) => { if (left > 0) { fl[k]++; left--; } });
  return fl;
}
/** Current split % as configured on the miner (for the editor). */
export function splitFromInfo(info, n) {
  n = n ?? (info?.pools?.length || 1); if (n <= 1) return [100];
  if (n === 2) { const b = Math.round(+(info?.stratum?.poolBalance ?? 50)); const c = Math.min(99, Math.max(1, isNaN(b) ? 50 : b)); return [c, 100 - c]; }
  return normalize((info?.pools || []).slice(0, n).map(p => p.weight ?? 25).concat(Array(Math.max(0, n - (info?.pools?.length || 0))).fill(25)));
}
/** Validation message or null. Multi: every pool 1..100 (2 pools: 1..99 like the stock slider), whole numbers, total 100. */
export function splitError(split, mode = MODE_MULTI) {
  if (mode !== MODE_MULTI) return null;
  if (!split.length) return 'Add at least one pool';
  if (split.some(x => !Number.isInteger(+x) || x === '' || x == null)) return 'Use whole percentages';
  const lo = 1, hi = split.length === 2 ? 99 : 100;
  if (split.length > 1 && split.some(x => +x < lo || +x > hi)) return `Each pool needs ${lo}-${hi}%` + (split.length === 2 ? ' (the firmware balance slider is 1-99%)' : '');
  const t = split.reduce((a, b) => a + +b, 0); if (t !== 100) return `Splits total ${t}% - they must total 100%`;
  return null;
}
/**
 * Fields to PATCH for the pool mode, exactly like the stock Nexus UI:
 * poolMode always; 2 pools -> poolBalance = pool 1 %; 3-4 pools -> weight = split % (relative weights total 100).
 * Failover keeps the current poolBalance and the pools' existing weights.
 */
export function splitPatch(mode, pools, split, currentBalance = 50) {
  const out = { poolMode: mode === MODE_MULTI ? 1 : 0, poolBalance: +currentBalance || 50 };
  const ps = pools.map(p => ({ ...p }));
  if (mode === MODE_MULTI) {
    if (ps.length === 2) out.poolBalance = +split[0];
    if (ps.length >= 3) ps.forEach((p, k) => p.weight = +split[k]);
    if (ps.length === 1) ps[0].weight = 100;
  }
  out.pools = ps; return out;
}
/** Live share of work per pool as the firmware reports it (stratum.pools[k].allocation), else the stock UI fallback math. */
export function liveAllocation(info, k) {
  const s = info?.stratum; if (!s) return 0; const p = s.pools?.[k];
  if (p?.allocation != null) return +p.allocation;
  const c = (s.pools || []).map(x => !!x.connected); if (!c.some(Boolean)) return 0;
  if (s.poolMode !== 1) return k === (s.usingFallback ? 1 : 0) ? 100 : 0;
  if (c.length === 2) return c[0] && c[1] ? (k === 0 ? +s.poolBalance : 100 - s.poolBalance) : c[k] ? 100 : 0;
  return c[k] ? 100 / c.filter(Boolean).length : 0;
}
/** Per-pool hashrate (MH/s): firmware value when present, else total x allocation (marked estimated). */
export function poolHash(info, k) {
  const v = info?.stratum?.pools?.[k]?.hashRate; if (v != null) return { mh: +v, est: false };
  return { mh: (+info?.hashRate || 0) * liveAllocation(info, k) / 100, est: true };
}
export const diffErrPools = info => (info?.stratum?.pools || []).map((p, k) => p?.poolDiffErr ? k : -1).filter(k => k >= 0);
export const POOL_COLORS = ['#4fe3ff', '#5b8cff', '#ffd66b', '#5cf2a6'];
