import { describe, it, expect } from 'vitest';
import { evenSplit, normalize, splitFromInfo, splitError, splitPatch, liveAllocation, poolHash, diffErrPools, MODE_MULTI, MODE_FAILOVER } from '../src/lib/split.js';
const P = (n, w = 25) => ({ url: `p${n}.example`, port: 3333, user: 'ltc1q.x', weight: w });
describe('multi-pool split', () => {
  it('even split totals 100', () => { expect(evenSplit(1)).toEqual([100]); expect(evenSplit(2)).toEqual([50, 50]); expect(evenSplit(3)).toEqual([34, 33, 33]); expect(evenSplit(4)).toEqual([25, 25, 25, 25]); expect(evenSplit(9).length).toBe(4); });
  it('normalizes weights to whole % totalling 100', () => { expect(normalize([40, 30, 20, 10])).toEqual([40, 30, 20, 10]); expect(normalize([1, 1, 1])).toEqual([34, 33, 33]); expect(normalize([25, 25, 25, 25])).toEqual([25, 25, 25, 25]); expect(normalize([0, 0])).toEqual([50, 50]); expect(normalize([2, 1, 1]).reduce((a, b) => a + b)).toBe(100); });
  it('reads split from firmware: 2 pools = poolBalance, 3-4 = weights', () => {
    expect(splitFromInfo({ pools: [P(1), P(2)], stratum: { poolBalance: 70 } })).toEqual([70, 30]);
    expect(splitFromInfo({ pools: [P(1, 40), P(2, 30), P(3, 20), P(4, 10)], stratum: { poolBalance: 50 } })).toEqual([40, 30, 20, 10]);
    expect(splitFromInfo({ pools: [P(1, 25), P(2, 25), P(3, 25)] })).toEqual([34, 33, 33]);
    expect(splitFromInfo({ pools: [P(1)] })).toEqual([100]);
    expect(splitFromInfo({ pools: [P(1), P(2)], stratum: { poolBalance: 100 } })).toEqual([99, 1]);
  });
  it('validates totals and ranges', () => {
    expect(splitError([50, 50])).toBeNull(); expect(splitError([40, 30, 20, 10])).toBeNull(); expect(splitError([100])).toBeNull();
    expect(splitError([60, 50])).toMatch(/110%/); expect(splitError([100, 0])).toMatch(/1-99/); expect(splitError([97, 1, 1, 0])).toMatch(/1-100/); expect(splitError([33.5, 66.5])).toMatch(/whole/);
    expect(splitError([60, 50], MODE_FAILOVER)).toBeNull();
  });
  it('saves like the stock UI: poolMode 1, 2 pools -> poolBalance, 3-4 -> weight', () => {
    const two = splitPatch(MODE_MULTI, [P(1), P(2)], [70, 30], 50); expect(two.poolMode).toBe(1); expect(two.poolBalance).toBe(70); expect(two.pools.map(p => p.weight)).toEqual([25, 25]);
    const four = splitPatch(MODE_MULTI, [P(1), P(2), P(3), P(4)], [40, 30, 20, 10], 63); expect(four.poolMode).toBe(1); expect(four.poolBalance).toBe(63); expect(four.pools.map(p => p.weight)).toEqual([40, 30, 20, 10]);
    const one = splitPatch(MODE_MULTI, [P(1)], [100], 50); expect(one.pools[0].weight).toBe(100);
    const fo = splitPatch(MODE_FAILOVER, [P(1, 40), P(2, 30)], [70, 30], 55); expect(fo).toMatchObject({ poolMode: 0, poolBalance: 55 }); expect(fo.pools.map(p => p.weight)).toEqual([40, 30]);
    const src = [P(1), P(2), P(3)]; splitPatch(MODE_MULTI, src, [50, 25, 25]); expect(src[0].weight).toBe(25);
  });
  it('live allocation: firmware value first, stock fallback math otherwise', () => {
    expect(liveAllocation({ stratum: { poolMode: 1, pools: [{ allocation: 40 }, { allocation: 60 }] } }, 1)).toBe(60);
    const two = { stratum: { poolMode: 1, poolBalance: 70, pools: [{ connected: true }, { connected: true }] } }; expect(liveAllocation(two, 0)).toBe(70); expect(liveAllocation(two, 1)).toBe(30);
    expect(liveAllocation({ stratum: { poolMode: 1, poolBalance: 70, pools: [{ connected: false }, { connected: true }] } }, 1)).toBe(100);
    expect(liveAllocation({ stratum: { poolMode: 0, usingFallback: true, pools: [{ connected: false }, { connected: true }] } }, 1)).toBe(100);
    expect(poolHash({ hashRate: 300, stratum: { poolMode: 1, pools: [{ allocation: 25 }] } }, 0)).toEqual({ mh: 75, est: true });
    expect(poolHash({ hashRate: 300, stratum: { pools: [{ hashRate: 80 }] } }, 0)).toEqual({ mh: 80, est: false });
  });
  it('lists poolDiffErr pools', () => { expect(diffErrPools({ stratum: { pools: [{}, { poolDiffErr: false }, { poolDiffErr: true }] } })).toEqual([2]); expect(diffErrPools(null)).toEqual([]); });
});
