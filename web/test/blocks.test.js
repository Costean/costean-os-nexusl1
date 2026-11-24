import { describe, it, expect } from 'vitest';
import { toNum, expectSecs, probWithin, impliedNetHash, progressPct, observe, fmtOdds, seenKey } from '../src/lib/blocks.js';
const base = { foundBlocks: 0, totalFoundBlocks: 0, bestDiff: 1.6e7, networkDifficulty: 9.5e7, uptimeSeconds: 100, macAddr: 'AA:BB' };
describe('blocks', () => {
  it('parses stock diff strings', () => { expect(toNum(5)).toBe(5); expect(toNum('16.0M')).toBe(16e6); expect(toNum('1.2G')).toBe(1.2e9); expect(toNum(null)).toBe(0); expect(toNum('x')).toBe(0); });
  it('expected time uses 2^32 hashes per difficulty, MH/s input', () => { expect(expectSecs(1, 1)).toBeCloseTo(4294.967296, 6); expect(expectSecs(0, 1)).toBe(Infinity); expect(probWithin(1, 1, 4294.967296)).toBeCloseTo(1 - Math.exp(-1), 9); });
  it('implied network hashrate (LTC 150 s)', () => { expect(impliedNetHash(9.5e7)).toBeCloseTo(9.5e7 * 4294967296 / 150, 0); });
  it('log progress', () => { expect(progressPct(1e4, 1e8)).toBeCloseTo(50, 6); expect(progressPct(1e9, 1e8)).toBe(100); expect(progressPct(0, 1e8)).toBe(0); });
  it('first observation is a baseline, not an event', () => { const s = observe(null, { ...base, totalFoundBlocks: 2 }, 1000); expect(s.events.length).toBe(0); expect(s.baseTotal).toBe(2); });
  it('records an event when the all-time counter rises', () => {
    let s = observe(null, base, 1000); s = observe(s, base, 2000); expect(s.events.length).toBe(0);
    s = observe(s, { ...base, foundBlocks: 1, totalFoundBlocks: 1, bestDiff: '112M' }, 3000);
    expect(s.events).toEqual([{ t: 3000, total: 1, session: 1, delta: 1, bestDiff: 112e6, networkDifficulty: 9.5e7, uptime: 100 }]);
    s = observe(s, { ...base, foundBlocks: 1, totalFoundBlocks: 1 }, 4000); expect(s.events.length).toBe(1);
  });
  it('reboot (session back to 0) or stats reset is not an event', () => {
    let s = observe(null, { ...base, foundBlocks: 1, totalFoundBlocks: 1 }, 1); s = observe(s, { ...base, foundBlocks: 0, totalFoundBlocks: 1 }, 2); expect(s.events.length).toBe(0);
    s = observe(s, { ...base, foundBlocks: 0, totalFoundBlocks: 0 }, 3); expect(s.events.length).toBe(0); expect(s.lastTotal).toBe(0);
  });
  it('a jump while the browser was away is one event with delta', () => { let s = observe(null, base, 1); s = observe(s, { ...base, totalFoundBlocks: 3 }, 9); expect(s.events[0].delta).toBe(3); });
  it('odds format', () => { expect(fmtOdds(0.5)).toBe('50.00%'); expect(fmtOdds(0.001)).toBe('1 in 1,000'); expect(fmtOdds(0)).toBe('—'); });
  it('per-miner key', () => { expect(seenKey(base)).toBe('costean.blocks.AA:BB'); });
});
