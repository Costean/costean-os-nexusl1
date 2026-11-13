<script>
  import { app, applySettings } from '../lib/store.svelte.js';
  import { fmtUptime, fmtBytes, rssiLabel, chipCount, fwCountMismatch } from '../lib/model.js';
  let i = $derived(app.info);
  let host = $state(null), ssid = $state(''), pass = $state('');
  $effect(() => { if (i && host == null) { host = i.hostname; ssid = i.ssid; } });
  function saveNet() { const p = {}; if (host !== i.hostname) p.hostname = host; if (ssid !== i.ssid) p.ssid = ssid; if (pass) p.wifiPass = pass; if (!Object.keys(p).length) return; applySettings(p, 'Save network settings (applies after restart)').then(ok => { if (ok) pass = ''; }); }
</script>
<h1>System & Network</h1><div class="mute">Wi-Fi, Ethernet, hostname and device details.</div>
{#if i}
<div class="grid g2">
  <div class="card c-cyan"><h2>Status</h2><table data-testid="net-status"><tbody>
    <tr><td class="mute">IP address</td><td class="mono">{i.hostip || '—'}</td></tr><tr><td class="mute">Hostname</td><td>{i.hostname || '—'}</td></tr>
    <tr><td class="mute">MAC</td><td class="mono">{i.macAddr || '—'}</td></tr><tr><td class="mute">Wi-Fi</td><td>{i.wifiStatus || '—'} · {i.ssid || ''}</td></tr>
    <tr><td class="mute">Wi-Fi signal</td><td>{i.wifiRSSI ?? '—'} dBm · {rssiLabel(i.wifiRSSI)}</td></tr>
    <tr><td class="mute">Ethernet</td><td data-testid="eth">{app.eth ? (app.eth.ethConnected ? 'connected ' + (app.eth.ethIPv4 || '') : app.eth.ethSupported ? 'supported, not connected' : 'not supported') : '—'}{app.eth?.activeNetworkMode ? ' · active: ' + app.eth.activeNetworkMode : ''}</td></tr></tbody></table></div>
  <div class="card fm"><h2>Wi-Fi & hostname</h2>
    <label class="f"><span>Hostname</span><input bind:value={host} /></label>
    <label class="f"><span>Wi-Fi SSID</span><input bind:value={ssid} /></label>
    <label class="f"><span>Wi-Fi password (leave blank to keep)</span><input type="password" bind:value={pass} autocomplete="new-password" /></label>
    <div class="row"><span class="mute small">Applies after restart.</span><span class="sp"></span><button class="pri" onclick={saveNet}>Review &amp; save</button></div></div>
  <div class="card c-blue"><h2>Device</h2><table><tbody>
    <tr><td class="mute">Model</td><td data-testid="sys-model">{i.deviceModel} · {chipCount(i)}× {i.ASICModel || 'BM1491'}{#if fwCountMismatch(i)} <span class="mute small">(firmware config reports asicCount {i.asicCount})</span>{/if}</td></tr>
    <tr><td class="mute">Firmware</td><td class="mono">{i.version}</td></tr><tr><td class="mute">Web UI</td><td class="mono">{app.www?.www || '—'}</td></tr>
    <tr><td class="mute">Running partition</td><td class="mono">{i.runningPartition || '—'}</td></tr>
    <tr><td class="mute">Uptime</td><td>{fmtUptime(i.uptimeSeconds)} · last reset: {i.lastResetReason || '—'}</td></tr>
    <tr><td class="mute">Free heap</td><td>{fmtBytes(i.freeHeap)} PSRAM · {fmtBytes(i.freeHeapInt)} internal</td></tr></tbody></table></div>
</div>
{:else}<div class="card mute">Connecting…</div>{/if}
<style>.fm{display:grid;gap:10px;align-content:start}</style>
