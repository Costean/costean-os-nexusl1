<script>
  // 270° neon arc gauge (own drawing): blue -> cyan gradient, tick ring, centred value.
  let { value = 0, max = 1, text = '', unit = '', sub = '', size = 230 } = $props();
  const R = 78, C = 2 * Math.PI * R, ARC = C * 0.75, uid = 'ng' + Math.random().toString(36).slice(2, 7);
  let f = $derived(Math.max(0, Math.min(1, max ? value / max : 0)));
  const pt = (fr, r) => { const a = (135 + fr * 270) * Math.PI / 180; return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]; };
</script>
<svg viewBox="0 0 200 200" width={size} height={size} class="g" role="img" aria-label="hashrate gauge">
  <defs><linearGradient id={uid} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2f7bff"/><stop offset=".6" stop-color="#8cd6ff"/><stop offset="1" stop-color="#4fe3ff"/></linearGradient></defs>
  <circle cx="100" cy="100" r={R} fill="none" stroke="#27316a" stroke-width="9" stroke-linecap="round" stroke-dasharray="{ARC} {C}" transform="rotate(135 100 100)"/>
  <circle cx="100" cy="100" r={R} fill="none" stroke="url(#{uid})" stroke-width="9" stroke-linecap="round" stroke-dasharray="{ARC * f} {C}" transform="rotate(135 100 100)" style="transition:stroke-dasharray .8s;filter:drop-shadow(0 0 6px #8cd6ffaa)"/>
  {#each Array(37) as _, i}{@const a = pt(i / 36, 64)}{@const b = pt(i / 36, i % 4 ? 68 : 71)}<line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={i / 36 <= f ? (i / 36 < .6 ? '#2f7bff' : '#4fe3ff') : '#3a468f'} stroke-width="1.4"/>{/each}
  <text x="100" y="104" text-anchor="middle" class="v">{text}</text>
  <text x="100" y="126" text-anchor="middle" class="u">{unit}</text>
  <text x="100" y="178" text-anchor="middle" class="s">{sub}</text>
</svg>
<style>.g{display:block;margin:auto}.v{font:800 40px ui-monospace,Menlo,Consolas,monospace;fill:#fff;letter-spacing:-2px}.u{font:600 12px system-ui;fill:#c3cbf0;letter-spacing:.1em}.s{font:600 11px system-ui;fill:#8d98cc;letter-spacing:.12em}</style>
