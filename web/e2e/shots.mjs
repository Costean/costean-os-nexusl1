// Costean OS (NexusL1) v1.0.4.4-costean.7 web UI: screenshots + checks against the DEMO mock only (never a real miner).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.env.SCREENS || 'shots/main'; fs.mkdirSync(OUT, { recursive: true });
let fail = 0; const ok = (c, m) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fail++; };
async function withMock(scenario, port, fn, extraEnv = {}) {
  const srv = spawn('node', ['e2e/mock-server.mjs'], { stdio: 'ignore', env: { ...process.env, PORT: String(port), SCENARIO: scenario, ...extraEnv } });
  await new Promise(r => setTimeout(r, 700)); const URL = `http://127.0.0.1:${port}/`;
  const v = await (await fetch(URL + 'version.json')).json(); if (v.www !== (extraEnv.SERVED_WWW_VERSION || '1.0.4.4-costean.7')) throw new Error('port ' + port + ' is serving another build: ' + v.www);
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  try { await fn(browser, URL); } finally { await browser.close(); srv.kill(); }
}
const writes = async URL => (await (await fetch(URL + '__writes')).json());
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const confirm = async p => { await p.waitForSelector('[data-testid=confirm]'); await p.click('[data-testid=confirm-ok]'); await p.waitForTimeout(700); };
await withMock('normal', 8491, async (browser, URL) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto(URL); await page.waitForSelector('[data-testid=demo]'); await page.waitForTimeout(16000);
  const navs = await page.locator('nav a').allTextContents();
  ok(JSON.stringify(navs.map(s => s.replace(/^\W+/, '').replace(/\d+$/, '').trim())) === JSON.stringify(['Dashboard', 'Mining & Tuning', 'Pools & Stratum', 'Thermal & Safe Mode', 'Block Found', 'Swarm', 'InfluxDB & Alerts', 'System & Network', 'Diagnostics & Logs', 'Update & Recovery']), 'nav = NerdOctAxe Costean page set: ' + navs.length);
  const shots = [
    ['web-01-dashboard', 'dashboard', async p => { const t = await p.textContent('body'); const mx = await p.textContent('[data-testid=matrix]');
      return t.includes('MH/s') && !t.includes('TH/s') && (await p.locator('.chip').count()) === 0 && /^5[67]\.\d/.test(await p.textContent('[data-testid=board-temp]')) && (await p.textContent('[data-testid=chip-count]')).includes('4 × BM1491')
        && (await p.textContent('.pill.mono')).includes('×4') && !/×\s?6|6 chips|Chip [1-6]|hottest|Chip max/.test(t) && !/(^|[^0-9])0\.0\s*°C/.test(mx) && (await p.textContent('[data-testid=ui-version]')).includes('1.0.4.4-costean.7') && t.includes('VR temp'); }],
    ['web-02-mining', 'mining', async p => (await p.textContent('[data-testid=mode-pill]')).includes('STOCK | 1300 MHz | 1300 mV')],
    ['web-03-pools', 'pools', async p => (await p.locator('[data-testid^=pool-]').count()) >= 2 && (await p.locator('[data-testid=pool-3]').count()) === 0 && (await p.textContent('body')).includes('Fallback pool')],
    ['web-04-thermal', 'thermal', async p => (await p.locator('[data-testid=safe-card]').count()) === 1 && (await p.locator('[data-testid=thermal-no-perchip]').count()) === 1 && (await p.locator('[data-testid=lcd-card]').count()) === 1],
    ['web-05-block-found', 'block', async p => (await p.textContent('[data-testid=block-state]')).includes('HUNTING')],
    ['web-06-swarm', 'swarm', async p => (await p.textContent('[data-testid=swarm]')).includes('4× BM1491')],
    ['web-07-alerts', 'influx', async p => (await p.locator('[data-testid=alerts]').count()) === 1 && (await p.locator('[data-testid=influx]').count()) === 1 && await p.locator('[data-testid=al-block]').isChecked()],
    ['web-08-network', 'network', async p => (await p.textContent('[data-testid=sys-model]')).includes('4× BM1491') && (await p.textContent('[data-testid=sys-model]')).includes('asicCount 6')],
    ['web-09-diagnostics', 'diagnostics', async p => (await p.textContent('[data-testid=diag-health]')).includes('All checks passed')],
    ['web-10-update', 'update', async p => (await p.textContent('[data-testid=recovery]')).includes('/recovery') && (await p.locator('[data-testid=backup]').count()) === 1 && (await p.locator('[data-testid=otp]').count()) === 1],
  ];
  for (const [name, hash, check] of shots) { await page.goto(URL + '#/' + hash); await page.waitForTimeout(1500); if (check) ok(await check(page), name); ok(await noOverflow(page), name + ' no horizontal overflow'); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); }
  const body = await page.textContent('body'); ok(!/nerd|octaxe|nexus miner/i.test(body), 'no other-firmware branding in UI text');
  ok((await page.locator('footer').count()) === 0, 'no footer / licence line in UI');
  ok((await writes(URL)).length === 0, 'browsing sends no writes');
  // tuning: cancel -> nothing; above-stock needs phrase; confirm -> one PATCH incl. unchanged pools, no password
  await page.goto(URL + '#/mining'); await page.waitForTimeout(800);
  await page.selectOption('[data-testid=freq]', '1350'); await page.click('[data-testid=apply-tune]'); await page.waitForSelector('[data-testid=confirm]');
  await page.screenshot({ path: `${OUT}/web-11-confirm-above-stock.png` });
  ok(await page.locator('[data-testid=confirm-ok]').isDisabled(), 'above-stock confirm disabled until phrase typed');
  await page.click('text=Cancel'); await page.waitForTimeout(300); ok((await writes(URL)).length === 0, 'cancel sends nothing');
  await page.selectOption('[data-testid=freq]', '1200'); await page.click('[data-testid=apply-tune]'); await confirm(page);
  let w = await writes(URL); ok(w.length === 1 && w[0].method === 'PATCH' && w[0].path === '/api/system' && w[0].body.frequency === 1200 && Array.isArray(w[0].body.pools) && w[0].body.pools[0].url === 'demo-ltc-pool.example' && !('password' in w[0].body.pools[0]), 'tuning PATCH carries change + unchanged pools, no password');
  // pools: add a fallback, switch to dual pool 70/30
  await page.goto(URL + '#/pools'); await page.waitForTimeout(1000);
  await page.fill('[data-testid=pool-2] input >> nth=0', 'demo-backup.example'); await page.fill('[data-testid=pool-2] input >> nth=2', 'ltc1qDEMOdemo.backup');
  await page.selectOption('[data-testid=mode-select]', { index: 1 }); await page.fill('[data-testid=bal-range]', '70'); await page.waitForTimeout(200);
  await page.click('[data-testid=save-pools]'); await page.waitForSelector('[data-testid=confirm]'); await page.screenshot({ path: `${OUT}/web-12-pools-confirm.png` }); await page.click('[data-testid=confirm-ok]'); await page.waitForTimeout(700);
  w = await writes(URL); const pw = w[w.length - 1]; ok(pw.path === '/api/system' && pw.body.poolMode === 1 && pw.body.poolBalance === 70 && pw.body.pools.length === 2 && pw.body.pools[1].url === 'demo-backup.example' && !('password' in pw.body.pools[0]), 'dual pool PATCH: 2 pools, poolMode 1, poolBalance 70');
  // alerts: toggle + webhook -> POST /api/alert/update with stock field names
  await page.goto(URL + '#/influx'); await page.waitForTimeout(1200);
  await page.fill('[data-testid=webhook]', 'https://discord.com/api/webhooks/123/DEMO'); await page.check('text=New best difficulty'); await page.click('[data-testid=save-alert]'); await confirm(page);
  w = await writes(URL); const aw = w[w.length - 1]; ok(aw.method === 'POST' && aw.path === '/api/alert/update' && aw.body.alertDiscordBestDiffEnable === true && aw.body.alertDiscordBlockFoundEnable === true && aw.body.alertDiscordWebhook === 'https://discord.com/api/webhooks/123/DEMO', 'alert save -> POST /api/alert/update (stock fields)');
  await page.click('[data-testid=test-alert]'); await confirm(page); w = await writes(URL); ok(w[w.length - 1].path === '/api/alert/test', 'test alert -> POST /api/alert/test');
  // command palette
  await page.keyboard.press('Control+k'); await page.waitForSelector('[data-testid=palette]'); await page.keyboard.type('stock'); await page.screenshot({ path: `${OUT}/web-13-command-palette.png` });
  await page.keyboard.press('Enter'); await confirm(page); w = await writes(URL); ok(w[w.length - 1].body.frequency === 1300 && w[w.length - 1].body.coreVoltage === 1300, 'palette "stock" -> 1300 MHz / 1300 mV');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await m.newPage(); await mp.goto(URL); await mp.waitForTimeout(3000);
  await mp.screenshot({ path: `${OUT}/web-14-mobile-dashboard.png`, fullPage: true }); ok(await noOverflow(mp), 'mobile: no horizontal overflow');
  for (const h of ['pools', 'influx', 'update']) { await mp.goto(URL + '#/' + h); await mp.waitForTimeout(900); ok(await noOverflow(mp), 'mobile ' + h + ': no horizontal overflow'); }
});
await withMock('factory', 8492, async (browser, URL) => {
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage(); await p.goto(URL + '#/pools'); await p.waitForTimeout(2500);
  ok((await p.locator('[data-testid=factory-addr]').count()) === 1, 'factory: warns about stock default payout address');
});
await withMock('multi4', 8493, async (browser, URL) => {
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage(); await p.goto(URL + '#/pools'); await p.waitForTimeout(2500);
  ok((await p.locator('[data-testid=extra-pools]').count()) === 1 && (await p.locator('[data-testid=pool-3]').count()) === 0, 'old 4-pool config: warns and shows only 2 pools');
  await p.screenshot({ path: `${OUT}/web-15-pools-old-multipool.png`, fullPage: true });
});
await withMock('hot', 8494, async (browser, URL) => {
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage(); await p.goto(URL); await p.waitForTimeout(2500);
  ok(/warm|overheat/i.test(await p.textContent('[data-testid=health]')), 'hot: health shows thermal warning'); await p.screenshot({ path: `${OUT}/web-16-dashboard-hot.png`, fullPage: true });
});
// Version reload logic: matching version.json = no reload; a different one = exactly one reload, never a loop.
await withMock('normal', 8495, async (browser, URL) => {
  const p = await (await browser.newContext()).newPage(); await p.goto(URL); await p.waitForTimeout(4000);
  const s = await (await fetch(URL + '__served')).json();
  ok(s.index === 1 && (await p.evaluate(() => sessionStorage.getItem('costean.wwwReload'))) === null, 'version reload: same www version, no reload (index loads ' + s.index + ')');
});
await withMock('normal', 8496, async (browser, URL) => {
  const p = await (await browser.newContext()).newPage(); await p.goto(URL); await p.waitForTimeout(6000);
  const s = await (await fetch(URL + '__served')).json();
  ok(s.index === 2 && (await p.evaluate(() => sessionStorage.getItem('costean.wwwReload'))) === '1.0.4.4-costean.9', 'version reload: other www version on the miner, reloaded exactly once (index loads ' + s.index + ')');
  ok((await p.textContent('[data-testid=ui-version]')).includes('1.0.4.4-costean.7'), 'version reload: page still works after reload');
}, { SERVED_WWW_VERSION: '1.0.4.4-costean.9' });
console.log(fail ? `${fail} FAILED` : 'ALL OK'); process.exit(fail ? 1 : 0);
