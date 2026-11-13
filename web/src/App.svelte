<script>
  import { onMount } from 'svelte';
  import { app, start } from './lib/store.svelte.js';
  import { modeOf, chipCount } from './lib/model.js';
  import Confirm from './components/Confirm.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Mining from './pages/Mining.svelte';
  import Pools from './pages/Pools.svelte';
  import Thermal from './pages/Thermal.svelte';
  import Network from './pages/Network.svelte';
  import Swarm from './pages/Swarm.svelte';
  import Integrations from './pages/Integrations.svelte';
  import Palette from './components/Palette.svelte';
  import { NAV } from './lib/commands.js';
  import Diagnostics from './pages/Diagnostics.svelte';
  import Update from './pages/Update.svelte';
  import BlockFound from './pages/BlockFound.svelte';
  const PAGES = { dashboard: Dashboard, mining: Mining, pools: Pools, thermal: Thermal, block: BlockFound, swarm: Swarm, influx: Integrations, network: Network, system: Network, diagnostics: Diagnostics, update: Update };
  let menu = $state(false);
  onMount(() => {
    start(); const h = () => app.page = location.hash.slice(2).split('?')[0] || 'dashboard'; addEventListener('hashchange', h);
    const k = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); app.paletteOpen = !app.paletteOpen; } }; addEventListener('keydown', k);
    return () => { removeEventListener('hashchange', h); removeEventListener('keydown', k); };
  });
  const Page = $derived(PAGES[app.page] || Dashboard);
  const title = $derived((NAV.find(n => n[0] === (app.page === 'system' ? 'network' : app.page)) || NAV[0])[1]);
  const mode = $derived(modeOf(app.info, app.asic));
</script>
<div class="shell">
<aside class="side" class:open={menu}>
  <a class="brand" href="#/dashboard">
    <svg viewBox="0 0 28 28" width="30" height="30" aria-hidden="true"><rect x="2" y="2" width="24" height="24" rx="4" fill="none" stroke="var(--eblue)" stroke-width="3"/><rect x="11" y="6" width="11" height="11" rx="2" fill="none" stroke="var(--acc)" stroke-width="3"/></svg>
    <span><b>Costean <em>OS</em></b><i>NEXUS L1 · 4× BM1491 · SCRYPT</i></span></a>
  <div class="eyebrow navh">Your miner</div>
  <nav>{#each NAV as [id, label, ic]}<a href="#/{id}" class:on={app.page === id || (id === 'network' && app.page === 'system')} onclick={() => menu = false}><span class="ic">{ic}</span>{label}{#if id === 'block' && app.info?.totalFoundBlocks > 0}<span class="nb" data-testid="nav-block-count">{app.info.totalFoundBlocks}</span>{/if}</a>{/each}</nav>
  <div class="sp"></div>
  <a class="rec" href="/recovery">Firmware recovery page ↗</a>
  <div class="conn"><span class="dot {app.online ? 'ok' : 'crit'}"></span><div><b>{app.online ? 'Connected' : 'Offline'}</b><div class="mute small mono">{app.info?.hostname || 'nexus'}{app.info?.hostip ? ' · ' + app.info.hostip : ''}</div><div class="mute small mono" data-testid="ui-version">UI {typeof __WWW_VERSION__ !== 'undefined' ? __WWW_VERSION__ : ''}</div></div></div>
</aside>
<div class="body">
  <header class="top">
    <button class="burger" onclick={() => menu = !menu} aria-label="Menu">☰</button>
    <div><div class="eyebrow">Costean OS control center</div><div class="ttl">{title}</div></div>
    <span class="sp"></span>
    {#if mode}<span class="pill" data-testid="mode-pill"><span class="dot {mode.level}"></span>{mode.text}</span>{/if}
    {#if app.info}<span class="pill mono">{app.info.ASICModel || 'BM1491'} ×{chipCount(app.info)}</span>{/if}
    <button class="cmd" onclick={() => app.paletteOpen = true} data-testid="cmd"><span class="mute">Command</span><span class="kbd">Ctrl K</span></button>
  </header>
  <main>
    {#if app.demo}<div class="demo-banner" data-testid="demo">DEMO DATA — mock server, not a real miner</div>{/if}
    {#if !app.online && app.lastOk}<div class="card crit">Miner not responding. Last data {Math.round((Date.now() - app.lastOk) / 1000)}s ago.</div>{/if}
    <Page />
  </main>
</div>
</div>
<Palette /><Confirm />
{#if app.toast}<div class="toast card {app.toast.kind}" role="status">{app.toast.msg}</div>{/if}
<style>
.shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh;align-items:start}
.side{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:6px;padding:18px 14px;background:linear-gradient(180deg,#0a0f2bcc,#0b0d2acc);border-right:1px solid var(--line);backdrop-filter:blur(8px)}
.brand{display:flex;gap:10px;align-items:center;text-decoration:none;color:var(--text);padding:4px 6px 16px}.brand span{display:grid;line-height:1.1}.brand b{font:800 19px var(--ui);letter-spacing:.02em}.brand em{font-style:normal;color:var(--eblue)}.brand i{font:600 9.5px var(--ui);color:var(--acc2);letter-spacing:.06em;font-style:normal;margin-top:3px}
.navh{padding:6px 10px}
nav{display:grid;gap:3px}nav a{display:flex;gap:10px;align-items:center;padding:9px 12px;border-radius:11px;color:#c3cbf0;text-decoration:none;font-size:13.5px;border:1px solid transparent}
nav a:hover{background:#ffffff08;color:#fff}nav a.on{background:linear-gradient(90deg,#3b4bb055,#1f5fd033);border-color:#5b6be0;color:#fff;box-shadow:0 0 18px -6px #6b7bff}
.nb{margin-left:auto;min-width:18px;padding:0 6px;border-radius:9px;background:var(--gold);color:#3a2500;font:800 11px/18px var(--mono);text-align:center}
.ic{width:18px;text-align:center;color:var(--acc);font-size:13px}
.rec{font-size:12px;color:var(--mute);padding:8px 12px;text-decoration:none}.rec:hover{color:var(--acc)}
.conn{display:flex;gap:10px;align-items:center;padding:10px 12px;border-top:1px solid var(--line)}
.body{min-width:0}
.top{position:sticky;top:0;z-index:30;display:flex;gap:12px;align-items:center;padding:12px 24px;background:#070b1ccc;backdrop-filter:blur(10px);border-bottom:1px solid var(--line);flex-wrap:wrap}
.ttl{font:800 17px var(--ui)}.burger{display:none}.cmd{display:flex;gap:14px;align-items:center}
main{padding:16px 24px 40px;display:grid;gap:14px;align-content:start;max-width:1500px}
.toast{position:fixed;bottom:24px;right:24px;z-index:90;padding:10px 16px}.toast.err{border-color:var(--crit)}
@media (max-width:900px){.shell{grid-template-columns:1fr}.side{position:fixed;inset:0 30% 0 0;z-index:80;transform:translateX(-105%);transition:.2s}.side.open{transform:none}.burger{display:block}main{padding:12px}.cmd .mute{display:none}}
</style>
