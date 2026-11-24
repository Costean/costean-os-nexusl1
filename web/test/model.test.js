import { describe, it, expect } from 'vitest';
import { expectedMH, fmtMH, poolsPayload, withPools, isAboveStock, outOfLimits, modeOf, validatePool, health, efficiency, redact } from '../src/lib/model.js';
const asic = { defaultFrequency: 1300, defaultVoltage: 1300, absMaxFrequency: 1500, absMinVoltage: 1100, absMaxVoltage: 1400, ecoFrequency: 1100, ecoVoltage: 1200 };
const info = { deviceModel: 'NexusL1', ASICModel: 'BM1491', frequency: 1300, coreVoltage: 1300, smallCoreCount: 141, asicCount: 6, hashRate: 326, sharesAccepted: 100, sharesRejected: 1, uptimeSeconds: 9999, temp: 56, overheat_temp: 90, vrTemp: 60,
  pools: [{ url: 'p.example', port: 3333, user: 'ltc1q.x', enonceSubscribe: 0, tls: 1, protocol: 0, sv2AuthorityPubkey: '', sv2ChannelType: 0, weight: 100 }], stratum: { poolMode: 0, poolBalance: 50, pools: [{ connected: true }] } };
describe('model', () => {
  it('uses the stock LTC core-math formula (MH/s)', () => { expect(expectedMH(info)).toBeCloseTo(1300 * 141 * 6 / 3332, 6); });
  it('formats MH/s and GH/s', () => { expect(fmtMH(325.44)).toBe('325.4 MH/s'); expect(fmtMH(1530)).toBe('1.53 GH/s'); });
  it('efficiency in mJ/MH', () => { expect(efficiency(85, 325)).toBeCloseTo(261.5, 1); });
  it('pool payload mirrors stock UI (booleans, sourceIndex, no password unless changed)', () => {
    const p = poolsPayload(info)[0]; expect(p).toMatchObject({ sourceIndex: 0, url: 'p.example', port: 3333, enonceSubscribe: false, tls: true, weight: 100 }); expect('password' in p).toBe(false);
    expect(poolsPayload(info, [{ ...info.pools[0], password: '*****' }])[0].password).toBeUndefined();
    expect(poolsPayload(info, [{ ...info.pools[0], password: 'DOGE=Dabc' }])[0].password).toBe('DOGE=Dabc');
  });
  it('every PATCH keeps the pool block', () => { const w = withPools(info, { frequency: 1200 }); expect(w.pools.length).toBe(1); expect(w.poolMode).toBe(0); expect(w.frequency).toBe(1200); });
  it('above-stock / limits', () => { expect(isAboveStock(1350, 1300, asic, info)).toBe(true); expect(isAboveStock(1300, 1300, asic, info)).toBe(false); expect(outOfLimits(1600, 1300, asic)).toMatch(/limit/); expect(outOfLimits(1300, 1000, asic)).toMatch(/below/); });
  it('mode line uses ASCII |', () => { expect(modeOf(info, asic).text).toBe('STOCK | 1300 MHz | 1300 mV'); expect(modeOf({ ...info, frequency: 1100, coreVoltage: 1200 }, asic).label).toBe('ECO'); });
  it('validates pools', () => { expect(validatePool({ url: 'stratum+tcp://x', port: 1, user: 'u' })).toMatch(/host only/); expect(validatePool({ url: 'x.org', port: 3333, user: 'u' })).toBeNull(); });
  it('health flags heat', () => { expect(health({ ...info, temp: 88 }, asic)[0].level).toBe('crit'); expect(health(info, asic)[0].level).toBe('ok'); });
  it('health warns on poolDiffErr', () => { expect(health({ ...info, stratum: { poolMode: 1, pools: [{ connected: true }, { connected: true, poolDiffErr: true }] } }, asic).some(c => /Pool 2 difficulty/.test(c.title))).toBe(true); });
  it('redacts secrets', () => { expect(redact({ wifiPass: 'x', pools: [{ password: 'y' }] })).toEqual({ wifiPass: '••••••', pools: [{ password: '••••••' }] }); });
});
