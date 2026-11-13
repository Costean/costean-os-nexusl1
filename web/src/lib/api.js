// Thin client for the stock BitLuck Nexus v1.0.4.4 REST API (NerdQAxe+-derived /api/system/* v1 API).
// Only endpoints present in the stock nexus.v1.0.4.4 firmware binary are used.
let base = '';
export const setBase = b => { base = b || ''; };
export const getBase = () => base;
const SESSION_KEY = 'costean.otpSession';
const otpHeaders = totp => { const h = {}; if (totp) h['X-TOTP'] = totp; const s = sessionStorage.getItem(SESSION_KEY); if (s) h['X-OTP-Session'] = s; return h; };
async function req(method, path, body, { totp, timeout = 8000, headers = {} } = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(base + path, { method, signal: ctl.signal, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? otpHeaders(totp) : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { const txt = await r.text().catch(() => ''); const e = new Error(`${r.status} ${txt || r.statusText}`); e.status = r.status; throw e; }
    const txt = await r.text();
    try { return txt ? JSON.parse(txt) : null; } catch { return txt; }
  } finally { clearTimeout(t); }
}
export const api = {
  info: () => req('GET', '/api/system/info'),
  asic: () => req('GET', '/api/system/asic'),
  ethernet: () => req('GET', '/api/system/ethernet/status'),
  patchSystem: (p, totp) => req('PATCH', '/api/system', p, { totp }),
  restart: totp => req('POST', '/api/system/restart', null, { totp }),
  shutdown: totp => req('POST', '/api/system/shutdown', null, { totp }),
  resetStats: totp => req('POST', '/api/system/reset-stats', null, { totp }),
  githubOta: (url, keepConfig, totp) => req('POST', '/api/system/OTA/github', { url, keep_config: keepConfig }, { totp }),
  githubOtaStatus: () => req('GET', '/api/system/OTA/github'),
  alertInfo: () => req('GET', '/api/alert/info'),
  // stock UI: POST /api/alert/update {alertDiscord*Enable, showBlockFoundScreenEnable, alertDiscordWebhook only when changed}
  updateAlert: (p, totp) => req('POST', '/api/alert/update', p, { totp }),
  testAlert: totp => req('POST', '/api/alert/test', {}, { totp, headers: totp ? { 'X-OTP-Code': totp } : {} }),
  // stock UI: GET /api/influx/info, PATCH /api/influx {influxURL, influxPort, influxBucket, influxOrg, influxPrefix, influxEnable, influxToken only when changed}
  influxInfo: () => req('GET', '/api/influx/info'),
  updateInflux: (p, totp) => req('PATCH', '/api/influx', p, { totp }),
  otpEnroll: () => req('POST', '/api/otp', {}),
  otpSet: (enabled, totp) => req('PATCH', '/api/otp', { enabled }, { totp }),
  otpStatus: () => req('GET', '/api/otp/status'),
  otpSession: async totp => { const r = await req('POST', '/api/otp/session', {}, { totp }); if (r?.token) sessionStorage.setItem(SESSION_KEY, r.token); return r; },
  wwwVersion: () => fetch(base + '/version.json', { cache: 'no-store' }).then(r => r.ok ? r.text() : null).then(t => { try { return t ? JSON.parse(t) : null; } catch { return null; } }).catch(() => null),
};
/** Raw OTA upload with progress via XHR. kind: 'firmware' | 'www' */
export function upload(kind, file, onProgress, totp) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest(); x.open('POST', base + (kind === 'www' ? '/api/system/OTAWWW' : '/api/system/OTA'));
    x.setRequestHeader('Content-Type', 'application/octet-stream');
    for (const [k, v] of Object.entries(otpHeaders(totp))) x.setRequestHeader(k, v);
    x.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => x.status < 300 ? resolve(x.responseText) : reject(new Error(x.status + ' ' + x.responseText));
    x.onerror = () => reject(new Error('Upload failed (network)'));
    x.send(file);
  });
}
export function logSocket(onLine, onState) {
  const u = (base || location.origin).replace(/^http/, 'ws') + '/api/ws';
  const ws = new WebSocket(u); ws.onopen = () => onState?.('open'); ws.onclose = () => onState?.('closed'); ws.onerror = () => onState?.('error');
  ws.onmessage = e => String(e.data).split('\n').filter(Boolean).forEach(onLine);
  return ws;
}
