<script>
  import { app, applySettings } from '../lib/store.svelte.js';
  import { expectedMH, fmtMH, isAboveStock, outOfLimits, stock, modeOf, chipCount } from '../lib/model.js';
  let i = $derived(app.info), a = $derived(app.asic);
  let f = $state(null), v = $state(null), job = $state(null), sd = $state(null);
  $effect(() => { if (i && f == null) { f = i.frequency; v = i.coreVoltage; job = i.jobInterval; sd = i.stratumDifficulty; } });
  let fopts = $derived([...new Set([...(a?.frequencyOptions || []), i?.frequency].filter(Boolean))].sort((x, y) => x - y));
  let vopts = $derived([...new Set([...(a?.voltageOptions || []), i?.coreVoltage].filter(Boolean))].sort((x, y) => x - y));
  let st = $derived(stock(a, i));
  let above = $derived(isAboveStock(+f, +v, a, i));
  let lim = $derived(outOfLimits(+f, +v, a));
  let est = $derived(i ? expectedMH({ ...i, frequency: +f }) : 0);
  let mode = $derived(modeOf(i, a));
  let changed = $derived(i && (+f !== i.frequency || +v !== i.coreVoltage));
  function preset(pf, pv) { f = pf; v = pv; }
</script>
{#if i}
<h1>Mining & Tuning</h1><div class="mute">ASIC clock and core voltage. Every change goes through a confirm dialog.</div>
<section class="grid g2">
  <div class="card c-cyan" data-testid="tuning">
    <h2>ASIC tuning · {i.ASICModel || 'BM1491'} ×{chipCount(i)}</h2>
    <div class="row"><span class="pill"><span class="dot {mode?.level}"></span>{mode?.text}</span><span class="mute small">applied {i.frequency} MHz · measured core {i.coreVoltageActual} mV</span></div>
    <div class="grid g2 fields">
      <label class="f"><span>Frequency (MHz)</span><select bind:value={f} data-testid="freq">{#each fopts as o}<option value={o}>{o}{o === st.f ? ' (stock)' : ''}{o > st.f ? ' ▲' : ''}</option>{/each}</select></label>
      <label class="f"><span>Core voltage (mV)</span><select bind:value={v} data-testid="volt">{#each vopts as o}<option value={o}>{o}{o === st.v ? ' (stock)' : ''}{o > st.v ? ' ▲' : ''}</option>{/each}</select></label>
    </div>
    <div class="row presets">
      <button onclick={() => preset(st.f, st.v)}>Stock {st.f} / {st.v}</button>
      {#if a?.ecoFrequency}<button onclick={() => preset(a.ecoFrequency, a.ecoVoltage)}>Eco {a.ecoFrequency} / {a.ecoVoltage}</button>{/if}
    </div>
    <div class="mute small">Estimate at {f} MHz: <b class="mono">{fmtMH(est)}</b> (stock core-math formula). Options come from the firmware (/api/system/asic); limits {a?.absMinVoltage ?? '—'}–{a?.absMaxVoltage ?? '—'} mV, max {a?.absMaxFrequency ?? '—'} MHz are enforced by the firmware.</div>
    {#if above}<div class="card warnbox small">▲ Above stock. Expect more heat and power; you will be asked to type <b class="mono">ABOVE STOCK</b> to confirm.</div>{/if}
    {#if lim}<div class="card crit small">{lim}</div>{/if}
    <div class="row"><span class="sp"></span><button class="pri" disabled={!changed || !!lim} data-testid="apply-tune" onclick={() => applySettings({ frequency: +f, coreVoltage: +v }, `Set ${f} MHz / ${v} mV`)}>Review &amp; apply</button></div>
  </div>
  <div class="card c-blue">
    <h2>Work & difficulty</h2>
    <div class="grid g2 fields">
      <label class="f"><span>Job interval (ms)</span><input type="number" min="100" bind:value={job} /></label>
      <label class="f"><span>Suggested stratum difficulty</span><input type="number" min="1" bind:value={sd} /></label>
    </div>
    <div class="mute small">Scrypt pools usually set their own difficulty; the suggested value is only a hint (stock factory value 5000).</div>
    <div class="row"><span class="sp"></span><button class="pri" disabled={+job === i.jobInterval && +sd === i.stratumDifficulty} onclick={() => applySettings({ jobInterval: +job, stratumDifficulty: +sd }, 'Update job interval / difficulty')}>Review &amp; apply</button></div>
    <h2 style="margin-top:16px">Live</h2>
    <table><tbody>
      <tr><td>Hashrate now / 10 min / 1 h</td><td class="mono">{fmtMH(i.hashRate)} · {fmtMH(i.hashRate_10m)} · {fmtMH(i.hashRate_1h)}</td></tr>
      <tr><td>Expected (core math)</td><td class="mono">{fmtMH(expectedMH(i))}</td></tr>
      <tr><td>Pool difficulty</td><td class="mono">{i.poolDifficulty ?? '—'}</td></tr>
      <tr><td>Shares A / R</td><td class="mono">{i.sharesAccepted} / {i.sharesRejected}</td></tr>
    </tbody></table>
  </div>
</section>
{:else}<div class="card mute">Connecting…</div>{/if}
<style>.fields{margin:12px 0}.presets{margin-bottom:10px}.warnbox{border-color:var(--warn);color:var(--warn);margin:10px 0}</style>
