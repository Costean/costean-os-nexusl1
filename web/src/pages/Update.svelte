<script>
  import { app, toast } from '../lib/store.svelte.js';
  import { api, upload } from '../lib/api.js';
  import { ask } from '../lib/confirm.svelte.js';
  import { inspectImage } from '../lib/image.js';
  import { applySettings, runAction } from '../lib/store.svelte.js';
  import { downloadBackup, toPatch, diff } from '../lib/backup.js';
  let otp = $state(null);
  $effect(() => { if (app.online && otp === null) api.otpStatus().then(v => otp = v || { enabled: false }).catch(() => otp = { enabled: false, err: true }); });
  async function restore(ev) {
    const f = ev.currentTarget.files[0]; ev.currentTarget.value = ''; if (!f) return;
    try { const patch = toPatch(JSON.parse(await f.text())); const rows = diff(app.info, patch);
      if (!rows.length) return toast('Backup matches the current settings');
      await applySettings(patch, `Restore ${rows.length} setting(s) from ${f.name}`, { summary: 'Changes: ' + rows.join(', ') });
    } catch (e) { toast('Restore failed: ' + e.message, 'err'); }
  }
  async function otpToggle() {
    if (!otp.enabled) { const r = await ask('Start OTP enrollment', { detail: 'A QR code appears on the miner screen. Scan it with your authenticator app, then enter the code to enable OTP.' }); if (!r.ok) return; try { await api.otpEnroll(); } catch (e) { return toast(e.message, 'err'); } }
    const r = await ask(otp.enabled ? 'Disable OTP' : 'Enable OTP', { otp: true, danger: otp.enabled }); if (!r.ok) return;
    try { await api.otpSet(!otp.enabled, r.totp); otp = await api.otpStatus(); toast('OTP ' + (otp.enabled ? 'enabled' : 'disabled')); } catch (e) { toast(e.message, 'err'); }
  }
  const STOCK_URL = 'https://github.com/BitLuckFW/ESP-Miner-Nexus/releases/download/v1.0.4.4/esp-miner-factory-NexusL1-v1.0.4.4.bin';
  let fw = $state(null), www = $state(null), fwInfo = $state(null), wwwInfo = $state(null), prog = $state(0), busy = $state(''), ghs = $state(null);
  async function pick(kind, e) { const f = e.target.files?.[0]; if (!f) return; const r = await inspectImage(f, kind); if (kind === 'firmware') { fw = f; fwInfo = r; } else { www = f; wwwInfo = r; } }
  async function send(kind) {
    const f = kind === 'www' ? www : fw, inf = kind === 'www' ? wwwInfo : fwInfo; if (!f || !inf?.ok) return;
    const r = await ask(kind === 'www' ? 'Upload web UI (www.bin)' : 'Upload firmware (esp-miner.bin)', { detail: `${f.name}\n${f.size} bytes${inf.version ? '\nversion ' + inf.version : ''}${inf.warn ? '\n⚠ ' + inf.warn : ''}`, danger: !!inf.warn, otp: !!app.info?.otp });
    if (!r.ok) return; busy = kind; prog = 0;
    try { await upload(kind, f, p => prog = p, r.totp); toast(kind === 'www' ? 'Web UI updated — reload the page' : 'Firmware updated — miner is rebooting'); }
    catch (e) { toast('Upload failed: ' + e.message, 'err'); } finally { busy = ''; }
  }
  async function stockRestore() {
    const r = await ask('Reinstall stock BitLuck firmware v1.0.4.4 from GitHub', { detail: `The miner downloads\n${STOCK_URL}\nand installs the stock firmware + stock web UI (removes Costean OS). Settings are kept.`, danger: true, otp: !!app.info?.otp });
    if (!r.ok) return;
    try { await api.githubOta(STOCK_URL, true, r.totp); busy = 'github'; const t = setInterval(async () => { try { ghs = await api.githubOtaStatus(); if (!ghs?.running && !ghs?.pending) { clearInterval(t); busy = ''; } } catch { } }, 2000); }
    catch (e) { toast('Stock restore failed: ' + e.message, 'err'); }
  }
</script>
<h1>Update & Recovery</h1>
<section class="grid g2">
  <div class="card c-cyan" data-testid="fw-card"><h2>Firmware (OTA)</h2>
    <div class="small">Running <b class="mono">{app.info?.version || '—'}</b> on partition <span class="mono">{app.info?.runningPartition || '—'}</span>. Upload Costean OS <span class="mono">esp-miner-NexusL1.bin</span> (or BitLuck's stock file of the same name). Settings are kept. Install the firmware first, then <span class="mono">www.bin</span>.</div>
    <input type="file" accept=".bin" onchange={e => pick('firmware', e)} />
    {#if fwInfo}<div class="small {fwInfo.ok ? (fwInfo.warn ? 'warn' : 'ok') : 'crit'}">{fwInfo.ok ? `ESP32 app image · version ${fwInfo.version || '?'}${fwInfo.warn ? ' · ⚠ ' + fwInfo.warn : ''}` : fwInfo.why}</div>{/if}
    <div class="row"><span class="sp"></span><button class="pri" disabled={!fwInfo?.ok || !!busy} onclick={() => send('firmware')}>{busy === 'firmware' ? `Uploading ${(prog * 100).toFixed(0)}%` : 'Review & upload'}</button></div>
  </div>
  <div class="card c-blue"><h2>Web UI (www.bin)</h2>
    <div class="small">Current web UI <b class="mono">{app.www?.www || '—'}</b>. Upload a <span class="mono">www.bin</span> SPIFFS image (Costean or stock).</div>
    <input type="file" accept=".bin" onchange={e => pick('www', e)} />
    {#if wwwInfo}<div class="small {wwwInfo.ok ? 'ok' : 'crit'}">{wwwInfo.ok ? 'SPIFFS web image · ' + www.size + ' bytes' : wwwInfo.why}</div>{/if}
    <div class="row"><span class="sp"></span><button class="pri" disabled={!wwwInfo?.ok || !!busy} onclick={() => send('www')}>{busy === 'www' ? `Uploading ${(prog * 100).toFixed(0)}%` : 'Review & upload'}</button></div>
  </div>
</section>
<section class="card c-gold" data-testid="recovery"><h2>Recovery</h2>
  <ul class="small">
    <li><b>Web UI broken?</b> Open <a href="/recovery">/recovery</a> — the firmware's built-in page accepts a www.bin upload even without this UI.</li>
    <li><b>Back to stock over the network:</b> reinstall BitLuck's official v1.0.4.4 (firmware + web UI) straight from GitHub.</li>
    <li><b>Fully bricked?</b> USB-flash the stock factory image <span class="mono">esp-miner-factory-NexusL1-v1.0.4.4.bin</span> at offset 0x0 (wipes Wi-Fi/pool settings).</li>
  </ul>
  <div class="row"><span class="sp"></span>{#if ghs}<span class="mono small">{ghs.step} {ghs.progress ?? ''}%</span>{/if}<button class="danger" disabled={!!busy} onclick={stockRestore}>Reinstall stock firmware from GitHub</button></div>
</section>

<section class="grid g2">
  <div class="card fm c-blue" data-testid="backup"><h2>Backup & restore</h2><p class="mute small">Saves tuning, fan, display, pool (no passwords) and alert toggles to a JSON file in this browser. Restore shows every change for confirmation before anything is sent.</p>
    <div class="row"><button class="pri" onclick={() => downloadBackup(app.info)}>Download backup</button><label class="btn">Restore…<input hidden type="file" accept=".json,application/json" onchange={restore} /></label></div></div>
  <div class="card fm c-ice"><h2>Power & maintenance</h2><div class="row">
    <button onclick={() => runAction('Restart miner', t => api.restart(t))}>Restart</button>
    <button onclick={() => runAction('Reset statistics', t => api.resetStats(t))}>Reset stats</button>
    <span class="sp"></span><button class="danger" onclick={() => runAction('Shut down ASICs', t => api.shutdown(t), { danger: true })}>Shut down ASICs</button></div></div>
  <div class="card fm" data-testid="otp"><h2>Security · OTP</h2><p class="mute small">Time-based one-time codes protect every write (settings, updates, restart). Codes are entered in the confirm dialog.</p>
    <div class="row"><span class="pill"><span class="dot {otp?.enabled ? 'ok' : ''}"></span>OTP {otp?.enabled ? 'enabled' : 'disabled'}</span><span class="sp"></span><button onclick={otpToggle} disabled={!otp || otp.err}>{otp?.enabled ? 'Disable' : 'Enable'}</button></div></div>
  <div class="card"><h2>About</h2><p class="small mute">Costean OS web UI {app.www?.www || ''} for the NexusL1. Runs on the stock BitLuck nexus.v1.0.4.4 firmware: mining, ASIC, power, fan and protection code are unchanged. Runs entirely on the miner and in your browser, no cloud.</p></div>
</section>
<style>.fm{display:grid;gap:10px;align-content:start}</style>
