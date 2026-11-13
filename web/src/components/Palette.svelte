<script>
  import { app, go, applySettings, runAction, enableNotifications, toast } from '../lib/store.svelte.js';
  import { parse, suggestions } from '../lib/commands.js';
  import { api } from '../lib/api.js';
  import { downloadBackup } from '../lib/backup.js';
  let q = $state(''), el = $state(), sel = $state(0);
  let plan = $derived(parse(q, app.info, app.asic));
  let list = $derived(q ? [plan, ...suggestions.map(s => parse(s, app.info, app.asic)).filter(p => p && p.label.toLowerCase().includes(q.toLowerCase()) && p.label !== plan?.label)].filter(Boolean).slice(0, 7)
    : suggestions.map(s => parse(s, app.info, app.asic)).filter(Boolean));
  $effect(() => { if (app.paletteOpen) { q = ''; sel = 0; } });
  $effect(() => { el?.focus(); });
  async function run(p) {
    if (!p) return; app.paletteOpen = false;
    if (p.kind === 'nav') return go(p.to);
    if (p.kind === 'ui') { if (p.action === 'notify') enableNotifications(); if (p.action === 'backup') downloadBackup(app.info); return; }
    if (p.kind === 'action') return runAction(p.label, t => p.action === 'restart' ? api.restart(t) : p.action === 'shutdown' ? api.shutdown(t) : p.action === 'testAlert' ? api.testAlert(t) : api.resetStats(t), { danger: p.danger });
    if (p.kind === 'write') { if (p.blocked) return toast(p.blocked, 'err'); return applySettings(p.patch, p.label); }
  }
  function key(e) { if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, list.length - 1); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); e.preventDefault(); } else if (e.key === 'Enter') run(list[sel]); else if (e.key === 'Escape') app.paletteOpen = false; }
</script>
{#if app.paletteOpen}
<div class="ov" role="presentation" onclick={(e) => e.target === e.currentTarget && (app.paletteOpen = false)}>
  <div class="card pal" role="dialog" aria-label="Command palette" data-testid="palette">
    <input bind:this={el} bind:value={q} onkeydown={key} oninput={() => sel = 0} placeholder="Type a command… e.g. “fans 80%”, “stock”, “frequency 1200”, “restart”" />
    <div class="items">
      {#each list as p, k}<button class:on={k === sel} onmouseenter={() => sel = k} onclick={() => run(p)}>
        <span class="tag {p.kind}">{p.kind === 'write' ? 'change' : p.kind}</span> {p.label}
        {#if p.aboveStock}<span class="pill crit small">above stock</span>{/if}{#if p.blocked}<span class="pill crit small">blocked</span>{/if}
      </button>{/each}
      {#if q && !plan}<div class="mute small" style="padding:8px">No command matched. Try: {suggestions.slice(0, 5).join(' · ')}</div>{/if}
    </div>
    <div class="mute small row"><span class="kbd">↑↓</span> select <span class="kbd">Enter</span> run <span class="kbd">Esc</span> close <span class="sp"></span> Every change asks you to confirm first</div>
  </div>
</div>{/if}
<style>.ov{position:fixed;inset:0;background:#0007;backdrop-filter:blur(3px);z-index:70;display:flex;justify-content:center;align-items:flex-start;padding:12vh 12px}
.pal{width:min(640px,100%);display:grid;gap:10px}.pal input{font-size:16px;padding:12px}.items{display:grid;gap:4px}
.items button{text-align:left;background:transparent;border:1px solid transparent;display:flex;gap:8px;align-items:center}.items button.on{background:var(--glass2);border-color:var(--acc)}
.tag{font-size:10px;text-transform:uppercase;letter-spacing:.08em;padding:2px 6px;border-radius:6px;background:var(--glass2);color:var(--mute);min-width:56px;text-align:center}.tag.write{color:var(--warn)}.tag.action{color:var(--crit)}</style>
