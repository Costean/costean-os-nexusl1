import { describe, it, expect } from 'vitest';
import { presets, checkBounds, matchProfile, profilePatch } from '../src/lib/profiles.js';
const asic = { defaultFrequency: 1300, defaultVoltage: 1300, absMaxFrequency: 1500, absMinVoltage: 1100, absMaxVoltage: 1400, ecoFrequency: 1100, ecoVoltage: 1200, frequencyOptions: [1000, 1100, 1200, 1300, 1350, 1400], voltageOptions: [1150, 1200, 1250, 1300, 1350, 1400] };
describe('profiles', () => {
  it('derives eco / stock / turbo from the firmware', () => {
    expect(presets(asic, {})).toEqual({ eco: { f: 1100, v: 1200 }, stock: { f: 1300, v: 1300 }, turbo: { f: 1350, v: 1350 } });
  });
  it('turbo respects the +50 caps, absolute limits and frequency options', () => {
    expect(presets({ ...asic, frequencyOptions: [1300, 1400] }, {}).turbo).toBe(null);                  // 1400 is +100
    expect(presets({ ...asic, absMaxVoltage: 1300 }, {}).turbo).toEqual({ f: 1350, v: 1300 });          // no voltage headroom
    expect(presets({ ...asic, voltageOptions: [] }, {}).turbo).toEqual({ f: 1350, v: 1325 });
    expect(presets({ ...asic, absMaxFrequency: 1300 }, {}).turbo).toBe(null);
  });
  it('eco is ignored if it is above stock', () => { expect(presets({ ...asic, ecoFrequency: 1400 }, {}).eco).toBe(null); });
  it('bounds', () => {
    expect(checkBounds(1300, 1300, asic, {})).toBe(null);
    expect(checkBounds(1550, 1300, asic, {})).toMatch(/above the firmware limit/);
    expect(checkBounds(1300, 1450, asic, {})).toMatch(/above the firmware limit/);
    expect(checkBounds(1300, 1050, asic, {})).toMatch(/below/);
    expect(checkBounds(1250, 1300, asic, {})).toMatch(/frequency options/);
    expect(checkBounds(1400, 1300, asic, {})).toMatch(/\+50/);
    expect(checkBounds(NaN, 1300, asic, {})).toMatch(/positive/);
  });
  it('infers the active profile', () => {
    expect(matchProfile({ frequency: 1100, coreVoltage: 1200 }, asic)).toBe('eco');
    expect(matchProfile({ frequency: 1350, coreVoltage: 1350 }, asic)).toBe('turbo');
    expect(matchProfile({ frequency: 1200, coreVoltage: 1250 }, asic)).toBe('custom');
    expect(matchProfile(null, asic)).toBe(null);
    expect(profilePatch('stock', asic, {})).toEqual({ frequency: 1300, coreVoltage: 1300 });
  });
});
