<script>
  // One-line summary at the top of the Dashboard: profile, health, pool latency, efficiency, schedule, uptime.
  import { app, ring } from '../lib/store.svelte.js';
  import { matchProfile, PROFILES } from '../lib/profiles.js';
  import { analyze } from '../lib/insights.js';
  import { efficiency, fmtUptime } from '../lib/model.js';
  import { describeTarget } from '../lib/schedule.js';
  let i = $derived(app.info);
  let prof = $derived(matchProfile(i, app.asic));
  let h = $derived((app.tick, analyze(i, app.asic, ring.a)));
  let eff = $derived(efficiency(i?.power, i?.hashRate));
  let loss = $derived(Number(i?.recentpingloss ?? i?.stratum?.pools?.[0]?.pingLoss ?? NaN));
  let rtt = $derived(Number(i?.lastpingrtt || i?.stratum?.pools?.[0]?.pingRtt || NaN));
  const gc = s => s >= 90 ? 'var(--ok)' : s >= 75 ? 'var(--acc2)' : s >= 50 ? 'var(--warn)' : 'var(--crit)';
</script>
{#if i}
<section class="sum" data-testid="summary-strip">
  <a href="#/profiles" class="it"><span class="eyebrow">Profile</span><b>{PROFILES[prof]?.label}</b><span class="mute small mono">{i.frequency} MHz · {i.coreVoltage} mV</span></a>
  <a href="#/dashboard" class="it" onclick={e => { e.preventDefault(); document.querySelector('[data-testid=insights]')?.scrollIntoView({ behavior: 'smooth' }); }}><span class="eyebrow">Health</span><b style:color={gc(h.score)} data-testid="health-score">{h.score}<small>/100</small></b><span class="mute small">{h.grade}{h.items[0]?.level !== 'ok' ? ' · ' + h.items.length + ' note' + (h.items.length > 1 ? 's' : '') : ''}</span></a>
  <a href="#/pools" class="it"><span class="eyebrow">Pool ping</span><b class:warn={rtt > 150}>{Number.isFinite(rtt) ? rtt.toFixed(0) : '—'}<small> ms</small></b><span class="mute small" class:warn={loss >= 5}>{Number.isFinite(loss) ? loss.toFixed(1) + '% loss' : 'loss —'}</span></a>
  <div class="it"><span class="eyebrow">Efficiency</span><b>{eff ? eff.toFixed(1) : '—'}<small> mJ/MH</small></b><span class="mute small">{i.power?.toFixed(1) ?? '—'} W</span></div>
  <a href="#/schedules" class="it"><span class="eyebrow">Schedule</span><b class="sm">{app.sched?.enabled ? (app.schedNext ? app.schedNext.target.local.label : 'on') : 'off'}</b><span class="mute small ell">{app.sched?.enabled ? (app.schedNext ? 'next: ' + describeTarget(app.schedNext.target, app.asic, i) : 'no change in 8 days') : 'set up times & days'}</span></a>
  <div class="it"><span class="eyebrow">Uptime</span><b class="sm">{fmtUptime(i.uptimeSeconds)}</b><span class="mute small ell">{i.lastResetReason || ''}</span></div>
</section>
{/if}
<style>.sum{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
.it{display:grid;gap:2px;align-content:start;min-width:0;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--text);text-decoration:none;box-shadow:inset 0 2px 0 var(--acc)}
a.it:hover{border-color:var(--line2)}.it b{font:800 20px var(--mono);letter-spacing:-.02em}.it b small{font:600 11px var(--ui);color:var(--mute)}.it b.sm{font-size:15px;line-height:1.6}
.ell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:1100px){.sum{grid-template-columns:repeat(3,minmax(0,1fr))}}@media (max-width:560px){.sum{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>
