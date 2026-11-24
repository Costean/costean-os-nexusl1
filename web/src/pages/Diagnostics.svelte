<script>
  import { onDestroy } from 'svelte';
  import { app } from '../lib/store.svelte.js';
  import { logSocket } from '../lib/api.js';
  import { health, redact } from '../lib/model.js';
  let lines = $state([]), state = $state('closed'), ws = null, filter = $state('');
  function connect() { ws?.close(); ws = logSocket(l => { lines.push(l); if (lines.length > 600) lines.splice(0, lines.length - 600); }, s => state = s); }
  onDestroy(() => ws?.close());
  let shown = $derived(filter ? lines.filter(l => l.toLowerCase().includes(filter.toLowerCase())) : lines);
  let checks = $derived(health(app.info, app.asic));
  const cls = l => /^E \(|error|fail/i.test(l) ? 'crit' : /^W \(/.test(l) ? 'warn' : '';
</script>
<h1>Diagnostics & Logs</h1>
<section class="card c-gold" data-testid="diag-health"><h2>Health checks</h2>
  {#each checks as c}<div class="row hc"><span class="dot {c.level}"></span><b class={c.level}>{c.title}</b><span class="mute small">{c.why}</span></div>{/each}
</section>
<section class="card c-cyan"><div class="row"><h2>Live firmware log</h2><span class="sp"></span><span class="pill small"><span class="dot {state === 'open' ? 'ok' : 'warn'}"></span>{state}</span>
  <input class="flt" placeholder="filter" bind:value={filter} /><button onclick={connect}>{state === 'open' ? 'Reconnect' : 'Connect'}</button><button onclick={() => lines = []}>Clear</button></div>
  <pre class="log mono" data-testid="log">{#each shown as l}<span class={cls(l)}>{l}</span>{'\n'}{/each}{#if !shown.length}<span class="mute">Press Connect to stream the miner's log over /api/ws.</span>{/if}</pre>
</section>
<section class="card c-blue"><h2>Raw /api/system/info (passwords redacted)</h2>
  <pre class="raw mono">{app.info ? JSON.stringify(redact({ ...app.info, history: undefined }), null, 2) : '—'}</pre>
</section>
<style>.hc{padding:4px 0}.flt{width:180px}.log,.raw{background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:10px;max-height:420px;overflow:auto;font-size:12px;white-space:pre-wrap;margin:8px 0 0}</style>
