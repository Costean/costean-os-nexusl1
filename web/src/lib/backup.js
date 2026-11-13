// Settings backup / restore for the stock nexus.v1.0.4.4 v1 API. Backup = selected /api/system/info fields (+ alert/influx
// toggles) to a JSON file. Restore PATCHes only writable keys through the normal confirm dialog. No passwords/tokens exist in it.
import { poolsPayload, redact } from './model.js';
export const WRITABLE = ['hostname', 'ssid', 'frequency', 'coreVoltage', 'jobInterval', 'stratumDifficulty', 'flipscreen', 'autoscreenoff', 'autofanspeed', 'manualFanSpeed', 'pidTargetTemp', 'overheat_temp', 'poolMode', 'poolBalance'];
export function makeBackup(i, extra = {}) {
  const s = Object.fromEntries(WRITABLE.filter(k => i?.[k] !== undefined).map(k => [k, i[k]]));
  s.poolMode = i?.stratum?.poolMode ?? 0; s.poolBalance = i?.stratum?.poolBalance ?? 50;
  s.pools = poolsPayload(i).filter(p => p.url).slice(0, 2).map(({ password, sourceIndex, ...p }) => p);
  s.fans = (i?.fans || []).map(f => ({ mode: f.mode, manualSpeed: f.manualSpeed, overheatTemp: f.overheatTemp, pid: f.pid }));
  return redact({ format: 'costean-nexusl1-settings', formatVersion: 1, created: new Date().toISOString(), deviceModel: i?.deviceModel, firmware: i?.version, settings: s, ...extra,
    note: 'Wi-Fi password, pool passwords, Discord webhook and InfluxDB token are not exposed by the firmware API and are not included.' });
}
const POOL_KEYS = ['url', 'port', 'user', 'enonceSubscribe', 'tls', 'protocol', 'sv2AuthorityPubkey', 'sv2ChannelType', 'weight'];
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o && o[k] !== undefined).map(k => [k, o[k]]));
export function toPatch(b) {
  if (!b || b.format !== 'costean-nexusl1-settings' || !b.settings) throw new Error('Not a Costean OS NexusL1 settings backup');
  if (b.deviceModel && b.deviceModel !== 'NexusL1') throw new Error(`Backup is from a ${b.deviceModel}, not a NexusL1`);
  const s = b.settings; const patch = pick(s, WRITABLE);
  if (Array.isArray(s.pools) && s.pools.length) patch.pools = s.pools.slice(0, 2).map((p, n) => ({ sourceIndex: -1, ...pick(p, POOL_KEYS), enonceSubscribe: !!p.enonceSubscribe, tls: !!p.tls }));
  if (Array.isArray(s.fans) && s.fans.length) patch.fans = s.fans.slice(0, 2);
  for (const k of ['flipscreen', 'autoscreenoff']) if (k in patch) patch[k] = patch[k] == 1 || patch[k] === true;
  return patch;
}
export function diff(i, patch) {
  const cur = { ...i, poolMode: i?.stratum?.poolMode, poolBalance: i?.stratum?.poolBalance, flipscreen: i?.flipscreen == 1, autoscreenoff: i?.autoscreenoff == 1 };
  return Object.keys(patch).filter(k => JSON.stringify(k === 'pools' ? poolsPayload(i).filter(p => p.url).map(p => pick(p, ['url', 'port', 'user'])) : cur[k]) !== JSON.stringify(k === 'pools' ? patch.pools.map(p => pick(p, ['url', 'port', 'user'])) : patch[k]));
}
export async function downloadBackup(i) {
  const { api } = await import('./api.js'); const { toast } = await import('./store.svelte.js');
  try {
    const [al, inf] = await Promise.all([api.alertInfo().catch(() => null), api.influxInfo().catch(() => null)]);
    const b = makeBackup(i, { alert: al, influx: inf ? { ...inf, influxToken: undefined } : null });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' }));
    a.download = `costean-nexusl1-${(i?.hostname || 'miner')}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); toast('Backup downloaded');
  } catch (e) { toast('Backup failed: ' + e.message, 'err'); }
}
