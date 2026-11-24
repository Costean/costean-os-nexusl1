<script>
  // Schedules run from this page: the stock NexusL1 firmware has no scheduler or time zone, so an open Costean OS tab
  // evaluates the windows and sends the same settings PATCH you would send by hand.
  import { app, saveSchedule, clearSchedLog } from '../lib/store.svelte.js';
  import { DAYS, SCREEN_MODES, ALL_DAYS, WEEKDAYS, WEEKEND, MAX_WINDOWS, hhmm, parseHHMM, daysLabel, toggleDay, windowMinutes, validateSchedule, weekGrid, blankWindow,
    localParts, describeTarget, targetAt, normalizeSchedule, exportSchedule, DEFAULT_TZ, validTz, screenLabel } from '../lib/schedule.js';
  import { PROFILES, PROFILE_IDS, presets } from '../lib/profiles.js';
  import { download } from '../lib/download.js';
  let i = $derived(app.info), a = $derived(app.asic);
  let e = $state(null);
  $effect(() => { if (app.sched && !e) e = JSON.parse(JSON.stringify(app.sched)); });
  let err = $derived(e ? validateSchedule(e) : null);
  let dirty = $derived(e && app.sched && JSON.stringify(e) !== JSON.stringify(app.sched));
  let grid = $derived(e && !err ? weekGrid(e) : []);
  let now = $derived((app.tick, new Date()));
  let loc = $derived(e && validTz(e.tz) ? localParts(now, e.tz) : null);
  let cur = $derived(app.sched?.enabled ? targetAt(app.sched, now) : null);
  let pr = $derived(presets(a, i));
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  const zones = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return [DEFAULT_TZ, 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'Europe/London', 'Europe/Berlin', 'UTC']; } })();
  const zoneList = $derived([...new Set([e?.tz, DEFAULT_TZ, browserTz, ...zones].filter(Boolean))]);
  const COL = { eco: 'var(--acc2)', stock: 'var(--ice)', turbo: 'var(--acc)' };
  const setTime = (w, k, v) => { const m = parseHHMM(v); if (m != null) w[k] = m; };
  const pl = id => id === 'none' ? 'No change' : PROFILES[id].label + (pr[id] ? ` · ${pr[id].f}/${pr[id].v}` : ' (n/a)');
  const fmtT = t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  async function save() { if (await saveSchedule(e)) e = null; }
  function exp() { download(`costean-schedule-${i?.hostname || 'nexus'}.json`, JSON.stringify(exportSchedule(app.sched, i), null, 2), 'application/json'); }
  let impErr = $state('');
  async function imp(ev) {
    impErr = ''; const f = ev.currentTarget.files?.[0]; ev.currentTarget.value = ''; if (!f) return;
    try { const s = normalizeSchedule(JSON.parse(await f.text())); e = s; } catch (x) { impErr = 'Import failed: ' + x.message; }
  }
</script>
<h1>Schedules</h1><div class="mute">Switch profiles and the screen at set times and days.</div>
<div class="card banner" data-testid="sched-banner"><b>Schedules run from this page; keep a browser tab open on an always-on device. The miner itself can't run them.</b>
  <div class="small">The stock Nexus L1 firmware has no scheduler and no time-zone setting. While a Costean OS tab is open, it checks the schedule every 5 seconds and sends the same settings change you would make by hand. If no tab is open, nothing changes. The schedule is stored in this browser; use Export / Import to move it to another device.</div></div>
{#if e && i}
<section class="card c-cyan status" data-testid="sched-status">
  <div><div class="eyebrow">Schedule clock</div><div class="big mono" data-testid="sched-clock">{loc?.label ?? '—'}</div><div class="mute small">{e.tz.replace(/_/g, ' ')}</div></div>
  <div><div class="eyebrow">Now</div>
    <div class="small" data-testid="sched-now">{#if !app.sched.enabled}Schedules are off{:else if cur}{describeTarget(cur, a, i)}{/if}</div>
    <div class="mute small">{app.schedNote}</div></div>
  <div><div class="eyebrow">Next action</div>
    <div class="small" data-testid="sched-next">{#if !app.sched.enabled}—{:else if app.schedNext}<b>{app.schedNext.target.local.label}</b> ({fmtT(app.schedNext.at)} here): {describeTarget(app.schedNext.target, a, i)}{:else}No change in the next 8 days{/if}</div></div>
  <span class="sp"></span>
  <label class="chk big-chk"><input type="checkbox" bind:checked={e.enabled} data-testid="sched-enabled" /> Schedules on</label>
</section>
<section class="grid g2">
  <div class="card c-blue fm">
    <h2>Time zone & outside windows</h2>
    <label class="f"><span>Time zone (the miner has none; default America/New_York)</span><select bind:value={e.tz} data-testid="sched-tz">{#each zoneList as z}<option value={z}>{z.replace(/_/g, ' ')}</option>{/each}</select></label>
    {#if browserTz !== e.tz}<button class="lnk" onclick={() => e.tz = browserTz}>Use this browser's zone ({browserTz})</button>{/if}
    <div class="g2 grid">
      <label class="f"><span>Profile outside windows</span><select bind:value={e.base} data-testid="sched-base"><option value="none">No change (leave as is)</option>{#each PROFILE_IDS as id}<option value={id} disabled={!pr[id]}>{pl(id)}</option>{/each}</select></label>
      <label class="f"><span>Screen outside windows</span><select bind:value={e.baseScreen}>{#each SCREEN_MODES as [v, l]}<option value={v}>{l}</option>{/each}</select></label>
    </div>
    <div class="mute small">Changes happen at window edges only. If you change a setting by hand, the schedule leaves it until the next window starts or ends.</div>
  </div>
  <div class="card c-ice fm">
    <h2>What it can change</h2>
    <dl class="kv">
      {#each PROFILE_IDS as id}<dt>{PROFILES[id].label}</dt><dd>{pr[id] ? `${pr[id].f} MHz / ${pr[id].v} mV` : 'not available'}</dd>{/each}
      <dt>Screen</dt><dd>auto screen-off on / off</dd>
    </dl>
    <div class="mute small">The stock firmware has one screen switch, <span class="mono">autoscreenoff</span> (the LCD turns itself off after a while; a button press wakes it). It has no dim or brightness setting, so there is no "dim". Values are checked against the firmware limits before every write; Turbo needs <b class="mono">ABOVE STOCK</b> when you save.</div>
  </div>
</section>
<section class="card c-blue" data-testid="week">
  <div class="row"><h2>Week at a glance ({e.tz.replace(/_/g, ' ')})</h2><span class="sp"></span>
    {#each PROFILE_IDS as id}<span class="lg"><i style:background={COL[id]}></i>{PROFILES[id].label}</span>{/each}<span class="lg"><i class="offsw"></i>Auto screen-off</span></div>
  <div class="wk"><div class="week">
    <div></div>{#each Array(24) as _, h}<div class="hh mute">{h % 3 ? '' : String(h).padStart(2, '0')}</div>{/each}
    {#each grid as row, d}<div class="dd mute">{DAYS[d]}</div>{#each row as c}<div class="cell" class:off={c?.screen === 'autooff'} style:background={c?.profile ? COL[c.profile] : null}></div>{/each}{/each}
  </div></div>
</section>
<section class="grid wins" data-testid="windows">
  {#each e.windows as w, k}
    <div class="card win" class:disabled={!w.on} data-testid="win-{k + 1}">
      <div class="row"><label class="chk"><input type="checkbox" bind:checked={w.on} /></label><input class="nm" maxlength="24" bind:value={w.name} placeholder="Name" />
        <span class="sp"></span><button class="x" onclick={() => e.windows.splice(k, 1)} aria-label="Delete window">✕</button></div>
      <div class="mute small">{daysLabel(w.days)} · {hhmm(w.start)}–{hhmm(w.end)}{w.start === w.end ? ' (all day)' : w.end < w.start ? ' (ends next day)' : ''} · {(windowMinutes(w) / 60).toFixed(1)} h</div>
      <div class="row">
        <div class="days">{#each DAYS as dn, di}<button class:on={w.days & (1 << di)} onclick={() => w.days = toggleDay(w.days, di)}>{dn.slice(0, 2)}</button>{/each}</div>
        <div class="seg"><button onclick={() => w.days = ALL_DAYS}>All</button><button onclick={() => w.days = WEEKDAYS}>Mon–Fri</button><button onclick={() => w.days = WEEKEND}>Sat–Sun</button></div>
      </div>
      <div class="r4">
        <label class="f"><span>From</span><input type="time" value={hhmm(w.start)} onchange={ev => setTime(w, 'start', ev.currentTarget.value)} data-testid="win-{k + 1}-start" /></label>
        <label class="f"><span>To</span><input type="time" value={hhmm(w.end)} onchange={ev => setTime(w, 'end', ev.currentTarget.value)} data-testid="win-{k + 1}-end" /></label>
        <label class="f"><span>Profile</span><select bind:value={w.profile} data-testid="win-{k + 1}-profile"><option value="none">No change</option>{#each PROFILE_IDS as id}<option value={id} disabled={!pr[id]}>{PROFILES[id].label}</option>{/each}</select></label>
        <label class="f"><span>Screen</span><select bind:value={w.screen}>{#each SCREEN_MODES as [v, l]}<option value={v}>{l}</option>{/each}</select></label>
      </div>
    </div>
  {/each}
</section>
<div class="row">
  <button onclick={() => e.windows.push(blankWindow())} disabled={e.windows.length >= MAX_WINDOWS} data-testid="add-window">+ Quiet night</button>
  <button onclick={() => e.windows.push({ on: true, name: 'Workday eco', days: WEEKDAYS, start: 9 * 60, end: 17 * 60, profile: 'eco', screen: 'keep' })} disabled={e.windows.length >= MAX_WINDOWS}>+ Workday eco</button>
  <span class="mute small">{e.windows.length} / {MAX_WINDOWS} windows. Overlaps: the lowest-power profile and auto screen-off win.</span>
  <span class="sp"></span>{#if err}<span class="crit small" data-testid="sched-err">{err}</span>{/if}
  {#if dirty}<button onclick={() => e = JSON.parse(JSON.stringify(app.sched))}>Revert</button>{/if}<button class="pri" disabled={!!err || !dirty} onclick={save} data-testid="save-sched">Review & save</button>
</div>
<section class="grid g2">
  <div class="card c-gold" data-testid="sched-log"><div class="row"><h2>Log of applied changes</h2><span class="sp"></span>{#if app.schedLog.length}<button class="lnk small" onclick={clearSchedLog}>Clear</button>{/if}</div>
    {#if !app.schedLog.length}<div class="mute small">Nothing yet. Entries appear when this browser applies, skips or fails a change.</div>{/if}
    <div class="log">{#each app.schedLog.slice(0, 30) as l}<div class="ll"><span class="mono mute">{fmtT(l.t)}</span><span class="tag {l.kind === 'applied' ? 'ok' : l.kind === 'error' ? 'warn' : ''}">{l.kind}</span><span class="small">{l.msg}</span></div>{/each}</div></div>
  <div class="card c-blue fm"><h2>Export / import</h2>
    <div class="mute small">The schedule lives in this browser's storage for this miner. Export it to keep a copy or to run it from another always-on device; import loads a file into the editor (then Review & save).</div>
    <div class="row"><button onclick={exp} data-testid="sched-export">Export JSON</button><label class="btn">Import JSON<input type="file" accept="application/json,.json" onchange={imp} hidden data-testid="sched-import" /></label></div>
    {#if impErr}<div class="crit small">{impErr}</div>{/if}
  </div>
</section>
{:else}<div class="card mute">Loading schedules…</div>{/if}
<style>.banner{border-color:var(--warn);background:color-mix(in srgb,var(--warn) 10%,transparent);display:grid;gap:6px}.banner b{color:var(--warn)}
.status{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start}.status>div{min-width:150px;max-width:340px}.big-chk{font-weight:700;align-self:center}
.fm{display:grid;gap:10px;align-content:start}.lnk{background:none;border:0;padding:0;color:var(--acc);justify-self:start;cursor:pointer}
.lg{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:var(--mute)}.lg i{width:12px;height:12px;border-radius:3px;display:inline-block}.offsw{background:repeating-linear-gradient(45deg,#3a3f49 0 3px,#0e1013 3px 6px);border:1px solid var(--line2)}
.wk{overflow-x:auto;max-width:100%}.week{display:grid;grid-template-columns:32px repeat(24,minmax(0,1fr));gap:2px;margin-top:8px}.hh{font:10px var(--mono)}.dd{font-size:11px;align-self:center}
.cell{height:20px;border-radius:4px;background:#14161b;border:1px solid var(--line);position:relative}.cell.off::after{content:'';position:absolute;inset:0;border-radius:3px;background:repeating-linear-gradient(45deg,#000a 0 3px,transparent 3px 6px)}
.wins{grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))}.win{display:grid;gap:10px;min-width:0}.win.disabled{opacity:.55}.nm{max-width:220px;font-weight:700}
.x{padding:4px 9px}.days{display:flex;gap:3px;flex-wrap:wrap}.days button{padding:5px 8px;font-size:12px;border-radius:7px}.days button.on{background:var(--acc);color:#1a0f08;border-color:var(--acc);font-weight:700}
.r4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}input[type=time]{color-scheme:dark}
.log{display:grid;gap:6px;max-height:320px;overflow:auto}.ll{display:grid;grid-template-columns:auto auto 1fr;gap:8px;align-items:center}
@media (max-width:700px){.cell{height:16px;border-radius:3px}.hh{font-size:9px}.r4{grid-template-columns:repeat(2,minmax(0,1fr))}.ll{grid-template-columns:1fr}}</style>
