// Ethernet config for the stock firmware: POST /api/system/ethernet/config {ethUseDHCP, ethStaticIP, ethGateway, ethSubnet, ethDNS}
// (same body as the stock UI). Applies after a restart. Pure, unit tested.
export const isIPv4 = s => /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(String(s || '').trim());
const toInt = s => String(s).trim().split('.').reduce((a, o) => (a << 8 >>> 0) + +o, 0) >>> 0;
export function isMask(s) { if (!isIPv4(s)) return false; const n = toInt(s); return n !== 0 && ((~n >>> 0) & ((~n >>> 0) + 1)) === 0; }
export const sameSubnet = (a, b, m) => (toInt(a) & toInt(m)) >>> 0 === (toInt(b) & toInt(m)) >>> 0;
export const ethForm = st => ({ dhcp: (st?.ethUseDHCP ?? 1) == 1, ip: st?.ethStaticIP || '', gw: st?.ethGateway || '', mask: st?.ethSubnet || '255.255.255.0', dns: st?.ethDNS || '' });
/** -> {payload} or {error} */
export function ethPayload(f) {
  if (f.dhcp) return { payload: { ethUseDHCP: 1, ethStaticIP: f.ip || '', ethGateway: f.gw || '', ethSubnet: f.mask || '', ethDNS: f.dns || '' } };
  if (!isIPv4(f.ip)) return { error: 'Static IP is not a valid IPv4 address' };
  if (!isMask(f.mask)) return { error: 'Subnet mask is not valid (e.g. 255.255.255.0)' };
  if (!isIPv4(f.gw)) return { error: 'Gateway is not a valid IPv4 address' };
  if (!sameSubnet(f.ip, f.gw, f.mask)) return { error: 'Gateway is not in the same subnet as the static IP' };
  if (f.dns && !isIPv4(f.dns)) return { error: 'DNS is not a valid IPv4 address' };
  if (f.ip.trim() === f.gw.trim()) return { error: 'Static IP and gateway must differ' };
  return { payload: { ethUseDHCP: 0, ethStaticIP: f.ip.trim(), ethGateway: f.gw.trim(), ethSubnet: f.mask.trim(), ethDNS: (f.dns || '').trim() } };
}
