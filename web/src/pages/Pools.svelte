<script>
  // Two pools, like Costean OS for the NerdOctAxe: Primary + Fallback (failover) or a dual-pool split (stock poolBalance).
  import { app, applySettings } from '../lib/store.svelte.js';
  import { poolsPayload, validatePool, fmtDiff, fmtMH, chipCount } from '../lib/model.js';
  import { MODE_FAILOVER, MODE_MULTI, splitPatch, liveAllocation, poolHash, diffErrPools } from '../lib/split.js';
  const POOLS = 2;
  let i = $derived(app.info);
  let pools = $state(null), mode = $state(0), bal = $state(50), show = $state([false, false]), extra = $state(0);
  const blank = () => ({ sourceIndex: -1, url: '', port: 3333, user: '', password: '', enonceSubscribe: false, tls: false, protocol: 0, sv2AuthorityPubkey: '', sv2ChannelType: 0, weight: 50 });
  $effect(() => { if (i && pools == null) {
    const all = poolsPayload(i).map(p => ({ ...p, password: '*****' })); const used = all.filter(p => p.url);
    extra = Math.max(0, used.length - POOLS); pools = all.slice(0, POOLS); while (pools.length < POOLS) pools.push(blank());
    mode = i.stratum?.poolMode === 1 ? MODE_MULTI : MODE_FAILOVER; const b = Math.round(+(i.stratum?.poolBalance ?? 50)); bal = Math.min(99, Math.max(1, isNaN(b) ? 50 : b)); } });
  let hasFallback = $derived(!!(pools?.[1]?.url || pools?.[1]?.user));
  let errs = $derived((pools || []).map((p, k) => (k === 0 || hasFallback || mode === MODE_MULTI) ? validatePool(p) : null));
  let live = $derived(i?.stratum?.pools || []);
  let dErr = $derived(diffErrPools(i).filter(k => k < POOLS));
  const label = k => mode === MODE_MULTI ? `Pool ${k + 1}` : k === 0 ? 'Primary pool' : 'Fallback pool';
  function summary() {
    if (mode === MODE_FAILOVER) return `Mode: Failover (Primary/Fallback)\nPrimary: ${pools[0].url}:${pools[0].port}\nFallback: ${hasFallback ? pools[1].url + ':' + pools[1].port : 'none'}`;
    return `Mode: Dual pool split\nPool 1: ${bal}%  ${pools[0].url}:${pools[0].port}\nPool 2: ${100 - bal}%  ${pools[1].url}:${pools[1].port}\nJobs for all ${chipCount(i)} chips are shared over time in these proportions.`;
  }
  function save() {
    const use = mode === MODE_MULTI || hasFallback ? pools : pools.slice(0, 1);
    const ps = poolsPayload(i, use);
    const patch = splitPatch(mode, ps, [bal, 100 - bal], i?.stratum?.poolBalance);
    if (mode === MODE_MULTI) patch.poolBalance = +bal;
    applySettings(patch, 'Save pool settings', { summary: summary() + (extra ? `\n\nPools 3-${POOLS + extra} that are configured on the miner now will be removed.` : '') });
  }
</script>
<h1>Pools & Stratum</h1><div class="mute">Primary + fallback pool (Scrypt, Stratum V1). Nothing is sent until you review and confirm.</div>
{#if i && pools}
<div class="card row" data-testid="pool-mode">
  <label class="f"><span>Pool mode</span><select bind:value={mode} data-testid="mode-select"><option value={MODE_FAILOVER}>Failover (fallback is a backup)</option><option value={MODE_MULTI}>Dual pool (split hashrate)</option></select></label>
  {#if mode === MODE_MULTI}<label class="f" style="flex:1"><span>Balance: <b data-testid="bal">{bal}% pool 1 / {100 - bal}% pool 2</b></span><input type="range" min="1" max="99" bind:value={bal} data-testid="bal-range" /></label>{/if}
  <span class="sp"></span>
  <span class="pill" data-testid="live-mode"><span class="dot {i.stratum?.usingFallback ? 'warn' : 'ok'}"></span>{i.stratum?.usingFallback ? 'Using fallback' : i.stratum?.poolMode === 1 ? 'Dual pool active' : 'Primary active'}</span>
</div>
{#if (i.stratum?.poolMode === 1) !== (mode === MODE_MULTI)}<div class="small warn">Not saved yet: the miner is still in {i.stratum?.poolMode === 1 ? 'dual pool' : 'failover'} mode.</div>{/if}
{#if extra}<div class="card warnbox small" data-testid="extra-pools">This miner has {POOLS + extra} pools saved (from an earlier multi-pool setup). Costean OS uses 2 pools; saving here keeps Pool 1 and Pool 2 and removes the others.</div>{/if}
{#if dErr.length}<div class="card warnbox small" data-testid="diff-err">⚠ <b>Pool difficulty too low for dual-pool mode on {dErr.map(k => 'Pool ' + (k + 1)).join(', ')}.</b> The firmware reports <span class="mono">poolDiffErr</span>: use a pool port or setting with a higher starting difficulty.</div>{/if}
<div class="grid g2">
  {#each pools as p, k}
    {@const l = live[k]}
    <div class="card fm" data-testid="pool-{k + 1}">
      <div class="row"><h3>{label(k)}</h3><span class="sp"></span>
        {#if l && p.url}<span class="pill"><span class="dot {l.connected ? 'ok' : 'crit'}"></span>{l.connected ? 'connected' : 'offline'}</span>{:else if k === 1 && !p.url}<span class="pill"><span class="dot"></span>not set</span>{/if}</div>
      {#if l && p.url}{@const h = poolHash(i, k)}<div class="mute small" data-testid="live-{k + 1}">{liveAllocation(i, k).toFixed(0)}% of work · {h.est ? '~' : ''}{fmtMH(h.mh)} · ping {l.pingRtt?.toFixed(0) ?? '—'} ms · diff {fmtDiff(l.poolDifficulty)} · {l.accepted ?? 0} acc / {l.rejected ?? 0} rej · best {fmtDiff(l.bestDiff)}</div>{/if}
      <div class="r2"><label class="f" style="flex:3"><span>Stratum host</span><input bind:value={p.url} placeholder="ltc.pool.example" /></label><label class="f" style="flex:1"><span>Port</span><input type="number" bind:value={p.port} /></label></div>
      <label class="f"><span>Worker / user (LTC wallet or account.worker)</span><input bind:value={p.user} placeholder="ltc1q….nexusl1" /></label>
      <label class="f"><span>Password {#if p.password === '*****'}(unchanged){/if}</span>
        <div class="row nowrap"><input type={show[k] ? 'text' : 'password'} bind:value={p.password} placeholder="x  or  DOGE=D… for merged mining" autocomplete="new-password" /><button onclick={() => show[k] = !show[k]}>{show[k] ? 'Hide' : 'Show'}</button></div></label>
      <div class="r2"><label class="chk"><input type="checkbox" bind:checked={p.tls} /> TLS (stratum+ssl)</label><label class="chk"><input type="checkbox" bind:checked={p.enonceSubscribe} /> Extranonce subscribe</label></div>
      {#if errs[k]}<div class="crit small">{errs[k]}</div>{/if}
      {#if k === 1 && mode === MODE_FAILOVER}<div class="mute small">Optional. Used only while the primary pool is unreachable. Leave empty for no fallback.</div>{/if}
    </div>
  {/each}
</div>
<div class="row"><span class="sp"></span><button onclick={() => pools = null}>Revert</button><button class="pri" disabled={errs.some(Boolean)} data-testid="save-pools" onclick={save}>Review &amp; save</button></div>
<section class="card c-gold">
  <h2>LTC + DOGE merged mining</h2>
  <div class="small">Scrypt lets the same work count for Litecoin and Dogecoin at once if the pool supports merged mining. The firmware passes your user and password to the pool; set up merged-mining payouts the way your pool documents it (many solo pools take the LTC address as user and <span class="mono">DOGE=&lt;your DOGE address&gt;</span> as password). DOGE credit shows on the pool's own dashboard. Costean OS adds no fee and no pool of its own.</div>
  {#if /LfwNtTUZXEMY2jRjisQfxGzK72o46uaAib/.test(i.stratumUser || '')}<div class="card crit small" data-testid="factory-addr">⚠ This miner still uses the factory-default payout user from the stock image (<span class="mono">LfwNtTUZ…aAib.nexusl1</span>, not your wallet). Enter your own LTC address above.</div>{/if}
  <div class="mute small gap6">Dual pool mode shares jobs for all {chipCount(i)} chips over time; it does not dedicate chips to a pool. Make Pool 1 your own pool and wallet.</div>
</section>
{:else}<div class="card mute">Connecting…</div>{/if}
<style>.fm{display:grid;gap:10px;align-content:start}.r2{display:flex;gap:10px;flex-wrap:wrap;align-items:end}.r2>*{flex:1;min-width:140px}.nowrap{flex-wrap:nowrap}
.warnbox{border:1px solid var(--warn);background:color-mix(in srgb,var(--warn) 10%,transparent)}.gap6{margin-top:6px}</style>
