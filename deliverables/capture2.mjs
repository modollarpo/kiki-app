import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'C:/kiki-app/deliverables/shots';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';

const DASH = [
  { path: '/dashboard', name: '03-command-center' },
  { path: '/dashboard/campaigns', name: '04-campaigns' },
  { path: '/dashboard/signals', name: '05-signals' },
  { path: '/dashboard/agents', name: '06-agents' },
  { path: '/dashboard/analytics', name: '09-analytics' },
  { path: '/dashboard/wallet', name: '08-wallet' },
  { path: '/dashboard/syncbrain', name: '07-syncbrain' },
];

const PUBLIC = [
  { path: '/', name: '01-home', wait: 8000 },
  { path: '/auth/login', name: '02-login', wait: 3000 },
  { path: '/pricing', name: '10-pricing', wait: 4000 },
];

const email = `deck.cap3.${Date.now()}@example.com`;
const password = 'DeckCapture!2026';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function shoot(path, name, wait) {
  for (let a = 0; a < 2; a++) {
    try { await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { console.log('goto err', name, String(e).slice(0, 60)); }
    await page.waitForTimeout(wait);
    const len = await page.evaluate(() => document.body?.innerText?.length || 0);
    if (len > 200) break;
    console.log('short', name, len);
    await page.waitForTimeout(4000);
  }
  try { const b = page.getByRole('button', { name: /accept all/i }); if (await b.isVisible({ timeout: 700 })) await b.click({ timeout: 2000 }); } catch {}
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const len = await page.evaluate(() => document.body?.innerText?.length || 0);
  console.log('shot', name, 'len', len);
}

for (const s of PUBLIC) await shoot(s.path, s.name, s.wait);

try {
  const token = await page.evaluate(async ({ email, password }) => {
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Deck Capture', email, password }) });
    const data = await res.json();
    if (!data.ok) return null;
    localStorage.setItem('kiki-auth', JSON.stringify({ state: { token: data.token, user: data.user }, version: 0 }));
    return data.token;
  }, { email, password });
  console.log('token?', !!token);
  if (token) {
    await page.evaluate(async (t) => { await fetch('/api/seed', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }); }, token).catch(() => {});
    for (const s of DASH) await shoot(s.path, s.name, 4500);
  }
} catch (e) {
  console.log('auth/seed err', String(e).slice(0, 120));
}

await browser.close();
console.log('done');
