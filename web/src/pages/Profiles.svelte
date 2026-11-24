<script>
  // Eco / Stock / Turbo, derived from the firmware's own /api/system/asic values. The firmware has no profile setting:
  // the active profile is inferred from the applied frequency + voltage. Every change goes through the confirm dialog.
  import { app, applySettings } from '../lib/store.svelte.js';
  import { presets, matchProfile, checkBounds, PROFILES, PROFILE_IDS, TURBO_MAX_MHZ, TURBO_MAX_MV } from '../lib/profiles.js';
  import { expectedMH, fmtMH } from '../lib/model.js';
  import { describeTarget } from '../lib/schedule.js';
  let i = $derived(app.info), a = $derived(app.asic);
  let p = $derived(presets(a, i)), cur = $derived(matchProfile(i, a));
  const COL = { eco: 'var(--acc2)', stock: 'var(--ice)', turbo: 'var(--acc)', custom: 'var(--gold)' };
  const est = (f) => i ? expectedMH({ ...i, frequency: f }) : 0;
  function apply(id) { const x = p[id]; if (!x) return; applySettings({ frequency: x.f, coreVoltage: x.v }, `Switch to ${PROFILES[id].label}: ${x.f} MHz / ${x.v} mV`, { summary: PROFILES[id].blurb }); }
</script>
<h1>Profiles</h1><div class="mute">Pick how hard the miner works. Values come from the firmware; the miner itself keeps only the frequency and voltage, so the active profile is worked out from those.</div>
{#if i}
<section class="card c-cyan now" data-testid="profile-now">
  <div><div class="eyebrow">Active profile</div><div class="pv"><span class="dot" style:background={COL[cur]}></span><b data-testid="active-profile">{PROFILES[cur]?.label || '—'}</b></div>
    <div class="mute small mono">{i.frequency} MHz · {i.coreVoltage} mV set · {i.coreVoltageActual ?? '—'} mV measured</div></div>
  <div><div class="eyebrow">Measured</div><b class="num">{fmtMH(i.hashRate)}</b><div class="mute small">{i.power?.toFixed(1) ?? '—'} W</div></div>
  <div><div class="eyebrow">Schedule</div>{#if app.sched?.enabled}<div class="small">{app.schedNext ? 'next ' + app.schedNext.target.local.label + ': ' + describeTarget(app.schedNext.target, a, i) : 'no change in the next 8 days'}</div>{:else}<div class="small mute">off · <a href="#/schedules">set up</a></div>{/if}</div>
</section>
<section class="grid g3" data-testid="profiles">
  {#each PROFILE_IDS as id}{@const x = p[id]}{@const err = x ? checkBounds(x.f, x.v, a, i) : 'not offered by this firmware'}
    <div class="card prof" class:on={cur === id} style:--pc={COL[id]} data-testid="profile-{id}">
      <div class="row"><h2 style:color={COL[id]}>{PROFILES[id].label}</h2><span class="sp"></span>{#if cur === id}<span class="tag ok">active</span>{/if}{#if id === 'turbo'}<span class="tag acc">above stock</span>{/if}</div>
      {#if x}<div class="big mono">{x.f}<small> MHz</small> · {x.v}<small> mV</small></div>
        <div class="mute small">≈ {fmtMH(est(x.f))} (core math)</div>{:else}<div class="big mute">—</div>{/if}
      <div class="small">{PROFILES[id].blurb}</div>
      {#if err}<div class="small warn">{err}</div>{/if}
      <button class={id === 'turbo' ? '' : 'pri'} disabled={!x || !!err || cur === id} onclick={() => apply(id)} data-testid="apply-{id}">{cur === id ? 'Active' : 'Switch to ' + PROFILES[id].label}</button>
    </div>
  {/each}
</section>
<section class="card c-gold" data-testid="limits">
  <h2>Safety limits (from the firmware)</h2>
  <dl class="kv">
    <dt>Max frequency</dt><dd>{a?.absMaxFrequency ?? '—'} MHz</dd><dt>Core voltage range</dt><dd>{a?.absMinVoltage ?? '—'}–{a?.absMaxVoltage ?? '—'} mV</dd>
    <dt>Turbo cap</dt><dd>stock + {TURBO_MAX_MHZ} MHz / + {TURBO_MAX_MV} mV, one of the firmware's frequency options</dd>
    <dt>Overheat shutdown</dt><dd>{i.overheat_temp ?? '—'} °C (Thermal & Safe Mode)</dd>
  </dl>
  <div class="mute small">The stock firmware has no throttling: above the overheat limit it shuts the ASICs down. Profiles, schedules and manual tuning can only pick values inside these limits; Turbo also asks you to type <b class="mono">ABOVE STOCK</b>.</div>
</section>
{:else}<div class="card mute">Connecting…</div>{/if}
<style>.now{display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start}.pv{display:flex;gap:8px;align-items:center}.pv b{font:800 22px var(--ui)}.pv .dot{width:10px;height:10px}
.prof{display:grid;gap:8px;align-content:start}.prof.on{border-color:var(--pc);box-shadow:0 0 0 1px var(--pc) inset}.prof h2{margin:0}.prof .big small{font:600 12px var(--ui);color:var(--mute)}.prof button{justify-self:start}</style>
