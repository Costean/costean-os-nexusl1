import { describe, it, expect } from 'vitest';
import { absTs, deviceHistory, addSample, prune, mergeDevice, summary, toCsv, BUCKET_MS } from '../src/lib/history.js';
describe('device history (stock format)', () => {
  it('decodes timestamps (s or ms) and units', () => {
    expect(absTs(1.7e9, 10)).toBe(1700000010000); expect(absTs(1.7e12, 500)).toBe(1700000000500);
    const p = deviceHistory({ timestampBase: 1.7e12, timestamps: [0, 30000, 60000], hashrate_1m: [32510, null, 32000], hashrate_10m: [32400, 1, 2], asicTemp: [5512, 0, 5500], vregTemp: [6100, 6100, 0] });
    expect(p.length).toBe(2); expect(p[0]).toMatchObject({ t: 1.7e12, mh: 325.1, mh10: 324, asic: 55.12, vr: 61 }); expect(p[1].vr).toBe(null);
    expect(deviceHistory(null)).toEqual([]);
  });
});
describe('browser history buckets', () => {
  it('averages into 15-minute buckets, skips missing fields', () => {
    const b = []; const t0 = 1.8e12 - (1.8e12 % BUCKET_MS);
    addSample(b, { t: t0 + 1000, mh: 300, asic: 50 }); addSample(b, { t: t0 + 2000, mh: 320, asic: null }); addSample(b, { t: t0 + BUCKET_MS, mh: 310 });
    expect(b.length).toBe(2); expect(b[0]).toMatchObject({ t: t0, mh: 310, mhn: 2, asic: 50, asicn: 1 });
  });
  it('prunes after 30 days and merges device samples once', () => {
    const now = 1.8e12; const b = [{ t: now - 31 * 86400e3, mh: 1 }, { t: now - 86400e3, mh: 2 }];
    expect(prune(b, now).length).toBe(1);
    const m = mergeDevice([], [{ t: now - 100, mh: 300 }, { t: now - 50, mh: 302 }], now - 60); expect(m.length).toBe(1); expect(m[0].mh).toBe(302);
  });
  it('summary + CSV', () => {
    const t = 1.8e12 - (1.8e12 % BUCKET_MS); const pts = [{ t, mh: 300, asic: 50 }, { t: t + BUCKET_MS, mh: 320, asic: 60 }];
    const s = summary(pts, t, t + 2 * BUCKET_MS); expect(s).toMatchObject({ mh: 310, asic: 55, asicMax: 60, coverage: 100, n: 2 });
    expect(toCsv(pts).split('\n')[1]).toMatch(/,300\.00,50\.0,,$/);
  });
});
