<script>
  // Health score + insights (board-level; this firmware has no per-chip readings).
  import { app, ring } from '../lib/store.svelte.js';
  import { analyze } from '../lib/insights.js';
  let h = $derived((app.tick, analyze(app.info, app.asic, ring.a)));
  const gc = s => s >= 90 ? 'var(--ok)' : s >= 75 ? 'var(--acc2)' : s >= 50 ? 'var(--warn)' : 'var(--crit)';
</script>
<section class="card c-gold ins" data-testid="insights">
  <div class="sc" style:--g={gc(h.score)}><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" class="bg"/><circle cx="32" cy="32" r="27" class="fg" stroke-dasharray="{h.score * 1.696} 999"/></svg><b>{h.score}</b><span class="eyebrow">{h.grade}</span></div>
  <div class="body"><div class="row"><h2>Health & insights</h2><span class="sp"></span>{#each h.facts || [] as f}<span class="tag">{f}</span>{/each}</div>
    {#each h.items as c}<div class="hc"><span class="dot {c.level === 'info' ? '' : c.level}"></span><div><b class={c.level === 'info' ? '' : c.level}>{c.title}</b> <span class="mute small">{c.why}</span></div></div>{/each}
    <div class="mute small">Checks the board temperature, VR, fan, input voltage, shares, pool ping/loss and hashrate stability. Score: −30 critical, −10 warning, −2 note.</div>
  </div>
</section>
<style>.ins{display:grid;grid-template-columns:110px 1fr;gap:16px;align-items:start}.sc{position:relative;display:grid;place-items:center;width:104px;height:104px}.sc svg{position:absolute;inset:0;transform:rotate(-90deg)}
.sc circle{fill:none;stroke-width:6}.sc .bg{stroke:var(--line)}.sc .fg{stroke:var(--g);stroke-linecap:round}.sc b{font:800 30px var(--mono);color:var(--g);margin-top:-8px}.sc .eyebrow{position:absolute;bottom:24px;font-size:9px}
.body{display:grid;gap:6px;min-width:0}.hc{display:grid;grid-template-columns:12px 1fr;gap:8px;align-items:baseline}.hc .dot{transform:translateY(-1px)}
@media (max-width:560px){.ins{grid-template-columns:1fr}.sc{justify-self:center}}</style>
