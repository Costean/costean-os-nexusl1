<script>
  import { app, applySettings, runAction } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import { stock, boardTemp, realTemp, fanPatch } from '../lib/model.js';
  import Chart from '../components/Chart.svelte';
  import { ring } from '../lib/store.svelte.js';
  let i = $derived(app.info), a = $derived(app.asic);
  let fm = $state(null), ms = $state(100), tgt = $state(60), oh = $state(70);
  $effect(() => { if (i && fm == null) { fm = i.autofanspeed === 0 ? 0 : 2; ms = i.manualFanSpeed ?? 100; tgt = i.pidTargetTemp > 0 ? i.pidTargetTemp : 60; oh = i.overheat_temp ?? 70; } });
  let rec = $derived((app.tick, ring.a.slice(-180)));
  let st = $derived(stock(a, i));
  const thermalPatch = () => fanPatch(i, { mode: +fm, manual: +ms, target: +tgt, overheat: +oh });
  let flip = $state(null), aso = $state(false);
  $effect(() => { if (i && flip == null) { flip = i.flipscreen == 1; aso = i.autoscreenoff == 1; } });
</script>
{#if i}
<h1>Thermal & Safe Mode</h1><div class="mute">Fan control, overheat protection and safe presets. Tuned for the stock fan and heatsink.</div>
<section class="grid g3">
  <div class="card stat"><div class="lbl">ASIC temp (board)</div><div class="v">{boardTemp(i)?.toFixed(1) ?? '—'}<small>°C</small></div></div>
  <div class="card stat c-blue"><div class="lbl">VR</div><div class="v">{realTemp(i.vrTemp)?.toFixed(1) ?? '—'}<small>°C</small></div></div>
  <div class="card stat c-ice"><div class="lbl">Fan</div><div class="v">{i.fanrpm}<small>rpm · {i.fanspeed}%</small></div></div>
  <div class="card stat c-gold"><div class="lbl">Overheat shutdown at</div><div class="v">{i.overheat_temp}<small>°C</small></div></div>
</section>
<section class="grid g2">
  <div class="card c-cyan" data-testid="fan-card">
    <h2>Fan control</h2>
    <div class="seg"><button class:on={fm === 2} onclick={() => fm = 2}>Auto (PID target)</button><button class:on={fm === 0} onclick={() => fm = 0}>Manual</button></div>
    <div class="grid g2 fields">
      {#if fm === 0}<label class="f"><span>Manual speed {ms}%</span><input type="range" min="20" max="100" bind:value={ms} /></label>
      {:else}<label class="f"><span>Target ASIC temperature (°C)</span><input type="number" min="30" max="80" bind:value={tgt} /></label>{/if}
      <label class="f"><span>Overheat shutdown (°C, 40–90)</span><input type="number" min="40" max="90" bind:value={oh} /></label>
    </div>
    <div class="row"><span class="sp"></span><button class="pri" disabled={!(+oh >= 40 && +oh <= 90) || !(+tgt >= 30 && +tgt <= 80)} onclick={() => applySettings(thermalPatch(), 'Update fan / thermal settings')}>Review &amp; apply</button></div>
  </div>
  <div class="card c-ok" data-testid="safe-card">
    <h2>Safe mode</h2>
    <div class="small">One tap back to conservative tuning. These presets come from the firmware itself — Costean OS does not change the board's defaults.</div>
    <div class="row presets">
      <button class="safe" onclick={() => applySettings({ frequency: st.f, coreVoltage: st.v }, `Safe mode: stock ${st.f} MHz / ${st.v} mV`)}>Stock {st.f} MHz / {st.v} mV</button>
      {#if a?.ecoFrequency}<button onclick={() => applySettings({ frequency: a.ecoFrequency, coreVoltage: a.ecoVoltage }, `Eco ${a.ecoFrequency} MHz / ${a.ecoVoltage} mV`)}>Eco {a.ecoFrequency} MHz / {a.ecoVoltage} mV</button>{/if}
    </div>
    <h2>Built-in protection (stock firmware, unchanged)</h2>
    <ul class="small prot"><li>ASIC overheat shutdown at {i.overheat_temp} °C</li><li>Voltage-regulator overheat shutdown</li><li>PSU fault, current and voltage protection</li></ul>
    <div class="row"><span class="sp"></span><button class="danger" onclick={() => runAction('Shut down ASICs (stop mining)', t => api.shutdown(t), { danger: true })}>Stop mining now</button></div>
  </div>
</section>
<section class="card c-blue"><h2>Temperature history</h2>
  <div class="mute small" style="margin-bottom:10px" data-testid="thermal-no-perchip">The Nexus L1 firmware cannot read each chip's temperature; the ASIC temperature is the board sensor next to the chips, the value the fan control and overheat shutdown use.</div>
  <Chart height={170} unit="°C" series={[{ name: 'ASIC (board)', color: '#ffc75a', points: rec.map(x => ({ t: x.t, v: x.asic })) }, { name: 'VR', color: '#4fe3ff', points: rec.map(x => ({ t: x.t, v: x.vr })) }]} />
</section>
<section class="card c-ice" data-testid="lcd-card"><h2>LCD</h2>
  <div class="mute small">The front button cycles the stock LCD pages: mining dashboard, pool &amp; settings, price, global stats. Costean OS only changes the background art; every number on the screen is drawn by the stock firmware.</div>
  <label class="chk"><input type="checkbox" bind:checked={flip} /> Flip screen 180°</label>
  <label class="chk"><input type="checkbox" bind:checked={aso} /> Turn screen off automatically</label>
  <div class="row"><span class="sp"></span><button class="pri" disabled={flip === (i.flipscreen == 1) && aso === (i.autoscreenoff == 1)} onclick={() => applySettings({ flipscreen: flip, autoscreenoff: aso }, 'Update display settings')}>Review &amp; apply</button></div>
</section>
{:else}<div class="card mute">Connecting…</div>{/if}
<style>.fields{margin:12px 0}.presets{margin:10px 0 14px}.prot{margin:0 0 10px;padding-left:18px}</style>
