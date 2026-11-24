<script>
  import { app, applySettings, runAction } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import { ethForm, ethPayload } from '../lib/net.js';
  import { fmtUptime, fmtBytes, rssiLabel, chipCount, fwCountMismatch } from '../lib/model.js';
  let i = $derived(app.info);
  let host = $state(null), ssid = $state(''), pass = $state('');
  $effect(() => { if (i && host == null) { host = i.hostname; ssid = i.ssid; } });
  function saveNet() { const p = {}; if (host !== i.hostname) p.hostname = host; if (ssid !== i.ssid) p.ssid = ssid; if (pass) p.wifiPass = pass; if (!Object.keys(p).length) return; applySettings(p, 'Save network settings (applies after restart)').then(ok => { if (ok) pass = ''; }); }
  let ef = $state(null);
  $effect(() => { if (app.eth && !ef) ef = ethForm(app.eth); });
  let ep = $derived(ef ? ethPayload(ef) : null);
  let edirty = $derived(ef && app.eth && JSON.stringify(ef) !== JSON.stringify(ethForm(app.eth)));
  async function saveEth() {
    if (!ep?.payload) return;
    const ok = await runAction('Save Ethernet settings', async totp => { await api.ethConfig(ep.payload, totp); app.eth = { ...app.eth, ...ep.payload }; },
      { detail: (ef.dhcp ? 'Ethernet: DHCP (automatic address).' : `Ethernet: static ${ep.payload.ethStaticIP} / ${ep.payload.ethSubnet}, gateway ${ep.payload.ethGateway}${ep.payload.ethDNS ? ', DNS ' + ep.payload.ethDNS : ''}.`) + '\nApplies after a restart. A wrong static address can make the miner unreachable over Ethernet; Wi-Fi keeps working.' });
    if (ok) ef = null;
  }
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
  <div class="card c-ice fm" data-testid="eth-config"><h2>Ethernet</h2>
    {#if !app.eth}<div class="mute small">Reading Ethernet status…</div>
    {:else if !app.eth.ethSupported}<div class="mute small">This board reports no Ethernet port.</div>
    {:else if ef}
      <div class="seg"><button class:on={ef.dhcp} onclick={() => ef.dhcp = true} data-testid="eth-dhcp">DHCP (automatic)</button><button class:on={!ef.dhcp} onclick={() => ef.dhcp = false} data-testid="eth-static">Static IP</button></div>
      {#if !ef.dhcp}<div class="grid e2">
        <label class="f"><span>IP address</span><input class="mono" bind:value={ef.ip} placeholder="192.168.1.50" data-testid="eth-ip" /></label>
        <label class="f"><span>Subnet mask</span><input class="mono" bind:value={ef.mask} placeholder="255.255.255.0" /></label>
        <label class="f"><span>Gateway</span><input class="mono" bind:value={ef.gw} placeholder="192.168.1.1" data-testid="eth-gw" /></label>
        <label class="f"><span>DNS (optional)</span><input class="mono" bind:value={ef.dns} placeholder="1.1.1.1" /></label></div>{/if}
      <div class="row">{#if ep?.error}<span class="crit small" data-testid="eth-err">{ep.error}</span>{:else}<span class="mute small">Applies after restart. Wi-Fi stays as it is.</span>{/if}<span class="sp"></span>
        <button class="pri" disabled={!edirty || !!ep?.error} onclick={saveEth} data-testid="eth-save">Review &amp; save</button></div>
    {/if}</div>
  <div class="card c-blue"><h2>Device</h2><table><tbody>
    <tr><td class="mute">Model</td><td data-testid="sys-model">{i.deviceModel} · {chipCount(i)}× {i.ASICModel || 'BM1491'}{#if fwCountMismatch(i)} <span class="mute small">(firmware config reports asicCount {i.asicCount})</span>{/if}</td></tr>
    <tr><td class="mute">Firmware</td><td class="mono">{i.version}</td></tr><tr><td class="mute">Web UI</td><td class="mono">{app.www?.www || '—'}</td></tr>
    <tr><td class="mute">Running partition</td><td class="mono">{i.runningPartition || '—'}</td></tr>
    <tr><td class="mute">Uptime</td><td>{fmtUptime(i.uptimeSeconds)} · last reset: {i.lastResetReason || '—'}</td></tr>
    <tr><td class="mute">Free heap</td><td>{fmtBytes(i.freeHeap)} PSRAM · {fmtBytes(i.freeHeapInt)} internal</td></tr></tbody></table></div>
</div>
{:else}<div class="card mute">Connecting…</div>{/if}
<style>.fm{display:grid;gap:10px;align-content:start}.e2{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.seg{justify-self:start}</style>
