import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'C:/kiki-app/deliverables/shots';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';

const PUBLIC = [
  { path: '/', name: '01-home', wait: 7000 },
  { path: '/auth/login', name: '02-login', wait: 3000 },
  { path: '/pricing', name: '10-pricing', wait: 3000 },
];

const DASH = [
  { path: '/dashboard', name: '03-command-center' },
  { path: '/dashboard/campaigns', name: '04-campaigns' },
  { path: '/dashboard/signals', name: '05-signals' },
  { path: '/dashboard/agents', name: '06-agents' },
  { path: '/dashboard/syncbrain', name: '07-syncbrain' },
  { path: '/dashboard/wallet', name: '08-wallet' },
  { path: '/dashboard/analytics', name: '09-analytics' },
];

async function shoot(page, path, name, wait) {
  // Retry loop: first visit may trigger a cold compile that stalls networkidle
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
    } catch (e) {
      console.log('goto retry', name, e.message?.slice(0, 80));
    }
    await page.waitForTimeout(wait);
    const len = await page.evaluate(() => document.body?.innerText?.length || 0);
    if (len > 300) break;
    console.log('retry due to short render', name, len);
    await page.waitForTimeout(5000);
  }
  // Dismiss cookie consent if present
  try {
    const btn = page.getByRole('button', { name: /accept all/i });
    if (await btn.isVisible({ timeout: 800 })) await btn.click({ timeout: 2000 });
  } catch {}
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const len = await page.evaluate(() => document.body?.innerText?.length || 0);
  console.log('shot', name, 'textlen', len);
}

const email = `deck.capture2.${Date.now()}@example.com`;
const password = 'DeckCapture!2026';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (const s of PUBLIC) await shoot(page, s.path, s.name, s.wait);

const token = await page.evaluate(async ({ email, password }) => {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Deck Capture', email, password }),
  });
  const data = await res.json();
  if (!data.ok) return null;
  localStorage.setItem('kiki-auth', JSON.stringify({ state: { token: data.token, user: data.user }, version: 0 }));
  return data.token;
}, { email, password });
console.log('token?', !!token);

if (token) {
  await page.evaluate(async (token) => {
    await fetch('/api/seed', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  }, token).catch(() => {});

  for (const s of DASH) await shoot(page, s.path, s.name, 5000);
}

await browser.close();
console.log('done');
