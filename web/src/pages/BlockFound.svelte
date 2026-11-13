<script>
  // Block Found: rebuilt on the fields the stock nexus.v1.0.4.4 API really exposes.
  import { onMount } from 'svelte';
  import { app, ring, clearBlockLog } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import { ask } from '../lib/confirm.svelte.js';
  import { fmtDiff, fmtMH, fmtUptime } from '../lib/model.js';
  import { toNum, expectSecs, probWithin, fmtDur, fmtOdds, progressPct, impliedNetHash, fmtHash } from '../lib/blocks.js';
  let alert = $state(null), alertErr = $state(false);
  onMount(() => { api.alertInfo().then(v => alert = v).catch(() => alertErr = true); });
  let i = $derived(app.info);
  let nd = $derived(+i?.networkDifficulty || 0);
  let best = $derived(toNum(i?.bestDiff)), sbest = $derived(toNum(i?.bestSessionDiff));
  let session = $derived(+i?.foundBlocks || 0), total = $derived(+i?.totalFoundBlocks || 0);
  let found = $derived(session > 0);
  let pct = $derived(progressPct(best, nd));
  let mh = $derived(+i?.hashRate_10m || +i?.hashRate || 0);
  let log = $derived(app.blocks?.state);
  let events = $derived((log?.events || []).slice().reverse());
  // difficulty observatory: samples recorded by this browser (ring, 5 s)
  let rec = $derived((app.tick, ring.a.slice(-240).filter(x => x.bsd || x.pd)));
  let peak = $derived(Math.max(0, ...rec.map(x => x.bsd || 0)));
  const W = 900, H = 240, L = 64, R = 14, T = 16, B = 22;
  let lo = $derived(Math.max(1, Math.min(...rec.map(x => x.pd || x.bsd || 1)) / 3));
  let hi = $derived(Math.max(nd || 1, peak, best) * 2.5);
  const yy = v => T + (1 - (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / ((Math.log10(hi) - Math.log10(lo)) || 1)) * (H - T - B);
  const xx = k => L + (rec.length > 1 ? k / (rec.length - 1) : 1) * (W - L - R);
  const path = key => rec.map((x, k) => x[key] ? `${k ? 'L' : 'M'}${xx(k).toFixed(1)},${yy(x[key]).toFixed(1)}` : '').join('');
  let ticks = $derived(Array.from({ length: Math.max(0, Math.ceil(Math.log10(hi)) - Math.floor(Math.log10(lo)) + 1) }, (_, k) => 10 ** (Math.floor(Math.log10(lo)) + k)).filter(v => v >= lo && v <= hi).filter((_, k, a) => a.length < 8 || k % 2 === 0));
  const when = t => new Date(t).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const onoff = v => v == null ? '—' : (v === 1 || v === true) ? 'ON' : 'OFF';
  async function clear() { const r = await ask('Clear this browser\'s block log?', { detail: 'Only deletes the list stored in this browser (localStorage). Nothing is sent to the miner and its counters are not touched.' }); if (r.ok) clearBlockLog(); }
</script>
{#if i}
<section class="card c-gold hero" class:lit={found} data-testid="block-card">
  <div class="badge" class:lit={found}>{found ? '★' : 'Ł'}</div>
  <div class="mid">
    <div class="eyebrow">{found ? 'Firmware block counter' : 'Every hash is a new chance'}</div>
    <div class="ht" data-testid="block-state">{found ? 'BLOCK FOUND' : 'HUNTING FOR A BLOCK'}</div>
    <div class="mute">{#if found}The firmware counted {session} share{session > 1 ? 's' : ''} this boot that met the Litecoin network target. Confirm it on your pool or a block explorer — this counter is not a payout confirmation.{:else}Solo lottery: a block is found when one share reaches the Litecoin network difficulty.{/if}</div>
    <div class="row cmp">
      <div><span class="eyebrow">Best share (all time)</span><b class="num eblue">{fmtDiff(best)}</b></div>
      <div class="vs">vs</div>
      <div><span class="eyebrow">Network difficulty</span><b class="num blue">{nd ? fmtDiff(nd) : '—'}</b></div>
    </div>
    <div class="track"><i style:width="{pct}%"></i><span class="tgt"></span></div>
    <div class="row small mute"><span>{pct.toFixed(1)}% of the way (log scale)</span><span class="sp"></span><span>NETWORK TARGET</span></div>
  </div>
  <div class="facts">
    <div><span class="eyebrow">Chain checked</span><b>Litecoin · Scrypt</b></div>
    <div><span class="eyebrow">Blocks this boot</span><b class="num gold" data-testid="found-session">{session}</b></div>
    <div><span class="eyebrow">Blocks all time</span><b class="num gold" data-testid="found-total">{total}</b></div>
    <div><span class="eyebrow">Pool share difficulty</span><b class="num">{i.poolDifficulty ? fmtDiff(i.poolDifficulty) : '—'}</b></div>
  </div>
</section>
<section class="grid g3">
  <div class="card stat c-cyan"><div class="lbl">Expected time to block</div><div class="v">{fmtDur(expectSecs(nd, mh))}</div><div class="mute small">at {fmtMH(mh)} (10 min avg)</div></div>
  <div class="card stat c-ice"><div class="lbl">Chance today</div><div class="v">{fmtOdds(probWithin(nd, mh, 86400))}</div><div class="mute small">next 24 h</div></div>
  <div class="card stat c-ok"><div class="lbl">Chance this year</div><div class="v">{fmtOdds(probWithin(nd, mh, 31557600))}</div><div class="mute small">next 365 days</div></div>
</section>
<div class="mute small note">Estimates assume <span class="mono">networkDifficulty</span> is in standard Litecoin difficulty units (1 = 2<sup>32</sup> hashes). Cross-check: it implies a Litecoin network of ≈ <b class="mono" data-testid="implied-net">{fmtHash(impliedNetHash(nd))}</b> at 2.5 min blocks — compare with a Litecoin explorer.</div>
<section class="card c-blue" data-testid="merged">
  <h2>LTC + DOGE merged mining</h2>
  <div class="small">The firmware's block check and its <span class="mono">foundBlocks</span> / <span class="mono">totalFoundBlocks</span> counters use the Litecoin target from the pool job (nBits). The stock API has <b>no per-chain or Dogecoin field</b>, so Dogecoin (aux-chain) blocks found through merged mining are not counted here — your pool credits those; check its dashboard for DOGE blocks and payouts.</div>
</section>
<section class="card c-ice" data-testid="observatory">
  <h2>Difficulty observatory</h2>
  <div class="mute small">Session best share and pool share target against the network target (log scale). Samples every 5 s, recorded by this browser while the UI is open.</div>
  <div class="grid g3 mini">
    <div class="card stat c-cyan"><div class="lbl">Session best</div><div class="v">{fmtDiff(sbest)}</div></div>
    <div class="card stat"><div class="lbl">Observed peak</div><div class="v eblue">{fmtDiff(peak || sbest)}</div></div>
    <div class="card stat c-blue"><div class="lbl">Network difficulty</div><div class="v blue">{nd ? fmtDiff(nd) : '—'}</div></div>
  </div>
  {#if rec.length > 1}
  <svg viewBox="0 0 {W} {H}" class="obs" role="img" aria-label="difficulty chart">
    {#each ticks as v}<line x1={L} x2={W - R} y1={yy(v)} y2={yy(v)} class="gl"/><text x={L - 8} y={yy(v) + 4} text-anchor="end" class="ax">{fmtDiff(v)}</text>{/each}
    {#if nd}<line x1={L} x2={W - R} y1={yy(nd)} y2={yy(nd)} class="net"/><text x={L + 6} y={yy(nd) - 6} class="nt">NETWORK TARGET {fmtDiff(nd)}</text>{/if}
    {#if peak}<line x1={L} x2={W - R} y1={yy(peak)} y2={yy(peak)} class="pk"/>{/if}
    <path d={path('pd')} class="pd"/><path d={path('bsd')} class="bs"/>
  </svg>
  <div class="legend small"><span><i class="lw"></i>Session best</span><span><i class="lc"></i>Pool share target</span><span><i class="lg"></i>Network target</span><span><i class="lb"></i>Observed peak</span></div>
  {:else}<div class="mute empty">Collecting samples… (one every 5 s)</div>{/if}
</section>
<section class="grid g2">
  <div class="card c-gold" data-testid="seen-log">
    <div class="row"><h2>Blocks seen by this browser</h2><span class="sp"></span><button onclick={clear} data-testid="clear-log">Clear browser log</button></div>
    {#if events.length}
    <table><thead><tr><th>First seen here</th><th>Blocks</th><th>All-time count</th><th>Best share then</th><th>Network diff then</th></tr></thead>
      <tbody>{#each events as e}<tr><td>{when(e.t)}</td><td class="num gold">+{e.delta}</td><td class="num">{e.total}</td><td class="num">{fmtDiff(e.bestDiff)}</td><td class="num">{e.networkDifficulty ? fmtDiff(e.networkDifficulty) : '—'}</td></tr>{/each}</tbody></table>
    {:else}<div class="mute empty sm" data-testid="no-blocks">No blocks yet — none seen by this browser since {log?.since ? when(log.since) : 'now'}.{#if log?.baseTotal > 0} The miner already had {log.baseTotal} all-time block{log.baseTotal > 1 ? 's' : ''} before this browser started watching.{/if}</div>{/if}
    <div class="mute small note">The stock firmware keeps <b>counters only</b> — no block list, times, heights or hashes. This list is built in this browser (localStorage) by noticing when <span class="mono">totalFoundBlocks</span> goes up, so the time is when this browser first saw it, not when the block was found. Other browsers/devices keep their own list.</div>
  </div>
  <div class="card c-cyan" data-testid="reactions">
    <h2>Firmware block-found reactions</h2>
    {#if alert}
      <div class="row kv"><span>Discord "Block found!" alert</span><span class="sp"></span><b class={onoff(alert.alertDiscordBlockFoundEnable) === 'ON' ? 'ok' : 'mute'}>{onoff(alert.alertDiscordBlockFoundEnable)}</b></div>
      <div class="row kv"><span>Discord best-difficulty alert</span><span class="sp"></span><b class={onoff(alert.alertDiscordBestDiffEnable) === 'ON' ? 'ok' : 'mute'}>{onoff(alert.alertDiscordBestDiffEnable)}</b></div>
      <div class="row kv"><span>LCD block-found screen</span><span class="sp"></span><b class={onoff(alert.showBlockFoundScreenEnable) === 'ON' ? 'ok' : 'mute'}>{onoff(alert.showBlockFoundScreenEnable)}</b></div>
    {:else}<div class="mute small">{alertErr ? 'Alert settings unavailable (/api/alert/info did not answer).' : 'Loading…'}</div>{/if}
    <div class="mute small note">Read-only, from the stock <span class="mono">/api/alert/info</span>. The Discord webhook is never shown here. Uptime this boot: {fmtUptime(i.uptimeSeconds)} — the "this boot" counter resets on restart; the all-time counter is kept in the miner's settings.</div>
  </div>
</section>
{:else}<div class="card mute">Connecting to miner…</div>{/if}
<style>
.hero{display:grid;grid-template-columns:110px 1fr 260px;gap:22px;align-items:center;padding:22px;background:radial-gradient(600px 240px at 20% 0%,#1f5fd033,transparent),linear-gradient(180deg,#151d4c,#0e1538)}
.hero.lit{border-color:var(--gold);box-shadow:0 0 40px -14px var(--gold)}
.badge{width:96px;height:96px;border-radius:50%;display:grid;place-items:center;font:800 40px var(--ui);color:#fff;background:radial-gradient(circle at 35% 30%,#7e8cff,#2a2f8f);border:2px solid #8b9bff;box-shadow:0 0 30px -4px #6b7bff}
.badge.lit{background:radial-gradient(circle at 35% 30%,#ffe9a0,#c98a12);border-color:var(--gold);box-shadow:0 0 40px -2px var(--gold);color:#3a2500}
.mid{display:grid;gap:8px;min-width:0}.ht{font:900 34px var(--ui);letter-spacing:.02em;text-shadow:0 0 18px #8b9bff88}.lit .ht{color:var(--gold);text-shadow:0 0 18px #ffd66b88}
.cmp{gap:18px}.cmp>div{display:grid}.cmp b{font-size:30px}.vs{color:var(--mute);font-weight:700}
.eblue{color:var(--eblue)}.blue{color:var(--acc2)}.gold{color:var(--gold)}
.track{position:relative;height:10px;background:#0a0f2a;border:1px solid var(--line2);border-radius:6px}.track i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--eblue),var(--ice),var(--acc))}.tgt{position:absolute;right:-1px;top:-5px;width:3px;height:18px;background:var(--gold);box-shadow:0 0 8px var(--gold)}
.facts{display:grid;gap:10px;border-left:1px solid var(--line);padding-left:18px}.facts>div{display:grid}.facts b{font-size:16px}
.note{margin-top:8px}.mini{margin:12px 0}.obs{width:100%;height:auto;display:block}.gl{stroke:#27316a}.ax{fill:var(--mute);font-size:11px;font-family:var(--mono)}
.net{stroke:#ffd66b;stroke-dasharray:6 5;stroke-width:1.6}.nt{fill:#ffd66b;font:700 11px var(--ui);letter-spacing:.12em}.pk{stroke:#2f7bff;stroke-dasharray:2 4}
.bs{fill:none;stroke:#fff;stroke-width:2;filter:drop-shadow(0 0 4px #8cd6ff)}.pd{fill:none;stroke:#4fe3ff;stroke-width:1.5;opacity:.8}
.legend{display:flex;gap:14px;flex-wrap:wrap;color:var(--mute);margin-top:6px}.legend i{display:inline-block;width:12px;height:3px;margin-right:6px;vertical-align:middle;border-radius:2px}
.lw{background:#fff}.lc{background:#4fe3ff}.lg{background:#ffd66b}.lb{background:#2f7bff}
.empty{padding:40px;text-align:center}.empty.sm{padding:22px 10px}.kv{padding:6px 0;border-bottom:1px solid var(--line)}
table{font-size:13px}
@media (max-width:1100px){.hero{grid-template-columns:1fr}.facts{border:0;padding:0;grid-template-columns:1fr 1fr}}
@media (max-width:600px){.ht{font-size:26px}.cmp b{font-size:22px}table{display:block;overflow-x:auto;white-space:nowrap}}
</style>
