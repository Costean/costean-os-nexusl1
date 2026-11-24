<script>
  // Swarm: other miners on your LAN. The list is stored only in this browser (localStorage); nothing leaves your network.
  import { onMount } from 'svelte';
  import { app } from '../lib/store.svelte.js';
  import { fmtMH, boardTemp, chipCount } from '../lib/model.js';
  const KEY = 'costean.miners';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const normalize = h => { h = (h || '').trim().replace(/\/+$/, ''); if (!h) return ''; if (!/^https?:\/\//.test(h)) h = 'http://' + h; try { return new URL(h).origin; } catch { return ''; } };
  let miners = $state(load()), host = $state(''), live = $state({});
  // A peer counts as a miner only when /api/system/info looks like one (finite, non-negative hashRate).
  const isMiner = d => !!d && typeof d === 'object' && Number.isFinite(+d.hashRate) && +d.hashRate >= 0;
  function poll() {
    for (const m of miners) fetch(m.origin + '/api/system/info', { signal: AbortSignal.timeout(4000) }).then(r => r.json())
      .then(d => live[m.origin] = isMiner(d) ? { ok: true, mh: +d.hashRate, w: d.power, t: boardTemp(d), model: d.deviceModel, asic: d.ASICModel, n: chipCount(d), host: d.hostname } : { ok: false })
      .catch(() => live[m.origin] = { ok: false });
  }
  onMount(() => { poll(); const iv = setInterval(poll, 10000); return () => clearInterval(iv); });
  const save = () => localStorage.setItem(KEY, JSON.stringify(miners));
  function add() { const o = normalize(host); if (!o || miners.some(m => m.origin === o)) { host = ''; return; } miners = [...miners, { origin: o, name: o.replace(/^https?:\/\//, '') }]; save(); host = ''; poll(); }
  function rm(o) { miners = miners.filter(m => m.origin !== o); save(); }
  let me = $derived(app.info);
  let tot = $derived((me?.hashRate || 0) + miners.reduce((a, m) => a + (live[m.origin]?.ok && /BM1491|NexusL1/.test((live[m.origin].asic || '') + (live[m.origin].model || '')) ? live[m.origin].mh : 0), 0));
</script>
<h1>Swarm</h1><div class="mute">Watch every miner on your network from here. The list is stored only in this browser.</div>
<div class="card c-cyan">
  <table data-testid="swarm"><thead><tr><th>Miner</th><th>Status</th><th>Model</th><th>Hashrate</th><th>Power</th><th>ASIC temp</th><th></th></tr></thead><tbody>
    <tr><td><b>This miner</b> <span class="mute small mono">{me?.hostname || ''} {me?.hostip || ''}</span></td><td><span class="dot {app.online ? 'ok' : 'crit'}" style="display:inline-block"></span></td>
      <td>{me?.deviceModel || '—'} · {me ? chipCount(me) + '× ' + (me.ASICModel || 'BM1491') : ''}</td><td class="num">{fmtMH(me?.hashRate)}</td><td class="num">{me?.power?.toFixed(1) ?? '—'} W</td><td class="num">{boardTemp(me)?.toFixed(1) ?? '—'} °C</td><td></td></tr>
    {#each miners as m}{@const l = live[m.origin]}
    <tr><td><b>{l?.host || m.name}</b> <span class="mute small mono">{m.name}</span></td><td><span class="dot {l?.ok ? 'ok' : 'crit'}" style="display:inline-block"></span></td><td>{l?.model || '—'}{l?.asic ? ' · ' + l.asic : ''}</td>
      <td class="num">{l?.ok ? (/BM1491|NexusL1/.test((l.asic || '') + (l.model || '')) ? fmtMH(l.mh) : l.mh.toFixed(1) + ' GH/s') : '—'}</td><td class="num">{l?.w?.toFixed?.(1) ?? '—'} W</td><td class="num">{l?.t?.toFixed(1) ?? '—'} °C</td>
      <td class="row"><a href={m.origin} target="_blank" rel="noopener">Open ↗</a><button onclick={() => rm(m.origin)} aria-label="Remove">✕</button></td></tr>
    {/each}</tbody></table>
  <div class="row" style="margin-top:12px"><input style="max-width:320px" placeholder="Add miner IP, e.g. 192.0.2.21" bind:value={host} onkeydown={e => e.key === 'Enter' && add()} data-testid="swarm-add" /><button class="pri" onclick={add}>Add</button><span class="sp"></span><span class="mute small">Scrypt total: <b class="mono">{fmtMH(tot)}</b></span></div>
  <div class="mute small" style="margin-top:8px">Other miners are read with their own <span class="mono">/api/system/info</span> from this browser. Scrypt miners report MH/s, Bitcoin miners GH/s; only Scrypt miners count toward the total.</div>
</div>
