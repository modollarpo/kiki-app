import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => logs.push(`console:${m.type()}:${m.text().slice(0,200)}`));
page.on('pageerror', e => logs.push(`pageerror:${String(e).slice(0,300)}`));

await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 90000 }).catch(e => logs.push('goto:' + e));
await page.waitForTimeout(12000);
const info = await page.evaluate(() => ({
  title: document.title,
  bodyLen: document.body.innerText.length,
  head: document.body.innerText.slice(0, 400),
  html: document.documentElement.outerHTML.length,
  theme: document.documentElement.getAttribute('data-theme'),
  bg: getComputedStyle(document.body).backgroundColor,
}));
console.log(JSON.stringify(info, null, 2));
console.log(logs.slice(0, 30).join('\n'));
await page.screenshot({ path: 'C:/kiki-app/deliverables/shots/debug-home.png' });
await browser.close();
