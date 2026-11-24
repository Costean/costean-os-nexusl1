import { api, setBase } from './api.js';
import { ask } from './confirm.svelte.js';
import { Ring, isAboveStock, outOfLimits, withPools, redact, boardTemp, realTemp, chipTemps, health } from './model.js';
import { observe, seenKey, toNum } from './blocks.js';
import { decide, nextChange, blankSchedule, normalizeSchedule, usesTurbo, describeTarget, targetKey } from './schedule.js';
import { addSample, prune, mergeDevice, deviceHistory, lastAbsTs, DEVICE_SPAN_MS } from './history.js';
export const ABOVE_STOCK_PHRASE = 'ABOVE STOCK';
export const app = $state({ page: location.hash.slice(2).split('?')[0] || 'dashboard', online: false, lastOk: 0, info: null, asic: null, eth: null, www: null, toast: null, tick: 0, demo: false, blocks: null, paletteOpen: false, sched: null, schedLog: [], schedNext: null, schedLeader: false, schedNote: '', hist: [], histDevice: [], histDeviceAt: 0,
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
    try { recordHistory(i); } catch { }
    try { await schedTick(i); } catch (e) { schedLogAdd('error', 'Scheduler error: ' + e.message); }
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

// ---------- per-miner browser storage ----------
const minerId = i => String(i?.macAddr || i?.hostname || 'miner').replace(/[^\w:.-]/g, '');
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

// ---------- browser-kept history (15-min averages, 30 days) ----------
let histLoadedFor = null, lastHistSave = 0;
function histKey(i) { return 'costean.hist.' + minerId(i); }
function recordHistory(i) {
  if (histLoadedFor !== minerId(i)) { app.hist = lsGet(histKey(i), []); histLoadedFor = minerId(i); }
  const h = app.hist; addSample(h, { t: Date.now(), mh: i.hashRate, asic: boardTemp(i), vr: realTemp(i.vrTemp), w: i.power });
  if (Date.now() - lastHistSave > 60e3) { app.hist = prune(h, Date.now()); lsSet(histKey(i), app.hist); lastHistSave = Date.now(); }
}
/** Pull the miner's own history (up to 3 h, PSRAM) and fold anything this browser has not seen into the 30-day store. */
export async function loadDeviceHistory() {
  const i = app.info; if (!i) return;
  const pts = []; let ts = Date.now() - DEVICE_SPAN_MS;
  for (let n = 0; n < 12; n++) {          // the firmware pages long answers with hasMore
    const r = await api.infoHistory(ts); const h = r?.history; if (!h) break;
    pts.push(...deviceHistory(h)); const last = lastAbsTs(h); if (!h.hasMore || last == null || last + 1 <= ts) break; ts = last + 1;
  }
  const seen = new Map(); for (const p of pts) seen.set(p.t, p);
  app.histDevice = [...seen.values()].sort((a, b) => a.t - b.t); app.histDeviceAt = Date.now();
  if (histLoadedFor !== minerId(i)) { app.hist = lsGet(histKey(i), []); histLoadedFor = minerId(i); }
  const firstLive = app.hist.length ? app.hist[app.hist.length - 1].t + 15 * 60e3 : 0;
  app.hist = prune(mergeDevice(app.hist, app.histDevice.filter(p => p.t >= firstLive)), Date.now()); lsSet(histKey(i), app.hist);
}
export function clearBrowserHistory() { if (!app.info) return; app.hist = []; lsSet(histKey(app.info), []); }

// ---------- schedules (run by this page; the firmware has no scheduler) ----------
const TAB = Math.random().toString(36).slice(2), LEADER = 'costean.sched.leader';
let schedFor = null, schedLast = null, retryAt = 0, lastErr = '', nextMin = -1;
const sk = (i, s) => `costean.schedule.${s}.` + minerId(i);
export function loadSchedule(i = app.info) {
  if (!i || schedFor === minerId(i)) return; schedFor = minerId(i);
  let s = lsGet(sk(i, 'cfg'), null); try { s = s ? normalizeSchedule(s) : blankSchedule(); } catch { s = blankSchedule(); }
  app.sched = s; app.schedLog = lsGet(sk(i, 'log'), []); schedLast = lsGet(sk(i, 'last'), null); nextMin = -1;
}
export function schedLogAdd(kind, msg) {
  const i = app.info; if (!i) return; const e = { t: Date.now(), kind, msg };
  app.schedLog = [e, ...(app.schedLog || [])].slice(0, 100); lsSet(sk(i, 'log'), app.schedLog);
}
export function clearSchedLog() { if (!app.info) return; app.schedLog = []; lsSet(sk(app.info, 'log'), []); }
/** One browser tab per browser runs the schedule (heartbeat in localStorage). Other devices: writes are idempotent. */
function claimLeader() {
  const now = Date.now(); const l = lsGet(LEADER, null);
  if (!l || l.id === TAB || now - l.ts > 20e3) { lsSet(LEADER, { id: TAB, ts: now }); return true; }
  return false;
}
async function schedTick(i) {
  loadSchedule(i); const s = app.sched; if (!s) return;
  const now = new Date(); const m = Math.floor(now.getTime() / 60e3);
  if (m !== nextMin) { nextMin = m; app.schedNext = s.enabled ? nextChange(s, now) : null; }
  if (!s.enabled) { app.schedLeader = false; app.schedNote = 'Schedules are off.'; return; }
  app.schedLeader = claimLeader();
  if (!app.schedLeader) { app.schedNote = 'Another tab of this browser is running the schedule.'; return; }
  app.schedNote = 'This tab is running the schedule.';
  if (Date.now() < retryAt) return;
  const d = decide({ sched: s, now, info: i, asic: app.asic, last: schedLast });
  if (d.type === 'none') return;
  const what = describeTarget(d.target, app.asic, i);
  const setLast = () => { schedLast = d.key; lsSet(sk(i, 'last'), schedLast); };
  if (d.type === 'mark') { setLast(); schedLogAdd('info', `${d.target.local.label}: wanted ${what} (${d.note})`); return; }
  if (d.type === 'error') { if (lastErr !== d.note) schedLogAdd('error', d.note); lastErr = d.note; retryAt = Date.now() + 60e3; return; }
  if (i.otp && !sessionStorage.getItem('costean.otpSession')) { const n = 'OTP is enabled: open an OTP session on Update & Recovery so this page may write settings.'; if (lastErr !== n) schedLogAdd('error', n); lastErr = n; retryAt = Date.now() + 60e3; return; }
  try {
    await api.patchSystem(withPools(i, d.patch)); setLast(); lastErr = '';
    schedLogAdd('applied', `${d.target.local.label}: applied ${what} → ${JSON.stringify(d.patch)}`);
    toast('Schedule applied: ' + what);
  } catch (e) { const n = 'Could not apply ' + what + ': ' + e.message; if (lastErr !== n) schedLogAdd('error', n + ' (retrying every minute)'); lastErr = n; retryAt = Date.now() + 60e3; }
}
/** Save the schedule in this browser (confirm dialog; Turbo needs the typed phrase). Resets the applied state so it takes effect now. */
export async function saveSchedule(s, label = 'Save schedule') {
  const i = app.info; if (!i) return false;
  const turbo = usesTurbo(s);
  const r = await ask(label, { detail: 'Stored in this browser (localStorage) for ' + (i.hostname || 'this miner') + '. Runs only while a Costean OS tab is open.\n\n' + JSON.stringify(s, null, 2), danger: turbo, phrase: turbo ? ABOVE_STOCK_PHRASE : '' });
  if (!r.ok) return false;
  app.sched = JSON.parse(JSON.stringify(s)); lsSet(sk(i, 'cfg'), app.sched); schedLast = null; lsSet(sk(i, 'last'), null); retryAt = 0; nextMin = -1;
  schedLogAdd('info', `Schedule saved (${s.enabled ? 'on' : 'off'}, ${s.windows.length} window${s.windows.length === 1 ? '' : 's'}, ${s.tz})`);
  toast('Schedule saved'); await poll(); return true;
}
export const schedTargetKey = targetKey;
