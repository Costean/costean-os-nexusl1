import { describe, it, expect } from 'vitest';
import { parse, NAV } from '../src/lib/commands.js';
import { makeBackup, toPatch, diff } from '../src/lib/backup.js';
import { fanPatch, chipCount } from '../src/lib/model.js';
const info = { deviceModel: 'NexusL1', ASICModel: 'BM1491', asicCount: 6, hostname: 'nexus', ssid: 'W', frequency: 1300, coreVoltage: 1300, defaultFrequency: 1300, defaultCoreVoltage: 1300,
  autofanspeed: 2, manualFanSpeed: 100, pidTargetTemp: 60, overheat_temp: 90, flipscreen: 0, autoscreenoff: 0, jobInterval: 1200, stratumDifficulty: 5000, version: 'nexus.v1.0.4.4',
  fans: [{ mode: 2, manualSpeed: 100, overheatTemp: 90, pid: { targetTemp: 60, p: 6, i: 0.1, d: 10 } }], stratum: { poolMode: 0, poolBalance: 50 },
  pools: [{ url: 'a.example', port: 3333, user: 'ltc1q.w', enonceSubscribe: 0, tls: 0, protocol: 0, sv2AuthorityPubkey: '', sv2ChannelType: 0, weight: 100 }, { url: 'b.example', port: 3334, user: 'ltc1q.w', enonceSubscribe: 0, tls: 0, protocol: 0, sv2AuthorityPubkey: '', sv2ChannelType: 0, weight: 0 }, { url: 'c.example', port: 1, user: 'x', weight: 0 }] };
const asic = { defaultFrequency: 1300, defaultVoltage: 1300, absMaxFrequency: 1500, absMinVoltage: 1100, absMaxVoltage: 1400, ecoFrequency: 1100, ecoVoltage: 1200 };
describe('command palette (NexusL1)', () => {
  it('has the NerdOctAxe page set', () => expect(NAV.map(n => n[0])).toEqual(['dashboard', 'mining', 'pools', 'thermal', 'block', 'swarm', 'influx', 'network', 'diagnostics', 'update']));
  it('stock preset is the firmware 1300/1300', () => expect(parse('stock', info, asic).patch).toEqual({ frequency: 1300, coreVoltage: 1300 }));
  it('safe = stock (no 700/1150 on the L1)', () => expect(parse('safe', info, asic).patch).toEqual({ frequency: 1300, coreVoltage: 1300 }));
  it('above stock is flagged, out of limits blocked', () => { expect(parse('frequency 1400', info, asic).aboveStock).toBe(true); expect(parse('voltage 1500', info, asic).blocked).toMatch(/limit/); });
  it('fans 80% -> manual fan patch with legacy + fans[]', () => { const p = parse('fans 80%', info, asic).patch; expect(p.autofanspeed).toBe(0); expect(p.manualFanSpeed).toBe(80); expect(p.fans[0]).toMatchObject({ mode: 0, manualSpeed: 80, overheatTemp: 90 }); });
  it('nav fallback', () => expect(parse('alerts', info, asic)).toBeTruthy());
});
describe('fanPatch', () => {
  it('keeps PID gains', () => expect(fanPatch(info, { target: 65 }).fans[0].pid).toEqual({ targetTemp: 65, p: 6, i: 0.1, d: 10 }));
});
describe('backup / restore', () => {
  const b = makeBackup(info, { alert: { alertDiscordBlockFoundEnable: 1 } });
  it('only 2 pools, no passwords', () => { expect(b.settings.pools.length).toBe(2); expect(b.settings.pools.some(p => 'password' in p)).toBe(false); expect(b.format).toBe('costean-nexusl1-settings'); });
  it('round-trips to a patch with no changes', () => { const p = toPatch(b); expect(p.frequency).toBe(1300); expect(p.flipscreen).toBe(false); expect(diff(info, p).filter(k => !['fans', 'pools'].includes(k))).toEqual([]); });
  it('detects a changed value', () => { const c = JSON.parse(JSON.stringify(b)); c.settings.frequency = 1200; expect(diff(info, toPatch(c))).toContain('frequency'); });
  it('rejects other devices / formats', () => { expect(() => toPatch({ format: 'costean-settings', settings: {} })).toThrow(); expect(() => toPatch({ ...b, deviceModel: 'NerdOCTAXE-Gamma' })).toThrow(/NexusL1/); });
});
describe('chip count', () => it('4 on the NexusL1 even though firmware says 6', () => expect(chipCount(info)).toBe(4)));
