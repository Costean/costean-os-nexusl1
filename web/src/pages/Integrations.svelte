<script>
  // Discord alerts + InfluxDB export, on the stock nexus.v1.0.4.4 endpoints (/api/alert/*, /api/influx*). Writes only after confirm.
  import { app, runAction, toast, enableNotifications } from '../lib/store.svelte.js';
  import { ask } from '../lib/confirm.svelte.js';
  import { api } from '../lib/api.js';
  let al = $state(null), inf = $state(null), webhook = $state(''), token = $state(''), loaded = false;
  const b = v => v === 1 || v === true;
  $effect(() => { if (app.online && !loaded) { loaded = true;
    api.alertInfo().then(v => al = { watchdog: b(v?.alertDiscordWatchdogEnable), block: b(v?.alertDiscordBlockFoundEnable), best: b(v?.alertDiscordBestDiffEnable), screen: b(v?.showBlockFoundScreenEnable) }).catch(() => al = { err: true });
    api.influxInfo().then(v => inf = { url: v?.influxURL ?? '', port: v?.influxPort ?? 8086, bucket: v?.influxBucket ?? '', org: v?.influxOrg ?? '', prefix: v?.influxPrefix ?? '', enable: b(v?.influxEnable), restart: !!v?.restartRequired }).catch(() => inf = { err: true }); } });
  let hookErr = $derived(webhook && !/^https:\/\/discord\.com\/api\/webhooks\/.+$/.test(webhook) ? 'The firmware only accepts a Discord webhook: https://discord.com/api/webhooks/…' : null);
  let infErr = $derived(inf && !inf.err ? (!/^http:\/\/[^:]*$/.test(inf.url) && inf.enable ? 'URL must start with http:// and must not contain the port' : !(+inf.port >= 0 && +inf.port <= 65353) ? 'Port 0-65353' : null) : null);
  async function saveAlert() {
    const body = { alertDiscordWatchdogEnable: al.watchdog, alertDiscordBlockFoundEnable: al.block, alertDiscordBestDiffEnable: al.best, showBlockFoundScreenEnable: al.screen };
    if (webhook) body.alertDiscordWebhook = webhook;
    const r = await ask('Save alert settings', { detail: JSON.stringify({ ...body, alertDiscordWebhook: webhook ? '•••• (new webhook)' : undefined }, null, 2), otp: !!app.info?.otp });
    if (!r.ok) return;
    try { await api.updateAlert(body, r.totp); toast('Alert settings saved'); webhook = ''; } catch (e) { toast('Save failed: ' + e.message, 'err'); }
  }
  async function saveInflux() {
    const body = { influxURL: inf.url, influxPort: +inf.port, influxBucket: inf.bucket, influxOrg: inf.org, influxPrefix: inf.prefix, influxEnable: inf.enable };
    if (token) body.influxToken = token;
    const r = await ask('Save InfluxDB settings (restart needed)', { detail: JSON.stringify({ ...body, influxToken: token ? '•••• (new token)' : undefined }, null, 2), otp: !!app.info?.otp });
    if (!r.ok) return;
    try { await api.updateInflux(body, r.totp); toast('InfluxDB saved. Restart the miner to apply.'); token = ''; inf.restart = true; } catch (e) { toast('Save failed: ' + e.message, 'err'); }
  }
</script>
<h1>InfluxDB & Alerts</h1><div class="mute">Discord alerts and InfluxDB export are built into the stock NexusL1 firmware. Costean OS only shows and sets them.</div>
<div class="grid g2">
  {#if al && !al.err}<div class="card fm c-cyan" data-testid="alerts"><h2>Discord / webhook alerts (firmware)</h2>
    <label class="f"><span>Discord webhook URL (leave blank to keep the saved one)</span><input type="password" bind:value={webhook} placeholder="https://discord.com/api/webhooks/…" autocomplete="off" data-testid="webhook" /></label>
    {#if hookErr}<div class="crit small">{hookErr}</div>{/if}
    <label class="chk"><input type="checkbox" bind:checked={al.watchdog} /> Watchdog alerts (hashrate stall / reboot)</label>
    <label class="chk"><input type="checkbox" bind:checked={al.block} data-testid="al-block" /> Block found</label>
    <label class="chk"><input type="checkbox" bind:checked={al.best} /> New best difficulty</label>
    <label class="chk"><input type="checkbox" bind:checked={al.screen} /> Show the block-found screen on the LCD</label>
    <div class="row"><button onclick={() => runAction('Send test alert', t => api.testAlert(t))} data-testid="test-alert">Send test</button><span class="sp"></span><button class="pri" disabled={!!hookErr} onclick={saveAlert} data-testid="save-alert">Review &amp; save</button></div>
    <div class="mute small">The miner sends alerts itself, straight to Discord. The webhook is stored on the miner and never shown back here.</div></div>
  {:else if al?.err}<div class="card mute">Alert settings unavailable (/api/alert/info did not answer).</div>{/if}
  {#if inf && !inf.err}<div class="card fm c-blue" data-testid="influx"><h2>InfluxDB export</h2>
    {#if inf.restart}<div class="small warn">Restart the miner to apply saved InfluxDB settings.</div>{/if}
    <label class="chk"><input type="checkbox" bind:checked={inf.enable} /> Enabled</label>
    <div class="r2"><label class="f" style="flex:3"><span>URL</span><input bind:value={inf.url} placeholder="http://192.0.2.20" /></label><label class="f" style="flex:1"><span>Port</span><input type="number" bind:value={inf.port} /></label></div>
    <label class="f"><span>Token (leave blank to keep)</span><input type="password" bind:value={token} autocomplete="off" /></label>
    <div class="r2"><label class="f"><span>Org</span><input bind:value={inf.org} /></label><label class="f"><span>Bucket</span><input bind:value={inf.bucket} /></label><label class="f"><span>Prefix</span><input bind:value={inf.prefix} /></label></div>
    {#if infErr}<div class="crit small">{infErr}</div>{/if}
    <div class="row"><span class="sp"></span><button class="pri" disabled={!!infErr} onclick={saveInflux} data-testid="save-influx">Review &amp; save</button></div></div>
  {:else if inf?.err}<div class="card mute">InfluxDB settings unavailable (/api/influx/info did not answer).</div>{/if}
  <div class="card fm"><h2>Browser notifications</h2><p class="mute small">Local notifications from this browser tab for overheating, faults and the miner going offline. Nothing leaves your network.</p>
    <div class="row"><span class="pill"><span class="dot {app.notify ? 'ok' : ''}"></span>{app.notify ? 'On' : 'Off'}</span><button onclick={enableNotifications}>Enable</button></div></div>
</div>
<style>.fm{display:grid;gap:10px;align-content:start}.r2{display:flex;gap:10px;flex-wrap:wrap;align-items:end}.r2>*{flex:1;min-width:110px}</style>
