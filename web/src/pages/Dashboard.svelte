<script>
  import { app, ring } from '../lib/store.svelte.js';
  import { fmtMH, fmtDiff, fmtUptime, efficiency, expectedMH, rejectPct, errLevel, health, chipCount, boardTemp, realTemp } from '../lib/model.js';
  import NeonGauge from '../components/NeonGauge.svelte';
  import Chart from '../components/Chart.svelte';
  import { splitFromInfo, liveAllocation, poolHash, POOL_COLORS } from '../lib/split.js';
  let i = $derived(app.info);
  let exp = $derived(expectedMH(i));
  let eff = $derived(efficiency(i?.power, i?.hashRate));
  let rec = $derived((app.tick, ring.a.slice(-180)));
  // No per-chip temperatures: the NexusL1 firmware has no per-chip readout (asicTemps are always 0). Only real board readings.
  let btemp = $derived(boardTemp(i));
  let vr = $derived(realTemp(i?.vrTemp));
  let nchips = $derived(chipCount(i));
  let rr = $derived(rejectPct(i));
  let checks = $derived(health(i, app.asic));
  let pool = $derived((i?.stratum?.pools || [])[0]);
  let multi = $derived(i?.stratum?.poolMode === 1);
  let cfgPools = $derived((i?.pools || []).filter(p => p.url).slice(0, 2));
  let cfgSplit = $derived(multi ? splitFromInfo(i, cfgPools.length || 1) : null);
  let rows = $derived(cfgPools.map((p, k) => ({ p, k, s: i?.stratum?.pools?.[k], alloc: liveAllocation(i, k), h: poolHash(i, k), cfg: cfgSplit ? cfgSplit[k] : (k === 0 ? 'primary' : 'fallback') })));
  let unit = $derived((i?.hashRate || 0) >= 1000 ? 'GH/s' : 'MH/s');
  let big = $derived(unit === 'GH/s' ? ((i?.hashRate || 0) / 1000).toFixed(2) : (i?.hashRate || 0).toFixed(1));
  const tc = v => v == null ? 'var(--mute)' : v >= 75 ? 'var(--crit)' : v >= 68 ? 'var(--warn)' : v >= 58 ? 'var(--ice)' : 'var(--acc)';
  const vc = v => v == null ? 'var(--mute)' : v >= 90 ? 'var(--crit)' : v >= 80 ? 'var(--warn)' : 'var(--acc2)';
  let status = $derived(!i ? '' : i.shutdown ? 'ASIC SHUTDOWN' : i.uptimeSeconds < 300 ? 'RAMPING UP' : exp && i.hashRate >= 0.9 * exp ? 'AT TARGET' : 'BELOW TARGET');
</script>
{#if i}
<section class="hero">
  <div class="card gauge" data-testid="gauge">
    <div class="eyebrow">Measured hashrate · Scrypt</div>
    <NeonGauge value={i.hashRate || 0} max={Math.max(exp * 1.15, i.hashRate || 1)} text={big} unit={unit} sub={'UP ' + fmtUptime(i.uptimeSeconds).toUpperCase()} />
    <div class="row status"><span class="dot {status === 'AT TARGET' ? 'ok' : 'warn'}"></span><b class={status === 'AT TARGET' ? 'ok' : 'warn'}>{status}</b><span class="sp"></span><span class="mute small">{exp ? ((i.hashRate || 0) / exp * 100).toFixed(1) + '% of ' + fmtMH(exp) + ' core math' : ''}</span></div>
    <div class="row mute small"><span>10 min {fmtMH(i.hashRate_10m)}</span><span>1 h {fmtMH(i.hashRate_1h)}</span><span>1 d {fmtMH(i.hashRate_1d)}</span></div>
  </div>
  <div class="vit">
    <div class="card stat"><div class="lbl">ASIC temp</div><div class="v" style:color={tc(btemp)} data-testid="chip-max">{btemp?.toFixed(1) ?? '—'}<small>°C</small></div><div class="mute small">{btemp == null ? 'no reading · ' : ''}limit {i.overheat_temp ?? '—'} °C</div></div>
    <div class="card stat c-blue"><div class="lbl">VR temp</div><div class="v" style:color={vc(vr)}>{vr?.toFixed(1) ?? '—'}<small>°C</small></div><div class="mute small">{i.vrTempInt ? 'int ' + i.vrTempInt.toFixed(1) + ' °C' : ''}</div></div>
    <div class="card stat c-blue"><div class="lbl">Power</div><div class="v" style:color="var(--acc2)">{i.power?.toFixed(1) ?? '—'}<small>W</small></div><div class="mute small">{eff ? eff.toFixed(1) + ' mJ/MH' : ''} · {(i.voltage / 1000)?.toFixed(2)} V in</div></div>
    <div class="card stat"><div class="lbl">Core volt</div><div class="v">{i.coreVoltageActual ?? '—'}<small>mV</small></div><div class="mute small">set {i.coreVoltage} mV</div></div>
    <div class="card stat c-cyan"><div class="lbl">ASIC clock</div><div class="v">{i.frequency ?? '—'}<small>MHz</small></div><div class="mute small">stock {app.asic?.defaultFrequency ?? i.defaultFrequency ?? '—'} MHz</div></div>
    <div class="card stat c-ice"><div class="lbl">Fan</div><div class="v">{i.fanrpm ?? '—'}<small>rpm</small></div><div class="mute small">{i.fanspeed ?? '—'}% {i.fanCount > 1 ? '· fan 2 ' + (i.fanrpm2 ?? '—') + ' rpm' : ''}</div></div>
  </div>
</section>
<section class="card c-cyan" data-testid="matrix">
  <div class="row"><h2>Hash board · {i.ASICModel || 'BM1491'} ×{nchips}</h2><span class="sp"></span>
    <span class="small {errLevel(rr)}" data-testid="matrix-err">share rejects {rr.toFixed(2)}% · duplicate HW nonces {i.duplicateHWNonces ?? 0}</span></div>
  <div class="bd" data-testid="board-panel">
    <div class="bt" style:--c={tc(btemp)}><span class="eyebrow">ASIC temp (board sensor)</span><b class="num" style:color={tc(btemp)} data-testid="board-temp">{btemp?.toFixed(1) ?? '—'}<small> °C</small></b><span class="mute small">{btemp != null ? Math.max(0, (i.overheat_temp || 70) - btemp).toFixed(1) + ' °C headroom · shutdown at ' + (i.overheat_temp ?? '—') + ' °C' : 'firmware reports no ASIC temperature yet'}</span></div>
    <div class="bt"><span class="eyebrow">VR temp</span><b class="num" style:color={vc(vr)}>{vr?.toFixed(1) ?? '—'}<small> °C</small></b><span class="mute small">voltage regulator{realTemp(i.vrTempInt) ? ' · int ' + i.vrTempInt.toFixed(1) + ' °C' : ''}</span></div>
    <div class="bt"><span class="eyebrow">Board hashrate</span><b class="num" style:color="var(--eblue)">{fmtMH(i.hashRate)}</b><span class="mute small">{exp ? ((i.hashRate || 0) / exp * 100).toFixed(1) + '% of ' + fmtMH(exp) : ''}</span></div>
    <div class="bt"><span class="eyebrow">Chips</span><b class="num" data-testid="chip-count">{nchips} × {i.ASICModel || 'BM1491'}</b><span class="mute small">{i.frequency ?? '—'} MHz · {i.coreVoltage ?? '—'} mV</span></div>
  </div>
  <div class="mute small note" data-testid="no-perchip-note">The Nexus L1 firmware cannot read the temperature of each BM1491 chip, so no per-chip temperatures are shown. The ASIC temperature is the board sensor next to the chips; it is the value the fan control and overheat shutdown use. Errors are counted for the whole board.</div>
</section>
<section class="grid g2">
  <div class="card c-ice"><h2>Hash trend</h2><Chart height={190} unit="MH/s" series={[{ name: 'Hashrate', color: '#2f7bff', points: rec.map(x => ({ t: x.t, v: x.mh })) }, { name: '10 min avg', color: '#4fe3ff', points: rec.map(x => ({ t: x.t, v: x.mh10 })) }]} /></div>
  <div class="card c-blue"><h2>Temperatures</h2><Chart height={190} unit="°C" series={[{ name: 'ASIC (board)', color: '#ffc75a', points: rec.map(x => ({ t: x.t, v: x.asic })) }, { name: 'VR', color: '#4fe3ff', points: rec.map(x => ({ t: x.t, v: x.vr })) }]} /></div>
</section>
<section class="strip card c-ok">
  <div><span class="eyebrow">Best share</span><b class="num" style:color="var(--eblue)">{fmtDiff(i.bestDiff)}</b><span class="mute small">session {fmtDiff(i.bestSessionDiff)}</span></div>
  <div><span class="eyebrow">A / R</span><b class="num"><span class="ok">{i.sharesAccepted ?? 0}</span> / {i.sharesRejected ?? 0}</b><span class="mute small">{rr.toFixed(2)}% rejected</span></div>
  <div><span class="eyebrow">Pool</span><b class="mono small">{i.stratumURL || '—'}:{i.stratumPort || ''}</b><span class="mute small">{pool?.connected ? 'connected' : 'not connected'}{pool?.pingRtt ? ' · ' + pool.pingRtt.toFixed(0) + ' ms' : ''}{i.stratum?.usingFallback ? ' · FALLBACK' : ''}</span></div>
  <div><span class="eyebrow">Blocks found</span><b class="num">{i.foundBlocks ?? 0}</b><span class="mute small">all-time {i.totalFoundBlocks ?? 0} · net diff {fmtDiff(i.networkDifficulty)}</span></div>
</section>
<section class="card c-blue psc" data-testid="pool-split-card">
  <div class="row"><h2>Pools · {multi ? 'Dual pool split' : 'Failover (primary / fallback)'}</h2><span class="sp"></span><a class="small" href="#/pools">Edit pools →</a></div>
  <div class="sbar" aria-label="Live share of work">{#each rows as r}<i style:width="{r.alloc}%" style:background={multi ? POOL_COLORS[r.k] : r.k === 0 ? 'var(--acc)' : 'var(--warn)'}>{r.alloc >= 9 ? `P${r.k + 1} ${r.alloc.toFixed(0)}%` : ''}</i>{/each}</div>
  <div class="tw"><table class="small"><thead><tr><th>Pool</th><th>Status</th><th>Split set</th><th>Live share</th><th>Hashrate</th><th>A / R</th><th>Ping</th><th>Best</th></tr></thead><tbody>
  {#each rows as r}<tr data-testid="split-row-{r.k + 1}"><td><span class="sw" style:background={multi ? POOL_COLORS[r.k] : 'var(--line2)'}></span><b>{multi ? 'P' + (r.k + 1) : r.k === 0 ? 'Primary' : 'Fallback'}</b> <span class="mono">{r.p.url}:{r.p.port}</span></td>
    <td><span class="dot inl {r.s?.connected ? 'ok' : 'crit'}"></span>{r.s?.connected ? 'connected' : 'offline'}{#if r.s?.poolDiffErr} <span class="warn">⚠ low diff</span>{/if}</td>
    <td class="mono">{typeof r.cfg === 'number' ? r.cfg + '%' : r.cfg}</td><td class="mono">{r.alloc.toFixed(0)}%</td><td class="mono">{r.h.est ? '~' : ''}{fmtMH(r.h.mh)}</td>
    <td class="mono"><span class="ok">{r.s?.accepted ?? 0}</span> / {r.s?.rejected ?? 0}</td><td class="mono">{r.s?.pingRtt ? r.s.pingRtt.toFixed(0) + ' ms' : '—'}</td><td class="mono">{fmtDiff(r.s?.bestDiff)}</td></tr>{/each}
  </tbody></table></div>
  <div class="mute small">Live share = the firmware's current allocation. The split is over time across all {nchips} chips; DOGE merged-mining credit shows on each pool's own dashboard.{rows.some(r => r.h.est) ? ' ~ = estimated from total hashrate × share.' : ''}</div>
</section>
<section class="card c-gold" data-testid="health"><h2>Health</h2>
  {#each checks as c}<div class="row hc"><span class="dot {c.level}"></span><b class={c.level}>{c.title}</b><span class="mute small">{c.why}</span></div>{/each}
</section>
{:else}<div class="card mute">Connecting to miner…</div>{/if}
<style>
.hero{display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:14px}.gauge{display:grid;gap:6px}.status{border-top:1px solid var(--line);padding-top:10px}
.vit{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}

.bd{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:8px}.bt{display:grid;gap:3px;border:1px solid var(--line2);border-radius:12px;padding:10px 12px;background:#0b1130;box-shadow:inset 0 2px 0 var(--c,var(--acc2))}.bt .num{font-size:22px}@media (max-width:900px){.bd{grid-template-columns:repeat(2,1fr)}}
.note{margin-top:10px}
.sbar{display:flex;height:22px;border-radius:7px;overflow:hidden;border:1px solid var(--line2);background:#1a2358;margin-bottom:8px}.sbar i{display:flex;align-items:center;justify-content:center;font:700 11px var(--mono);color:#06102a;font-style:normal;white-space:nowrap;overflow:hidden}
.psc{min-width:0;overflow:hidden}.tw{overflow-x:auto;max-width:100%}.tw table{min-width:640px}.sw{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}.dot.inl{display:inline-block;margin-right:6px}.hc{padding:4px 0}
.strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.strip>div{display:grid;gap:2px}.strip b{font-size:20px}.strip b.mono{font-size:14px;word-break:break-all}
@media (max-width:1100px){.hero{grid-template-columns:1fr}.vit{grid-template-columns:repeat(2,1fr)}.strip{grid-template-columns:repeat(2,1fr)}}
</style>
