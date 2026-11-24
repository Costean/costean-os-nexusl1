<script>
  // Two sources: the miner's own last 3 h (kept in its memory, lost on reboot) and 15-minute averages this browser
  // has collected while a Costean OS tab was open (30 days, per miner, in localStorage).
  import { onMount } from 'svelte';
  import { app, loadDeviceHistory, clearBrowserHistory, runAction } from '../lib/store.svelte.js';
  import Chart from '../components/Chart.svelte';
  import { summary, toCsv, BUCKET_MS, KEEP_DAYS } from '../lib/history.js';
  import { fmtMH } from '../lib/model.js';
  import { download } from '../lib/download.js';
  const RANGES = [['3h', 'Last 3 h (miner)', 3 * 3600e3], ['24h', '24 h', 86400e3], ['7d', '7 days', 7 * 86400e3], ['30d', '30 days', 30 * 86400e3]];
  let range = $state('3h'), busy = $state(false), err = $state('');
  async function refresh() { busy = true; err = ''; try { await loadDeviceHistory(); } catch (e) { err = 'Could not read the miner history: ' + e.message; } busy = false; }
  onMount(() => { if (!app.histDeviceAt || Date.now() - app.histDeviceAt > 60e3) refresh(); });
  let span = $derived(RANGES.find(r => r[0] === range)[2]);
  let to = $derived((app.tick, Date.now())), from = $derived(to - span);
  let pts = $derived(range === '3h' ? app.histDevice.filter(p => p.t >= from) : (app.tick, app.hist.filter(p => p.t >= from)));
  let s = $derived(summary(pts, range === '3h' && pts.length ? pts[0].t : from, to));
  let gap = $derived(range === '3h' ? 5 * 60e3 : BUCKET_MS * 2.5);
  const P = (k, f = v => v) => pts.map(p => ({ t: p.t, v: p[k] == null ? null : f(p[k]) }));
  let oldest = $derived(app.hist.length ? new Date(app.hist[0].t) : null);
  function csv() { download(`costean-history-${app.info?.hostname || 'nexus'}-${range}.csv`, toCsv(pts), 'text/csv'); }
</script>
<h1>History</h1><div class="mute">Hashrate and temperatures over time.</div>
<div class="row">
  <div class="seg" data-testid="hist-range">{#each RANGES as [id, l]}<button class:on={range === id} onclick={() => range = id}>{l}</button>{/each}</div>
  <span class="sp"></span>
  <button onclick={refresh} disabled={busy}>{busy ? 'Reading…' : 'Reload from miner'}</button><button onclick={csv} disabled={!pts.length} data-testid="hist-csv">Export CSV</button>
</div>
{#if err}<div class="card warn small">{err}</div>{/if}
<section class="grid g4" data-testid="hist-summary">
  <div class="card c-cyan"><div class="eyebrow">Average hashrate</div><div class="big">{fmtMH(s.mh)}</div><div class="mute small">{s.n} {range === '3h' ? 'samples' : '15-min points'}</div></div>
  <div class="card c-gold"><div class="eyebrow">ASIC temp</div><div class="big">{s.asic?.toFixed(1) ?? '—'}<small> °C avg</small></div><div class="mute small">max {s.asicMax?.toFixed(1) ?? '—'} °C</div></div>
  <div class="card c-ice"><div class="eyebrow">VR temp</div><div class="big">{s.vr?.toFixed(1) ?? '—'}<small> °C avg</small></div><div class="mute small">max {s.vrMax?.toFixed(1) ?? '—'} °C</div></div>
  <div class="card c-blue"><div class="eyebrow">Coverage</div><div class="big">{s.n ? s.coverage.toFixed(0) : 0}<small> %</small></div><div class="mute small">{range === '3h' ? 'of the miner\'s window' : 'of the range this browser saw'}{s.w != null ? ` · ${s.w.toFixed(1)} W avg` : ''}</div></div>
</section>
<section class="card c-cyan"><h2>Hashrate</h2>
  <Chart unit="MH/s" {gap} series={range === '3h' ? [{ name: '1 min', color: 'var(--acc)', points: P('mh') }, { name: '10 min', color: 'var(--acc2)', points: P('mh10') }, { name: '1 h', color: 'var(--gold)', points: P('mh1h') }] : [{ name: '15-min average', color: 'var(--acc)', points: P('mh') }]} /></section>
<section class="card c-gold"><h2>Temperatures</h2>
  <Chart unit="°C" {gap} series={[{ name: 'ASIC', color: 'var(--acc)', points: P('asic') }, { name: 'VR', color: 'var(--acc2)', points: P('vr') }]} /></section>
<section class="card c-blue small mute" data-testid="hist-about">
  <b>Where this comes from.</b> "Last 3 h" is read from the miner (it keeps about 3 hours in memory and starts over after a restart).
  The longer ranges are 15-minute averages this browser recorded while a Costean OS page was open, plus whatever the miner still had when you opened History; gaps mean no tab was open.
  Kept for {KEEP_DAYS} days in this browser only{oldest ? `, oldest point ${oldest.toLocaleString()}` : ''}.
  <button class="lnk" onclick={() => runAction('Clear browser history', async () => clearBrowserHistory(), { danger: true, detail: 'Deletes the 15-minute history stored in this browser for this miner. The miner is not touched.' })}>Clear browser history</button>
</section>
<style>.big small{font:600 13px var(--ui);color:var(--mute)}.lnk{background:none;border:0;padding:0;color:var(--acc);cursor:pointer;font-size:12px;margin-left:6px}</style>
