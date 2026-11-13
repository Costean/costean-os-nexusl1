import { describe, it, expect } from 'vitest';
import { chipTemps, boardTemp, realTemp, health } from '../src/lib/model.js';
// Real NexusL1 firmware: asicTemps = one 0 per chip (no per-chip sensor), temp = board ASIC temp.
const real = { asicCount: 6, asicTemps: [0, 0, 0, 0, 0, 0], temp: 56.8, vrTemp: 61.3, overheat_temp: 90 };
describe('chip temps (stock hasChipTemps / maxAsicTemp logic)', () => {
  it('all-zero asicTemps = no per-chip data', () => { expect(chipTemps(real)).toBeNull(); expect(chipTemps({})).toBeNull(); expect(chipTemps({ asicTemps: [] })).toBeNull(); });
  it('board temp falls back to temp', () => { expect(boardTemp(real)).toBe(56.8); expect(boardTemp({ ...real, temp: 0 })).toBeNull(); });
  it('real per-chip values are used, zeros become null', () => { expect(chipTemps({ asicTemps: [50, 0, 52] })).toEqual([50, null, 52]); expect(boardTemp({ asicTemps: [50, 0, 52], temp: 40 })).toBe(52); });
  it('realTemp hides 0/NaN', () => { expect(realTemp(0)).toBeNull(); expect(realTemp('x')).toBeNull(); expect(realTemp(61.3)).toBe(61.3); });
  it('health uses board temp, no false alarm when temp missing', () => { expect(health({ ...real, temp: 88 }, null).some(c => c.level === 'crit')).toBe(true); expect(health({ ...real, temp: 0 }, null).some(c => /overheat|warm/i.test(c.title))).toBe(false); });
});
import { chipCount, fwCountMismatch, expectedMH } from '../src/lib/model.js';
describe('chip count', () => {
  it('L1 board temp = firmware temp (asicTemps all 0 ignored)', () => { expect(boardTemp({ deviceModel: 'NexusL1', asicTemps: [0, 0, 0, 0, 0, 0], temp: 55 })).toBe(55); });
  const l1 = { deviceModel: 'NexusL1', ASICModel: 'BM1491', asicCount: 6, asicTemps: [0, 0, 0, 0, 0, 0], frequency: 1300, smallCoreCount: 141, temp: 55, hashRate: 330 };
  it('NexusL1 shows 4 chips even though firmware asicCount is 6', () => { expect(chipCount(l1)).toBe(4); expect(fwCountMismatch(l1)).toBe(true); });
  it('stock expected hashrate formula unchanged (~330 MH/s rated)', () => { expect(expectedMH(l1)).toBeCloseTo(330.07, 1); });
  it('other models use asicCount', () => { expect(chipCount({ deviceModel: 'NexusS1', ASICModel: 'BM1370', asicCount: 2 })).toBe(2); expect(fwCountMismatch({ deviceModel: 'NexusS1', ASICModel: 'BM1370', asicCount: 2 })).toBe(false); });
});
