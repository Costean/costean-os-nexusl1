// Browser-side schedules for the stock NexusL1 firmware. The firmware has no scheduler and no time-zone setting, so the
// open Costean OS page evaluates the windows and sends normal settings PATCHes. Pure functions, unit tested.
import { profilePatch, profileLabel, presets } from './profiles.js';
export const DEFAULT_TZ = 'America/New_York';
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const ALL_DAYS = 0x7f, WEEKDAYS = 0x3e, WEEKEND = 0x41;
export const MAX_WINDOWS = 8, MIN_WINDOW_MIN = 15;
/** Stock firmware screen control is one switch: `autoscreenoff`. There is no brightness / dim setting for the LCD. */
export const SCREEN_MODES = [['keep', 'No change'], ['on', 'Screen stays on'], ['autooff', 'Auto screen-off']];
export const screenLabel = s => (SCREEN_MODES.find(m => m[0] === s) || [, '—'])[1];
const RANK = { eco: 1, stock: 2, turbo: 3 };

export const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export function parseHHMM(s) { const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(s || ''); if (!m) return null; const h = +m[1], mi = +m[2]; return h < 24 && mi < 60 ? h * 60 + mi : null; }
export function daysLabel(mask) {
  mask &= 0x7f; if (mask === ALL_DAYS) return 'Every day'; if (mask === WEEKDAYS) return 'Mon–Fri'; if (mask === WEEKEND) return 'Sat–Sun'; if (!mask) return 'Never';
  return DAYS.filter((_, i) => mask & (1 << i)).join(', ');
}
export const toggleDay = (mask, i) => (mask ^ (1 << i)) & 0x7f;
export const allDay = w => w.start === w.end;
export const windowMinutes = w => allDay(w) ? 1440 : w.end > w.start ? w.end - w.start : 1440 - w.start + w.end;

export const blankSchedule = () => ({ v: 1, enabled: false, tz: DEFAULT_TZ, base: 'none', baseScreen: 'keep', windows: [] });
export const blankWindow = () => ({ on: true, name: 'Quiet night', days: ALL_DAYS, start: 23 * 60, end: 7 * 60, profile: 'eco', screen: 'autooff' });

const fmts = new Map();
export function validTz(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } }
/** Wall-clock weekday (0 = Sun) and minute of the day at `date` in time zone `tz` (DST handled by the browser's tz data). */
export function localParts(date, tz = DEFAULT_TZ) {
  let f = fmts.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); fmts.set(tz, f); }
  const p = {}; for (const x of f.formatToParts(date)) p[x.type] = x.value;
  const h = +p.hour % 24, mi = +p.minute;
  return { wd: DAYS.indexOf(p.weekday), min: h * 60 + mi, date: `${p.year}-${p.month}-${p.day}`, label: `${p.weekday} ${String(h).padStart(2, '0')}:${p.minute}` };
}
/** Is window w active at local weekday wd / minute min? Overnight windows belong to the day they start. start == end = all day. */
export function activeAt(w, wd, min) {
  if (!w?.on) return false; const d = k => !!(w.days & (1 << ((k + 7) % 7)));
  if (allDay(w)) return d(wd);
  if (w.end > w.start) return d(wd) && min >= w.start && min < w.end;
  return (d(wd) && min >= w.start) || (d(wd - 1) && min < w.end);
}
/** What the schedule wants at a local time. Overlaps: the lowest-power profile wins, auto screen-off beats screen-on. */
export function resolve(s, wd, min) {
  let profile = null, screen = null, pw = -1, sw = -1;
  (s?.windows || []).forEach((w, k) => {
    if (!activeAt(w, wd, min)) return;
    if (w.profile && w.profile !== 'none' && (profile == null || RANK[w.profile] < RANK[profile])) { profile = w.profile; pw = k; }
    if (w.screen === 'autooff' && screen !== 'autooff') { screen = 'autooff'; sw = k; }
    else if (w.screen === 'on' && screen == null) { screen = 'on'; sw = k; }
  });
  if (profile == null && s?.base && s.base !== 'none') profile = s.base;
  if (screen == null && s?.baseScreen && s.baseScreen !== 'keep') screen = s.baseScreen;
  return { profile, screen, profileWindow: pw, screenWindow: sw };
}
export const targetAt = (s, date) => { const lp = localParts(date, s?.tz || DEFAULT_TZ); return { ...resolve(s, lp.wd, lp.min), local: lp }; };
export const targetKey = t => `${t?.profile || '-'}|${t?.screen || '-'}`;
export function describeTarget(t, asic, info) {
  const parts = [];
  if (t.profile) { const p = presets(asic, info)[t.profile]; parts.push(profileLabel(t.profile) + (p ? ` ${p.f} MHz / ${p.v} mV` : ' (not available)')); }
  if (t.screen) parts.push(screenLabel(t.screen).toLowerCase());
  return parts.length ? parts.join(', ') : 'no change';
}
/** First minute after `from` (within maxDays) where the wanted state changes. Returns {at: Date, target} or null. */
export function nextChange(s, from, maxDays = 8) {
  if (!s?.enabled) return null;
  const start = new Date(Math.floor(from.getTime() / 60000) * 60000);
  const cur = targetKey(targetAt(s, from));
  for (let k = 1; k <= maxDays * 1440; k++) {
    const t = new Date(start.getTime() + k * 60000), tg = targetAt(s, t);
    if (targetKey(tg) !== cur) return { at: t, target: tg };
  }
  return null;
}
/** 7x24 grid for the week view: cell = {profile, screen} at the middle of each local hour, or null. */
export function weekGrid(s) {
  return DAYS.map((_, d) => Array.from({ length: 24 }, (_, h) => { const r = resolve({ ...s, base: 'none', baseScreen: 'keep' }, d, h * 60 + 30); return r.profile || r.screen ? r : null; }));
}
/** Error string or null. */
export function validateSchedule(s) {
  if (!s || typeof s !== 'object') return 'not a schedule';
  if (!validTz(s.tz)) return `unknown time zone "${s.tz}"`;
  if (!['none', 'eco', 'stock', 'turbo'].includes(s.base)) return 'outside-window profile must be none, eco, stock or turbo';
  if (!['keep', 'on', 'autooff'].includes(s.baseScreen)) return 'outside-window screen must be keep, on or autooff';
  if (!Array.isArray(s.windows)) return 'windows must be a list';
  if (s.windows.length > MAX_WINDOWS) return `at most ${MAX_WINDOWS} windows`;
  for (let i = 0; i < s.windows.length; i++) {
    const w = s.windows[i], n = `Window ${i + 1}: `;
    if (![w.start, w.end].every(x => Number.isInteger(x) && x >= 0 && x < 1440)) return n + 'times must be 00:00–23:59';
    if (!(w.days & 0x7f)) return n + 'pick at least one day';
    if (!['none', 'eco', 'stock', 'turbo'].includes(w.profile)) return n + 'unknown profile';
    if (!['keep', 'on', 'autooff'].includes(w.screen)) return n + 'unknown screen mode';
    if (w.profile === 'none' && w.screen === 'keep') return n + 'changes nothing: pick a profile or a screen mode';
    if (!allDay(w) && windowMinutes(w) < MIN_WINDOW_MIN) return n + `must be at least ${MIN_WINDOW_MIN} minutes long`;
    if (String(w.name || '').length > 24) return n + 'name is at most 24 characters';
  }
  return null;
}
/** Import: accept an exported file ({costeanSchedule: …}) or a bare schedule; returns a clean copy or throws. */
export function normalizeSchedule(o) {
  const s = o?.costeanSchedule ?? o;
  const out = { v: 1, enabled: !!s?.enabled, tz: String(s?.tz || DEFAULT_TZ), base: s?.base ?? 'none', baseScreen: s?.baseScreen ?? 'keep',
    windows: (Array.isArray(s?.windows) ? s.windows : []).map(w => ({ on: w.on !== false, name: String(w.name ?? '').slice(0, 24), days: (+w.days) & 0x7f, start: +w.start, end: +w.end, profile: w.profile ?? 'none', screen: w.screen ?? (w.lcd === 'off' ? 'autooff' : 'keep') })) };
  const e = validateSchedule(out); if (e) throw new Error(e); return out;
}
export const exportSchedule = (s, info) => ({ costeanSchedule: s, device: info?.deviceModel || 'NexusL1', exported: new Date().toISOString() });
export const usesTurbo = s => s.base === 'turbo' || s.windows.some(w => w.on && w.profile === 'turbo');
/**
 * The scheduler step. Pure: decides what the open page should do now.
 * last = key of the state the page last applied (so a manual change on the miner is not undone until the next window edge).
 * Returns {type:'none'} | {type:'mark', key, target, note} | {type:'patch', key, target, patch} | {type:'error', key, target, note}
 */
export function decide({ sched, now, info, asic, last }) {
  if (!sched?.enabled || !info) return { type: 'none' };
  const target = targetAt(sched, now), key = targetKey(target);
  if (key === last) return { type: 'none', key, target };
  if (!target.profile && !target.screen) return { type: 'mark', key, target, note: 'no change wanted' };
  const patch = {};
  if (target.profile) {
    const pp = profilePatch(target.profile, asic, info);
    if (!pp) return { type: 'error', key, target, note: `${profileLabel(target.profile)} is not available or outside the firmware limits; nothing sent` };
    if (+info.frequency !== pp.frequency || +info.coreVoltage !== pp.coreVoltage) Object.assign(patch, pp);
  }
  if (target.screen) { const want = target.screen === 'autooff'; if ((info.autoscreenoff == 1) !== want) patch.autoscreenoff = want; }
  if (!Object.keys(patch).length) return { type: 'mark', key, target, note: 'miner already matches' };
  return { type: 'patch', key, target, patch };
}
