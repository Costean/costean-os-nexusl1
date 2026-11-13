// Command palette (Ctrl K): typed commands -> planned actions. Pure; every write still goes through the confirm dialog.
import { fanPatch, stock, isAboveStock, outOfLimits } from './model.js';
export const NAV = [
  ['dashboard', 'Dashboard', '◆'], ['mining', 'Mining & Tuning', '⛏'], ['pools', 'Pools & Stratum', '◎'], ['thermal', 'Thermal & Safe Mode', '❄'], ['block', 'Block Found', '◇'],
  ['swarm', 'Swarm', '⬡'], ['influx', 'InfluxDB & Alerts', '≋'], ['network', 'System & Network', '⌁'], ['diagnostics', 'Diagnostics & Logs', '⚙'], ['update', 'Update & Recovery', '⟳'],
];
/** returns {kind:'nav'|'write'|'action'|'ui', label, ...} or null. i = /api/system/info, a = /api/system/asic */
export function parse(input, i, a) {
  const q = input.trim().toLowerCase(); if (!q) return null; let m;
  for (const [id, label] of NAV) if (q === id || q === label.toLowerCase() || q === 'go ' + id || q === 'open ' + id) return { kind: 'nav', label: 'Open ' + label, to: id };
  if ((m = q.match(/^(?:set )?fans? (?:to )?(\d{1,3})\s*%?$/))) { const v = Math.min(100, Math.max(20, +m[1])); return write(`Set fan to manual ${v}%`, fanPatch(i, { mode: 0, manual: v }), i, a); }
  if (/^(?:set )?fans? (?:to )?auto/.test(q)) return write('Set fan to automatic (PID)', fanPatch(i, { mode: 2 }), i, a);
  if ((m = q.match(/^(?:set )?(?:freq|frequency) (?:to )?(\d+)/))) return write(`Set ASIC frequency ${+m[1]} MHz`, { frequency: +m[1] }, i, a);
  if ((m = q.match(/^(?:set )?(?:volt|voltage|core ?voltage) (?:to )?(\d+)/))) return write(`Set core voltage ${+m[1]} mV`, { coreVoltage: +m[1] }, i, a);
  if ((m = q.match(/^(?:set )?(?:target ?temp|pid ?temp) (?:to )?(\d+)/))) return write(`Set fan PID target ${+m[1]} °C`, fanPatch(i, { mode: 2, target: +m[1] }), i, a);
  if (/^(stock|default|safe) ?(mode|settings|tune|start)?$/.test(q)) { const s = stock(a, i); return s.f && s.v ? write(`Apply stock ${s.f} MHz / ${s.v} mV`, { frequency: s.f, coreVoltage: s.v }, i, a) : null; }
  if (/^eco ?(mode)?$/.test(q)) return a?.ecoFrequency ? write(`Apply eco ${a.ecoFrequency} MHz / ${a.ecoVoltage} mV`, { frequency: a.ecoFrequency, coreVoltage: a.ecoVoltage }, i, a) : null;
  if ((m = q.match(/^hostname (.+)$/))) return write(`Set hostname to "${input.trim().slice(9)}"`, { hostname: input.trim().slice(9) }, i, a);
  if (/^(flip|rotate) ?screen/.test(q)) return write('Toggle screen flip', { flipscreen: !(i?.flipscreen == 1) }, i, a);
  if (/^restart|^reboot/.test(q)) return { kind: 'action', label: 'Restart miner', action: 'restart' };
  if (/^shut ?down|^stop mining/.test(q)) return { kind: 'action', label: 'Shut down ASICs', action: 'shutdown', danger: true };
  if (/^reset stats/.test(q)) return { kind: 'action', label: 'Reset statistics', action: 'resetStats' };
  if (/^(backup|export)/.test(q)) return { kind: 'ui', label: 'Download settings backup (JSON)', action: 'backup' };
  if (/^notif/.test(q)) return { kind: 'ui', label: 'Enable browser notifications', action: 'notify' };
  if (/^test alert/.test(q)) return { kind: 'action', label: 'Send test alert', action: 'testAlert' };
  for (const [id, label] of NAV) if (label.toLowerCase().includes(q) || id.startsWith(q)) return { kind: 'nav', label: 'Open ' + label, to: id };
  return null;
}
function write(label, patch, i, a) {
  return { kind: 'write', label, patch, aboveStock: !!isAboveStock(patch.frequency ?? null, patch.coreVoltage ?? null, a, i), blocked: outOfLimits(patch.frequency ?? null, patch.coreVoltage ?? null, a) };
}
export const suggestions = ['stock', 'eco', 'fans auto', 'fans 80%', 'frequency 1200', 'restart', 'backup', 'test alert', 'notifications', 'block', 'thermal', 'pools'];
