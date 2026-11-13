// Block Found tab screenshots + checks against the DEMO mock only (never a real miner).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process'; import fs from 'node:fs';
const OUT = process.env.SCREENS || 'shots/blockfound'; fs.mkdirSync(OUT, { recursive: true });
let fail = 0; const ok = (c, m) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fail++; };
async function withMock(scenario, port, fn, env = {}) {
  const srv = spawn('node', ['e2e/mock-server.mjs'], { stdio: 'ignore', env: { ...process.env, PORT: String(port), SCENARIO: scenario, ...env } });
  await new Promise(r => setTimeout(r, 700)); const URL = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  try { await fn(browser, URL); } finally { await browser.close(); srv.kill(); }
}
const writes = async URL => (await (await fetch(URL + '__writes')).json());
const errsOf = p => { const e = []; p.on('pageerror', x => e.push(x.message)); p.on('console', m => m.type() === 'error' && e.push(m.text())); return e; };
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
// 1) no blocks yet
await withMock('normal', 8591, async (browser, URL) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } }); const p = await ctx.newPage(); const errs = errsOf(p);
  await p.goto(URL); await p.waitForSelector('[data-testid=demo]'); await p.waitForTimeout(12000);
  await p.screenshot({ path: `${OUT}/web-01-dashboard-nav.png`, fullPage: true });
  ok((await p.locator('nav a', { hasText: 'Block Found' }).count()) === 1, 'nav has Block Found');
  ok((await p.locator('footer').count()) === 0 && !(await p.textContent('body')).includes('GPL-3.0'), 'no footer on dashboard');
  ok((await p.locator('nav a').count()) === 10, 'nav: 10 pages incl. Block Found, Swarm, InfluxDB & Alerts, Network');
  await p.goto(URL + '#/block'); await p.waitForTimeout(2500);
  ok((await p.textContent('[data-testid=block-state]')).includes('HUNTING'), 'no-block state: HUNTING');
  ok((await p.locator('[data-testid=no-blocks]').count()) === 1, 'no-block state: empty browser log');
  ok((await p.textContent('[data-testid=reactions]')).includes('ON'), 'alert toggles read from /api/alert/info');
  ok(/PH\/s|TH\/s/.test(await p.textContent('[data-testid=implied-net]')), 'implied network hashrate shown');
  ok((await p.textContent('[data-testid=merged]')).includes('no per-chain'), 'merged-mining limitation stated');
  await p.screenshot({ path: `${OUT}/web-02-blockfound-none-desktop.png`, fullPage: true });
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await m.newPage(); await mp.goto(URL + '#/block'); await mp.waitForTimeout(8000);
  ok((await mp.locator('footer').count()) === 0, 'no footer on mobile Block Found');
  await mp.screenshot({ path: `${OUT}/web-03-blockfound-none-mobile.png`, fullPage: true }); ok(await noOverflow(mp), 'mobile none: no horizontal overflow');
  ok((await writes(URL)).length === 0, 'browsing sends no writes');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
});
// 2) block found while the UI is open -> firmware counters rise, browser log records it
await withMock('blocklive', 8592, async (browser, URL) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } }); const p = await ctx.newPage(); const errs = errsOf(p);
  await p.goto(URL + '#/block'); await p.waitForTimeout(6000);
  ok((await p.textContent('[data-testid=block-state]')).includes('HUNTING'), 'blocklive: hunting before the block');
  await p.waitForTimeout(14000);
  ok((await p.textContent('[data-testid=block-state]')).includes('BLOCK FOUND'), 'blocklive: BLOCK FOUND after counters rise');
  ok((await p.textContent('[data-testid=found-total]')).trim() === '1', 'all-time counter 1');
  ok((await p.locator('[data-testid=seen-log] tbody tr').count()) === 1, 'browser log recorded exactly one event');
  ok((await p.locator('[data-testid=nav-block-count]').count()) === 1, 'nav badge shows count');
  await p.screenshot({ path: `${OUT}/web-04-blockfound-found-desktop.png`, fullPage: true });
  const saved = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('costean.blocks.')).map(k => JSON.parse(localStorage.getItem(k))));
  ok(saved.length === 1 && saved[0].events.length === 1 && saved[0].events[0].delta === 1, 'stored in localStorage per miner');
  // reload: event persists, not duplicated
  await p.reload(); await p.waitForTimeout(6000); ok((await p.locator('[data-testid=seen-log] tbody tr').count()) === 1, 'reload: log persists, no duplicate');
  // mobile, same browser storage
  const mp = await ctx.newPage(); await mp.setViewportSize({ width: 390, height: 844 }); await mp.goto(URL + '#/block'); await mp.waitForTimeout(6000);
  await mp.screenshot({ path: `${OUT}/web-05-blockfound-found-mobile.png`, fullPage: true }); ok(await noOverflow(mp), 'mobile found: no horizontal overflow');
  // clear log: confirm dialog, no miner write
  await p.click('[data-testid=clear-log]'); await p.waitForSelector('[data-testid=confirm]'); await p.click('[data-testid=confirm-ok]'); await p.waitForTimeout(6000);
  ok((await p.locator('[data-testid=no-blocks]').count()) === 1 && (await p.textContent('[data-testid=no-blocks]')).includes('already had 1'), 'clear: local only, baseline notes existing all-time block');
  ok((await writes(URL)).length === 0, 'no writes to the miner at any point');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
});
// 3) phone hi-dpi mobile dashboard with nav open
await withMock('normal', 8593, async (browser, URL) => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await m.newPage(); await mp.goto(URL); await mp.waitForTimeout(3000);
  await mp.click('.burger'); await mp.waitForTimeout(500); await mp.screenshot({ path: `${OUT}/web-06-mobile-nav-open.png` });
});
console.log(fail ? `${fail} FAILED` : 'ALL OK'); process.exit(fail ? 1 : 0);
