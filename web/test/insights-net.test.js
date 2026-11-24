import { describe, it, expect } from 'vitest';
import { analyze } from '../src/lib/insights.js';
import { isIPv4, isMask, ethPayload, ethForm } from '../src/lib/net.js';
const asic = { defaultFrequency: 1300, defaultVoltage: 1300, absMaxFrequency: 1500, absMinVoltage: 1100, absMaxVoltage: 1400 };
const ok = { deviceModel: 'NexusL1', ASICModel: 'BM1491', frequency: 1300, coreVoltage: 1300, smallCoreCount: 141, asicCount: 6, hashRate: 326, sharesAccepted: 100, sharesRejected: 0, uptimeSeconds: 9999, temp: 56, overheat_temp: 90, vrTemp: 60, fanspeed: 50, fanrpm: 4000, lastpingrtt: 30, recentpingloss: 0,
  pools: [{ url: 'p.example', port: 3333 }], stratum: { pools: [{ connected: true }] } };
describe('insights', () => {
  it('healthy miner scores high', () => { const r = analyze(ok, asic, []); expect(r.score).toBeGreaterThanOrEqual(90); });
  it('flags loss, ping, stopped fan, brownout, jumpy hashrate', () => {
    const ring = Array.from({ length: 40 }, (_, k) => ({ mh: k % 2 ? 250 : 400 }));
    const r = analyze({ ...ok, recentpingloss: 12, lastpingrtt: 400, fanrpm: 0, lastResetReason: 'Brownout reset', uptimeSeconds: 3600 }, asic, ring);
    const t = r.items.map(i => i.title).join('|');
    expect(t).toMatch(/packet loss/); expect(t).toMatch(/ping/); expect(t).toMatch(/0 rpm/); expect(t).toMatch(/Brownout/); expect(t).toMatch(/jumpy/);
    expect(r.score).toBeLessThan(50);
  });
  it('offline', () => { expect(analyze(null).grade).toBe('offline'); });
});
describe('ethernet config', () => {
  it('validates addresses', () => { expect(isIPv4('192.168.1.5')).toBe(true); expect(isIPv4('256.1.1.1')).toBe(false); expect(isMask('255.255.255.0')).toBe(true); expect(isMask('255.0.255.0')).toBe(false); });
  it('builds the stock payload', () => {
    expect(ethPayload({ dhcp: true }).payload.ethUseDHCP).toBe(1);
    expect(ethPayload({ dhcp: false, ip: '192.168.1.50', mask: '255.255.255.0', gw: '192.168.1.1', dns: '' }).payload).toEqual({ ethUseDHCP: 0, ethStaticIP: '192.168.1.50', ethGateway: '192.168.1.1', ethSubnet: '255.255.255.0', ethDNS: '' });
    expect(ethPayload({ dhcp: false, ip: '192.168.1.50', mask: '255.255.255.0', gw: '10.0.0.1' }).error).toMatch(/same subnet/);
    expect(ethPayload({ dhcp: false, ip: 'x', mask: '255.255.255.0', gw: '10.0.0.1' }).error).toMatch(/Static IP/);
    expect(ethForm({ ethUseDHCP: 0, ethStaticIP: '1.2.3.4' })).toMatchObject({ dhcp: false, ip: '1.2.3.4' });
  });
});
