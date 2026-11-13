import { api, setBase } from './api.js';
import { ask } from './confirm.svelte.js';
import { Ring, isAboveStock, outOfLimits, withPools, redact, boardTemp, realTemp, chipTemps, health } from './model.js';
import { observe, seenKey, toNum } from './blocks.js';
export const ABOVE_STOCK_PHRASE = 'ABOVE STOCK';
export const app = $state({ page: location.hash.slice(2).split('?')[0] || 'dashboard', online: false, lastOk: 0, info: null, asic: null, eth: null, www: null, toast: null, tick: 0, demo: false, blocks: null, paletteOpen: false,
  notify: localStorage.getItem('costean.notify') === '1' });
export const ring = new Ring(720);   // 1 h at 5 s
const LS = 'costean.trend';
try { const s = JSON.parse(localStorage.getItem(LS) || '[]'); if (Array.isArray(s)) s.filter(p => Date.now() - p.t < 3600e3).forEach(p => ring.push(p)); } catch { }
let timer;
export function go(p) { location.hash = '#/' + p; app.page = p; }
let lastNotify = {};
function notify(key, title, body) {
  if (!app.notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (lastNotify[key] && Date.now() - lastNotify[key] < 10 * 60e3) return; lastNotify[key] = Date.now();
  try { new Notification(title, { body, icon: 'icon.svg', tag: key }); } catch { }
}
export async function enableNotifications() {
  if (typeof Notification === 'undefined') return toast('Notifications not supported in this browser', 'err');
  const p = await Notification.requestPermission(); app.notify = p === 'granted'; localStorage.setItem('costean.notify', app.notify ? '1' : '0');
  toast(app.notify ? 'Notifications on: temperature, faults, offline' : 'Notification permission denied', app.notify ? 'ok' : 'err');
}
export function toast(msg, kind = 'ok') { app.toast = { msg, kind, id: Date.now() }; setTimeout(() => { if (app.toast && Date.now() - app.toast.id > 3500) app.toast = null; }, 3600); }
async function poll() {
  try {
    const i = await api.info(); app.info = i; app.demo = !!i.demo;
    if (!app.online) { app.online = true; loadStatic(); }
    app.lastOk = Date.now();
    ring.push({ t: Date.now(), mh: i.hashRate, mh10: i.hashRate_10m, asic: boardTemp(i), vr: realTemp(i.vrTemp), w: i.power, ct: chipTemps(i) || [], rpm: i.fanrpm, bsd: toNum(i.bestSessionDiff), pd: +i.poolDifficulty || 0, nd: +i.networkDifficulty || 0 });
    try { trackBlocks(i); } catch { }
    try { for (const c of health(i, app.asic)) if (c.level === 'crit') notify(c.title, 'Costean OS: ' + c.title, c.why); } catch { }
    if (app.tick % 6 === 0) try { localStorage.setItem(LS, JSON.stringify(ring.a)); } catch { }
  } catch { if (app.online && Date.now() - app.lastOk > 15000) { app.online = false; notify('offline', 'Costean OS offline', 'No response from ' + location.host); } }
  app.tick++;
}
/** Block Found: firmware gives counters only; remember when THIS browser saw them rise (localStorage, per miner). */
function trackBlocks(i) {
  const k = seenKey(i); let prev = app.blocks?.key === k ? app.blocks.state : null;
  if (!prev) try { prev = JSON.parse(localStorage.getItem(k) || 'null'); } catch { prev = null; }
  const st = observe(prev, i); app.blocks = { key: k, state: st };
  try { localStorage.setItem(k, JSON.stringify(st)); } catch { }
}
export function clearBlockLog() { if (!app.info) return; const k = seenKey(app.info); try { localStorage.removeItem(k); } catch { } app.blocks = null; trackBlocks(app.info); }
export async function loadStatic() {
  const [a, e, w] = await Promise.allSettled([api.asic(), api.ethernet(), api.wwwVersion()]);
  if (a.value) app.asic = a.value; if (e.value) app.eth = e.value; app.www = w.value || null;
}
export function start() { setBase(''); clearInterval(timer); poll(); timer = setInterval(poll, 5000); }
export async function refresh() { await poll(); }
/** The single write path for settings: confirm dialog (+ typed phrase above stock), then PATCH /api/system. */
export async function applySettings(patch, label, { summary = '' } = {}) {
  const i = app.info, a = app.asic;
  const lim = outOfLimits(patch.frequency ?? null, patch.coreVoltage ?? null, a);
  if (lim) { toast(lim, 'err'); return false; }
  const above = isAboveStock(patch.frequency ?? null, patch.coreVoltage ?? null, a, i);
  const r = await ask(label || 'Apply settings', { detail: (summary ? summary + '\n\n' : '') + JSON.stringify(redact(patch), null, 2), danger: above, phrase: above ? ABOVE_STOCK_PHRASE : '', otp: !!i?.otp });
  if (!r.ok) return false;
  try { await api.patchSystem(withPools(i, patch), r.totp); toast('Saved. Some changes apply after restart.'); await poll(); return true; }
  catch (e) { toast('Save failed: ' + e.message, 'err'); return false; }
}
export async function runAction(label, fn, { danger = false, detail = '' } = {}) {
  const r = await ask(label, { danger, detail, otp: !!app.info?.otp }); if (!r.ok) return false;
  try { await fn(r.totp); toast(label + ': done'); return true; } catch (e) { toast(label + ' failed: ' + e.message, 'err'); return false; }
}
