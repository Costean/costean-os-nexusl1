// Costean OS profiles for the stock NexusL1 firmware: Eco / Stock / Turbo operating points, derived only from what the
// firmware publishes in /api/system/asic. The firmware does not remember a "profile"; the active one is inferred from the
// applied frequency + core voltage. Pure functions, unit tested.
export const PROFILE_IDS = ['eco', 'stock', 'turbo'];
export const PROFILES = {
  eco: { label: 'Eco', blurb: 'The firmware\'s eco point: lower clock and voltage. Cooler, quieter, best efficiency.' },
  stock: { label: 'Stock', blurb: 'BitLuck\'s default operating point for the Nexus L1.' },
  turbo: { label: 'Turbo', blurb: 'One small step above stock (at most +50 MHz / +50 mV), always inside the firmware limits.' },
  custom: { label: 'Manual', blurb: 'Your own frequency and voltage from Mining & Tuning.' },
};
export const profileLabel = id => PROFILES[id]?.label || (id === 'none' ? 'No change' : id || '—');
/** Hard caps for Turbo above stock (also enforced when a schedule applies it). */
export const TURBO_MAX_MHZ = 50, TURBO_MAX_MV = 50;
const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
const opts = a => (Array.isArray(a) ? a.map(Number).filter(n => Number.isFinite(n) && n > 0) : []).sort((x, y) => x - y);

/** {eco, stock, turbo}: each {f, v} or null when the firmware does not give enough data for it. */
export function presets(asic, info) {
  const sf = num(asic?.defaultFrequency ?? info?.defaultFrequency), sv = num(asic?.defaultVoltage ?? info?.defaultCoreVoltage);
  const stock = sf && sv ? { f: sf, v: sv } : null;
  const ef = num(asic?.ecoFrequency), ev = num(asic?.ecoVoltage);
  const eco = ef && ev && (!stock || (ef <= stock.f && ev <= stock.v)) ? { f: ef, v: ev } : null;
  let turbo = null;
  if (stock) {
    const fo = opts(asic?.frequencyOptions), vo = opts(asic?.voltageOptions);
    const maxF = Math.min(stock.f + TURBO_MAX_MHZ, num(asic?.absMaxFrequency) ?? Infinity);
    const maxV = Math.min(stock.v + TURBO_MAX_MV, num(asic?.absMaxVoltage) ?? Infinity);
    // The firmware only has PLL settings for listed frequencies: Turbo must be one of them.
    const f = fo.find(o => o > stock.f && o <= maxF);
    const v = vo.length ? vo.find(o => o > stock.v && o <= maxV) ?? (stock.v <= maxV ? stock.v : null) : Math.min(stock.v + 25, maxV);
    if (f && v) turbo = { f, v };
  }
  return { eco, stock, turbo };
}
/** Is {f,v} inside what the firmware allows? Returns an error string or null. */
export function checkBounds(f, v, asic, info) {
  f = Number(f); v = Number(v);
  if (!Number.isFinite(f) || !Number.isFinite(v) || f <= 0 || v <= 0) return 'frequency and voltage must be positive numbers';
  if (asic?.absMaxFrequency && f > asic.absMaxFrequency) return `frequency ${f} MHz is above the firmware limit ${asic.absMaxFrequency} MHz`;
  if (asic?.absMaxVoltage && v > asic.absMaxVoltage) return `voltage ${v} mV is above the firmware limit ${asic.absMaxVoltage} mV`;
  if (asic?.absMinVoltage && v < asic.absMinVoltage) return `voltage ${v} mV is below the firmware limit ${asic.absMinVoltage} mV`;
  const fo = opts(asic?.frequencyOptions); if (fo.length && !fo.includes(f)) return `${f} MHz is not one of the firmware's frequency options`;
  const p = presets(asic, info);
  if (p.stock && (f > p.stock.f + TURBO_MAX_MHZ || v > p.stock.v + TURBO_MAX_MV)) return `more than +${TURBO_MAX_MHZ} MHz / +${TURBO_MAX_MV} mV above stock`;
  return null;
}
/** The profile the miner is on right now: 'eco' | 'stock' | 'turbo' | 'custom' (or null without data). */
export function matchProfile(info, asic) {
  if (!info || info.frequency == null) return null;
  const p = presets(asic, info);
  for (const id of PROFILE_IDS) if (p[id] && +info.frequency === p[id].f && +info.coreVoltage === p[id].v) return id;
  return 'custom';
}
/** PATCH body for a profile (frequency + coreVoltage) or null if unavailable / out of bounds. */
export function profilePatch(id, asic, info) {
  const p = presets(asic, info)[id]; if (!p) return null;
  return checkBounds(p.f, p.v, asic, info) ? null : { frequency: p.f, coreVoltage: p.v };
}
