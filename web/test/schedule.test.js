import { describe, it, expect } from 'vitest';
import { activeAt, resolve, localParts, targetAt, nextChange, decide, validateSchedule, normalizeSchedule, weekGrid, blankSchedule, blankWindow, parseHHMM, hhmm, daysLabel, toggleDay, windowMinutes, usesTurbo, WEEKDAYS, WEEKEND, ALL_DAYS, targetKey } from '../src/lib/schedule.js';
const asic = { defaultFrequency: 1300, defaultVoltage: 1300, absMaxFrequency: 1500, absMinVoltage: 1100, absMaxVoltage: 1400, ecoFrequency: 1100, ecoVoltage: 1200, frequencyOptions: [1000, 1100, 1200, 1300, 1350, 1400], voltageOptions: [1150, 1200, 1250, 1300, 1350, 1400] };
const info = { frequency: 1300, coreVoltage: 1300, autoscreenoff: 0 };
const W = (o) => ({ on: true, name: 'w', days: ALL_DAYS, start: 0, end: 60, profile: 'eco', screen: 'keep', ...o });
const S = (windows, o = {}) => ({ ...blankSchedule(), enabled: true, windows, ...o });
const NY = 'America/New_York';
const at = iso => new Date(iso);

describe('time helpers', () => {
  it('parses and formats HH:MM', () => { expect(parseHHMM('07:30')).toBe(450); expect(parseHHMM('24:00')).toBe(null); expect(parseHHMM('7:5')).toBe(null); expect(hhmm(1439)).toBe('23:59'); });
  it('labels days', () => { expect(daysLabel(ALL_DAYS)).toBe('Every day'); expect(daysLabel(WEEKDAYS)).toBe('Mon–Fri'); expect(daysLabel(WEEKEND)).toBe('Sat–Sun'); expect(daysLabel(toggleDay(0, 3))).toBe('Wed'); expect(daysLabel(0)).toBe('Never'); });
  it('window length incl. overnight and all-day', () => { expect(windowMinutes(W({ start: 23 * 60, end: 7 * 60 }))).toBe(480); expect(windowMinutes(W({ start: 600, end: 600 }))).toBe(1440); });
  it('localParts in New York (EST and EDT)', () => {
    expect(localParts(at('2026-01-15T12:00:00Z'), NY)).toMatchObject({ wd: 4, min: 7 * 60, date: '2026-01-15' });   // UTC-5
    expect(localParts(at('2026-07-15T12:00:00Z'), NY)).toMatchObject({ wd: 3, min: 8 * 60 });                         // UTC-4
    expect(localParts(at('2026-01-15T04:30:00Z'), NY)).toMatchObject({ wd: 3, min: 23 * 60 + 30, date: '2026-01-14' }); // previous local day
    expect(localParts(at('2026-01-15T05:00:00Z'), NY).min).toBe(0);                                                     // midnight is 00, not 24
  });
});
describe('window matching', () => {
  it('same-day window, days mask, end exclusive', () => {
    const w = W({ days: WEEKDAYS, start: 9 * 60, end: 17 * 60 });
    expect(activeAt(w, 1, 9 * 60)).toBe(true); expect(activeAt(w, 1, 17 * 60)).toBe(false); expect(activeAt(w, 1, 8 * 60 + 59)).toBe(false);
    expect(activeAt(w, 0, 12 * 60)).toBe(false); expect(activeAt(w, 6, 12 * 60)).toBe(false);
  });
  it('overnight window belongs to its start day', () => {
    const w = W({ days: 1 << 5, start: 23 * 60, end: 7 * 60 }); // Friday night only
    expect(activeAt(w, 5, 23 * 60 + 30)).toBe(true); expect(activeAt(w, 6, 6 * 60)).toBe(true);  // Sat early morning
    expect(activeAt(w, 6, 7 * 60)).toBe(false); expect(activeAt(w, 5, 6 * 60)).toBe(false);      // Fri early morning is Thursday's night
    expect(activeAt(W({ days: 1 << 6, start: 22 * 60, end: 2 * 60 }), 0, 60)).toBe(true);         // Sat night wraps into Sunday
  });
  it('all-day window (start == end) and disabled windows', () => {
    expect(activeAt(W({ days: WEEKEND, start: 0, end: 0 }), 0, 1439)).toBe(true); expect(activeAt(W({ days: WEEKEND, start: 0, end: 0 }), 1, 0)).toBe(false);
    expect(activeAt(W({ on: false }), 1, 10)).toBe(false);
  });
});
describe('overlap precedence', () => {
  it('lowest-power profile wins; auto screen-off beats screen on; base fills gaps', () => {
    const s = S([W({ start: 0, end: 600, profile: 'turbo', screen: 'on' }), W({ start: 300, end: 400, profile: 'eco', screen: 'autooff' }), W({ start: 350, end: 500, profile: 'stock', screen: 'on' })], { base: 'stock', baseScreen: 'on' });
    expect(resolve(s, 1, 100)).toMatchObject({ profile: 'turbo', screen: 'on', profileWindow: 0 });
    expect(resolve(s, 1, 360)).toMatchObject({ profile: 'eco', screen: 'autooff', profileWindow: 1, screenWindow: 1 });
    expect(resolve(s, 1, 450)).toMatchObject({ profile: 'stock', screen: 'on' });
    expect(resolve(s, 1, 700)).toMatchObject({ profile: 'stock', screen: 'on', profileWindow: -1 });
  });
  it('a screen-only window leaves the profile to the base', () => {
    const s = S([W({ profile: 'none', screen: 'autooff', start: 0, end: 600 })], { base: 'none' });
    expect(resolve(s, 2, 10)).toMatchObject({ profile: null, screen: 'autooff' });
  });
});
describe('DST (America/New_York 2026: Mar 8 spring forward, Nov 1 fall back)', () => {
  const s = S([W({ start: 2 * 60 + 30, end: 3 * 60, profile: 'eco' }), W({ name: 'b', start: 7 * 60, end: 8 * 60, profile: 'stock' })]);
  it('a window inside the skipped hour is not active on spring-forward day; normal days are', () => {
    // 2026-03-08 06:59Z = 01:59 EST; 07:00Z = 03:00 EDT (02:00–02:59 does not exist)
    expect(targetAt(s, at('2026-03-08T06:59:00Z')).local.min).toBe(119);
    expect(targetAt(s, at('2026-03-08T07:00:00Z')).local.min).toBe(180);
    expect(targetAt(s, at('2026-03-07T07:30:00Z')).profile).toBe('eco'); // 02:30 EST the day before
    // On spring-forward day the next change after 01:59 is 07:00 EDT (stock), the 02:30 window is skipped
    const n = nextChange(s, at('2026-03-08T06:59:00Z'));
    expect(n.target.profile).toBe('stock'); expect(n.at.toISOString()).toBe('2026-03-08T11:00:00.000Z');
  });
  it('a window starting in the skipped hour but ending after it takes effect at 03:00', () => {
    const s2 = S([W({ start: 2 * 60 + 30, end: 4 * 60, profile: 'eco' })]);
    const n = nextChange(s2, at('2026-03-08T06:50:00Z'));
    expect(n.target.profile).toBe('eco'); expect(n.at.toISOString()).toBe('2026-03-08T07:00:00.000Z'); expect(n.target.local.min).toBe(180);
  });
  it('fall back: the repeated 01:xx hour matches twice', () => {
    const s3 = S([W({ start: 60 + 15, end: 60 + 45, profile: 'eco' })]);
    expect(targetAt(s3, at('2026-11-01T05:20:00Z')).profile).toBe('eco');  // 01:20 EDT
    expect(targetAt(s3, at('2026-11-01T06:20:00Z')).profile).toBe('eco');  // 01:20 EST (again)
    expect(targetAt(s3, at('2026-11-01T05:50:00Z')).profile).toBe(null);   // 01:50 EDT
    const n = nextChange(s3, at('2026-11-01T05:50:00Z'));
    expect(n.at.toISOString()).toBe('2026-11-01T06:15:00.000Z');
  });
  it('wall-clock times stay put across the DST change (07:00 local in winter and summer)', () => {
    expect(targetAt(s, at('2026-01-05T12:30:00Z')).profile).toBe('stock'); // 07:30 EST
    expect(targetAt(s, at('2026-07-06T11:30:00Z')).profile).toBe('stock'); // 07:30 EDT
  });
  it('other time zones', () => {
    const s4 = { ...s, tz: 'Europe/London' };
    expect(targetAt(s4, at('2026-01-05T07:30:00Z')).profile).toBe('stock');
    expect(targetAt({ ...s, tz: 'UTC' }, at('2026-01-05T07:30:00Z')).profile).toBe('stock');
  });
});
describe('nextChange / weekGrid', () => {
  it('finds the next edge, null when disabled or constant', () => {
    const s = S([W({ days: WEEKDAYS, start: 9 * 60, end: 17 * 60, profile: 'eco' })]);
    const n = nextChange(s, at('2026-11-24T13:00:00Z')); // Tue 08:00 EST
    expect(n.at.toISOString()).toBe('2026-11-24T14:00:00.000Z'); expect(n.target.profile).toBe('eco');
    expect(nextChange({ ...s, enabled: false }, new Date())).toBe(null);
    expect(nextChange(S([W({ start: 0, end: 0 })]), new Date())).toBe(null);
  });
  it('grid marks windows by local hour', () => {
    const g = weekGrid(S([blankWindow()]));
    expect(g[1][23].profile).toBe('eco'); expect(g[1][6].screen).toBe('autooff'); expect(g[1][12]).toBe(null);
  });
});
describe('validate / import', () => {
  it('rejects bad schedules', () => {
    expect(validateSchedule(S([]))).toBe(null);
    expect(validateSchedule(S([], { tz: 'Mars/Base' }))).toMatch(/time zone/);
    expect(validateSchedule(S([W({ days: 0 })]))).toMatch(/at least one day/);
    expect(validateSchedule(S([W({ start: 1440 })]))).toMatch(/00:00/);
    expect(validateSchedule(S([W({ start: 60, end: 70 })]))).toMatch(/15 minutes/);
    expect(validateSchedule(S([W({ profile: 'none', screen: 'keep' })]))).toMatch(/changes nothing/);
    expect(validateSchedule(S([W({ profile: 'overclock' })]))).toMatch(/unknown profile/);
    expect(validateSchedule(S(Array(9).fill(0).map(() => W())))).toMatch(/at most 8/);
  });
  it('normalizes an exported file and throws on garbage', () => {
    const s = normalizeSchedule({ costeanSchedule: S([W({ name: 'x'.repeat(40), days: 0xff })]) });
    expect(s.windows[0].name.length).toBe(24); expect(s.windows[0].days).toBe(0x7f);
    expect(() => normalizeSchedule({ tz: 'nope' })).toThrow(); expect(normalizeSchedule({}).tz).toBe(NY);
  });
  it('detects turbo use', () => { expect(usesTurbo(S([W({ profile: 'turbo' })]))).toBe(true); expect(usesTurbo(S([W({ profile: 'turbo', on: false })]))).toBe(false); expect(usesTurbo(S([], { base: 'turbo' }))).toBe(true); });
});
describe('decide (scheduler step)', () => {
  const s = S([W({ start: 0, end: 0, profile: 'eco', screen: 'autooff' })]);
  const now = at('2026-11-24T15:00:00Z');
  it('does nothing when disabled or already applied', () => {
    expect(decide({ sched: { ...s, enabled: false }, now, info, asic }).type).toBe('none');
    const k = targetKey(targetAt(s, now)); expect(decide({ sched: s, now, info, asic, last: k }).type).toBe('none');
  });
  it('patches only what differs', () => {
    const d = decide({ sched: s, now, info, asic, last: null });
    expect(d).toMatchObject({ type: 'patch', patch: { frequency: 1100, coreVoltage: 1200, autoscreenoff: true } });
    expect(decide({ sched: s, now, info: { ...info, frequency: 1100, coreVoltage: 1200 }, asic }).patch).toEqual({ autoscreenoff: true });
    expect(decide({ sched: s, now, info: { frequency: 1100, coreVoltage: 1200, autoscreenoff: 1 }, asic }).type).toBe('mark');
  });
  it('turbo stays within +50 MHz / +50 mV and firmware options', () => {
    const d = decide({ sched: S([W({ start: 0, end: 0, profile: 'turbo' })]), now, info, asic });
    expect(d.patch).toEqual({ frequency: 1350, coreVoltage: 1350 });
  });
  it('refuses a profile the firmware cannot provide', () => {
    const d = decide({ sched: S([W({ start: 0, end: 0, profile: 'turbo' })]), now, info, asic: { ...asic, frequencyOptions: [1000, 1300], absMaxFrequency: 1300 } });
    expect(d.type).toBe('error'); expect(d.patch).toBeUndefined();
    expect(decide({ sched: S([W({ start: 0, end: 0, profile: 'eco' })]), now, info, asic: { ...asic, ecoFrequency: undefined } }).type).toBe('error');
  });
  it('no wanted change -> mark', () => { expect(decide({ sched: S([W({ days: 1 << 0, start: 0, end: 60 })]), now, info, asic }).type).toBe('mark'); });
});
