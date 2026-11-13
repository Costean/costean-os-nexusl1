// DEMO mock of the stock Nexus v1.0.4.4 v1 API (/api/system/info etc). Never talks to a real device.
// Serves dist/axe-os like the firmware does: requests for X are answered from X.gz with Content-Encoding: gzip.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const SERVED = { n: 0, index: 0 };
const PORT = +process.env.PORT || 8099, ROOT = path.resolve(process.env.DIST || 'dist/axe-os'); const SCEN = process.env.SCENARIO || 'normal';
export const writes = [];
const t0 = Date.now(); const rnd = (a, b) => a + Math.random() * (b - a);
// Block Found scenarios: 'block' = a block counted since boot; 'blocklive' = counters rise BLOCK_AT s after start (browser log demo).
const BLOCK_AT = +(process.env.BLOCK_AT || 12); const blockNow = () => SCEN === 'block' || (SCEN === 'blocklive' && Date.now() - t0 > BLOCK_AT * 1000);
let sb = 2.4e5; const sessBest = () => { if (Math.random() < 0.2) sb = Math.max(sb, 10 ** (5 + Math.random() * 2.1)); return sb; };
const S = { frequency: 1300, coreVoltage: 1300, hostname: 'nexus', ssid: 'DEMO-WIFI', overheat_temp: 90, autofanspeed: 2, manualFanSpeed: 100, pidTargetTemp: 60, flipscreen: 0, autoscreenoff: 0, jobInterval: 1200, stratumDifficulty: 5000,
  pools: [{ url: 'demo-ltc-pool.example', port: 3333, user: SCEN === 'factory' ? 'LfwNtTUZXEMY2jRjisQfxGzK72o46uaAib.nexusl1' : 'ltc1qDEMOdemoDEMOdemo.nexusl1', enonceSubscribe: 0, tls: 0, protocol: 0, sv2AuthorityPubkey: '', sv2ChannelType: 0, weight: 100 }],
  poolMode: 0, poolBalance: 50 };
// Multi-pool scenarios (stock firmware poolMode 1): multi4 = 4 pools by weight, multi2 = 2 pools by poolBalance, differr = multi4 with pool 3 poolDiffErr.
const demoPool = (n, w) => ({ url: `demo-pool-${n}.example`, port: 3333 + n, user: `ltc1qDEMOdemoDEMOdemo.nexusl1`, enonceSubscribe: 0, tls: 0, protocol: 0, sv2AuthorityPubkey: '', sv2ChannelType: 0, weight: w });
if (SCEN === 'multi4' || SCEN === 'differr') { S.poolMode = 1; S.pools = [demoPool(1, 40), demoPool(2, 30), demoPool(3, 20), demoPool(4, 10)]; }
if (SCEN === 'multi2') { S.poolMode = 1; S.poolBalance = 70; S.pools = [demoPool(1, 25), demoPool(2, 25)]; }
const DIFF_ERR = SCEN === 'differr' ? [2] : [];
/** What the firmware reports per pool: allocation follows poolMode/poolBalance/weights over connected pools (mirrors stratum_manager_dual_pool). */
function stratumPools(hr) {
  const ps = S.pools.filter(p => p.url); const n = ps.length || 1; const conn = ps.map(() => true);
  const alloc = S.poolMode !== 1 ? ps.map((_, k) => k === 0 ? 100 : 0) : n === 2 ? [S.poolBalance, 100 - S.poolBalance] : (() => { const t = ps.reduce((a, p) => a + (+p.weight || 0), 0) || 1; return ps.map(p => +((+p.weight || 0) / t * 100).toFixed(1)); })();
  const up = Math.floor((Date.now() - t0) / 2000);
  return ps.map((p, k) => ({ connected: conn[k], poolDiffErr: DIFF_ERR.includes(k), poolDifficulty: DIFF_ERR.includes(k) ? 512 : 65536, networkDifficulty: 9.5e7, allocation: alloc[k], hashRate: +(hr * alloc[k] / 100).toFixed(2),
    accepted: Math.round((4812 + up) * alloc[k] / 100), rejected: alloc[k] ? Math.max(0, Math.round(7 * alloc[k] / 100)) : 0, bestDiff: alloc[k] ? 4.1e6 * (1 + k * 0.3) : 0, pingRtt: 31.2 + k * 9.4, pingLoss: 0, active: true }));
}
function info() {
  const up = Math.floor((Date.now() - t0) / 1000) + 3600 * 20 + 360;
  // Real NexusL1 (BM1491) firmware: asicTemps has one entry per chip (board->getChipTemp(i)) but every entry is 0 (no per-chip
  // sensor readout); `temp` is the board's ASIC temperature (getChipTempMax). SCENARIO=chiptemps simulates a board that does report per-chip temps.
  const boardT = +(56.8 + rnd(-0.4, 0.4) + (SCEN === 'hot' ? 26 : 0)).toFixed(1);
  const temps = SCEN === 'chiptemps' ? [54.2, 55.1, 56.8, 55.6, 53.9, 57.4].map(t => +(t + rnd(-0.4, 0.4)).toFixed(1)) : [0, 0, 0, 0, 0, 0];
  const hr = +(326 + rnd(-6, 6)).toFixed(2);
  return { demo: true, power: +(85.4 + rnd(-0.6, 0.6)).toFixed(2), maxPower: 120, minPower: 20, voltage: 12040, maxVoltage: 13, minVoltage: 11, current: 7100, currentA: 7.1, minCurrentA: 0, maxCurrentA: 12,
    temp: SCEN === 'chiptemps' ? Math.max(...temps) : boardT, vrTemp: +(61.3 + rnd(-0.3, 0.3)).toFixed(1), vrTempInt: 0, hashRateTimestamp: Date.now(), hashRate: hr, hashRate_1m: hr, hashRate_10m: 325.1, hashRate_1h: 325.6, hashRate_1d: 324.9,
    coreVoltage: S.coreVoltage, defaultCoreVoltage: 1300, coreVoltageActual: 1341, fanspeed: 58, manualFanSpeed: S.manualFanSpeed, fanrpm: 2580, fanrpm2: 0, fanspeed2: 0, fanCount: 1,
    lastpingrtt: 31.2, recentpingloss: 0, shutdown: false, duplicateHWNonces: 0, poolDifficulty: 65536, networkDifficulty: 9.5e7, foundBlocks: blockNow() ? 1 : 0, totalFoundBlocks: blockNow() ? 1 : 0,
    sharesAccepted: 4812 + Math.floor((Date.now() - t0) / 2000), sharesRejected: 7, bestDiff: blockNow() ? 1.124e8 : 1.602e7, bestSessionDiff: blockNow() ? 1.124e8 : sessBest(),
    stratum: { poolMode: S.poolMode, activePoolMode: S.poolMode, usingFallback: false, totalBestDiff: blockNow() ? 1.124e8 : 1.602e7, poolBalance: S.poolBalance, pools: stratumPools(hr) },
    asicTemps: temps, pidTargetTemp: S.pidTargetTemp, pidP: 6, pidI: 0.1, pidD: 10,
    fans: [{ label: 'Fan 1', mode: S.autofanspeed, manualSpeed: S.manualFanSpeed, overheatTemp: S.overheat_temp, rpm: 2580, speedPerc: 58, pid: { targetTemp: S.pidTargetTemp, p: 6, i: 0.1, d: 10 } }],
    hostname: S.hostname, ssid: S.ssid, stratumURL: S.pools[0].url, stratumPort: S.pools[0].port, stratumUser: S.pools[0].user, stratumEnonceSubscribe: 0, stratumTLS: 0,
    fallbackStratumURL: '', fallbackStratumPort: 3333, fallbackStratumUser: '', fallbackStratumEnonceSubscribe: 0, fallbackStratumTLS: 0, stratumProtocol: 0, fallbackStratumProtocol: 0, sv2AuthorityPubkey: '', fallbackSv2AuthorityPubkey: '', sv2ChannelType: 0, fallbackSv2ChannelType: 0,
    maxPools: 4, pools: S.pools, frequency: S.frequency, defaultFrequency: 1300, jobInterval: S.jobInterval, stratumDifficulty: S.stratumDifficulty, overheat_temp: S.overheat_temp,
    flipscreen: S.flipscreen, invertscreen: 0, autoscreenoff: S.autoscreenoff, invertfanpolarity: 0, autofanspeed: S.autofanspeed, stratum_keep: 0, vrFrequency: 600000, defaultVrFrequency: 600000, otp: false,
    ASICModel: 'BM1491', deviceModel: 'NexusL1', asicCount: 6, smallCoreCount: 141, uptimeSeconds: up, lastResetReason: 'Power on', wifiStatus: 'Connected!', wifiRSSI: -58, macAddr: 'DE:MO:00:00:00:01', hostip: '192.0.2.50',
    freeHeap: 7.1e6, freeHeapInt: 61000, version: process.env.FW_VERSION || 'costean-nexusl1-1.0.4.4', runningPartition: 'ota_0', defaultTheme: 'dark' };
}
const asic = { ASICModel: 'BM1491', deviceModel: 'NexusL1', asicCount: 6, defaultFrequency: 1300, defaultVoltage: 1300, absMaxFrequency: 1500, absMinVoltage: 1100, absMaxVoltage: 1400, ecoFrequency: 1100, ecoVoltage: 1200, swarmColor: 'blue',
  frequencyOptions: [1000, 1100, 1200, 1300, 1350, 1400], voltageOptions: [1150, 1200, 1250, 1300, 1350, 1400] };
const ALERT = { alertDiscordWatchdogEnable: 1, alertDiscordBlockFoundEnable: 1, alertDiscordBestDiffEnable: 0, showBlockFoundScreenEnable: 1 };
const INFLUX = { influxURL: 'http://192.0.2.20', influxPort: 8086, influxBucket: 'miners', influxOrg: 'home', influxPrefix: 'nexusl1', influxEnable: 0, restartRequired: false };
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x'); const p = u.pathname;
  const json = (o, c = 200) => { r.writeHead(c, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(o)); };
  if (p === '/__writes') return json(writes);
  if (p.startsWith('/api/')) {
    if (q.method !== 'GET') { let b = ''; q.on('data', d => b += d); q.on('end', () => { writes.push({ method: q.method, path: p, body: b ? JSON.parse(b) : null }); if (p === '/api/alert/update' && b) { const o = JSON.parse(b); for (const k of Object.keys(ALERT)) if (k in o) ALERT[k] = o[k] ? 1 : 0; }
      if (p === '/api/influx' && b) { const o = JSON.parse(b); for (const k of Object.keys(INFLUX)) if (k in o) INFLUX[k] = o[k]; INFLUX.restartRequired = true; }
      if (p === '/api/system' && b) { const o = JSON.parse(b); for (const k of ['frequency', 'coreVoltage', 'hostname', 'ssid', 'overheat_temp', 'autofanspeed', 'manualFanSpeed', 'pidTargetTemp', 'jobInterval', 'stratumDifficulty', 'poolMode', 'poolBalance']) if (k in o) S[k] = o[k]; if (o.pools) S.pools = o.pools.map(({ password, ...x }) => ({ ...x, enonceSubscribe: +x.enonceSubscribe, tls: +x.tls })); } r.writeHead(200); r.end(''); }); return; }
    if (p === '/api/system/info') return json(info());
    if (p === '/api/system/asic') return json(asic);
    if (p === '/api/alert/info') return json(ALERT);
    if (p === '/api/influx/info') return json(INFLUX);
    if (p === '/api/otp/status') return json({ enabled: false });
    if (p === '/api/system/ethernet/status') return json({ ethSupported: true, ethLinkUp: false, ethConnected: false, ethIPv4: '', activeNetworkMode: 'wifi' });
    if (p === '/api/system/OTA/github') return json({ pending: false, running: false, step: '', progress: 0 });
    return json({ error: 'not found' }, 404);
  }
  // Test hook: pretend the miner holds a different www.bin (checks the UI's one-time reload after a web-UI update).
  if (p === '/version.json' && process.env.SERVED_WWW_VERSION) { SERVED.n++; r.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return r.end(JSON.stringify({ www: process.env.SERVED_WWW_VERSION })); }
  if (p === '/__served') return json(SERVED);
  const rel = p === '/' ? '/index.html' : p; const f = path.join(ROOT, rel + '.gz');
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end('Not found'); }
  if (rel === '/index.html') SERVED.index++; r.writeHead(200, { 'Content-Type': TYPES[path.extname(rel)] || 'text/plain', 'Content-Encoding': 'gzip', 'Cache-Control': rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' }); r.end(fs.readFileSync(f));
}).listen(PORT, () => console.log('DEMO mock on', PORT, SCEN));
