// Screenshot capture for the design-system pass.
//
// Usage:
//   node scripts/screenshots.mjs --out docs/design/before
//   node scripts/screenshots.mjs --out docs/design/after
//
// Requires a running dev/prod server (see package.json "shots:before"/"shots:after").
// Uses the preinstalled Playwright Chromium; never runs `playwright install`.

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = arg("--base", process.env.SHOT_BASE_URL || "http://localhost:3000");
const OUT = arg("--out", "docs/design/before");
const EXECUTABLE =
  process.env.PW_CHROMIUM ||
  "C:/Users/USER/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe";

const EMAIL = process.env.SHOT_EMAIL || "demo@keekii.net";
const PASSWORD = process.env.SHOT_PASSWORD || process.env.DEMO_USER_PASSWORD || "password123";

const PAGES = [
  { name: "home", path: "/", auth: false },
  { name: "pricing", path: "/pricing", auth: false },
  { name: "login", path: "/auth/login", auth: false },
  { name: "dashboard", path: "/dashboard", auth: true },
  { name: "campaigns", path: "/dashboard/campaigns", auth: true },
  { name: "wallet", path: "/dashboard/wallet", auth: true },
];

const THEMES = ["dark", "light"];
const WIDTHS = [
  { label: "1440", width: 1440, height: 1000 },
  { label: "390", width: 390, height: 844 },
];

async function loginAndGetState(browser, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    // Prefer the explicit "Sign In" button.
    const btn = page.getByRole("button", { name: /sign in/i }).first();
    // Wait for the auth round-trip rather than the client-side URL change:
    // the SPA updates the URL after the token is persisted, and a slow dev
    // compile can make an awaited `waitForURL` flaky.
    await Promise.all([
      page
        .waitForResponse(
          (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST",
          { timeout: 45000 }
        )
        .catch(() => {}),
      btn.click(),
    ]);
    await page.waitForTimeout(1500);
    await page.waitForURL("**/dashboard", { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState("domcontentloaded");
    console.log(`[auth] logged in as ${EMAIL}`);
    const state = await ctx.storageState();
    await ctx.close();
    return state;
  } catch (e) {
    console.log(`[auth] login failed: ${e.message}`);
    await ctx.close();
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXECUTABLE });

  const storageState = await loginAndGetState(browser, { width: 1440, height: 1000 });

  const results = [];

  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({
        viewport: { width: width.width, height: width.height },
        deviceScaleFactor: 1,
        storageState: storageState || undefined,
      });
      const page = await ctx.newPage();
      await page.addInitScript((t) => {
        try {
          localStorage.setItem("kiki-theme", t);
        } catch {}
      }, theme);

      for (const p of PAGES) {
        const url = `${BASE}${p.path}`;
        const file = path.join(OUT, `${p.name}__${theme}__${width.label}.png`);
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
          await page.evaluate((t) => {
            document.documentElement.setAttribute("data-theme", t);
          }, theme);
          // The app wraps everything in a HydrationGuard that renders null until
          // React hydrates. Wait for real content before capturing.
          await page
            .waitForFunction(() => document.body && document.body.innerText.trim().length > 40, null, {
              timeout: 30000,
            })
            .catch(() => {});
          await page.waitForTimeout(1200);
          const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
          const finalUrl = page.url();
          const isErr = /Application error|Unhandled Runtime|This page could not be found/i.test(bodyText);
          const redirectedToLogin = p.auth && finalUrl.includes("/auth/login");
          const blank = bodyText.trim().length === 0;
          await page.screenshot({ path: file, fullPage: true });
          results.push({
            file: path.basename(file),
            ok: !isErr && !redirectedToLogin && !blank,
            note: isErr ? "error-render" : redirectedToLogin ? "redirected-to-login" : blank ? "blank" : "",
          });
          console.log(
            `[shot] ${file}${isErr ? "  (RENDER ERROR)" : ""}${redirectedToLogin ? "  (LOGIN REDIRECT)" : ""}${blank ? "  (BLANK)" : ""}`
          );
        } catch (e) {
          results.push({ file: path.basename(file), ok: false, note: e.message });
          console.log(`[shot] ${file}  FAILED: ${e.message}`);
        }
      }
      await ctx.close();
    }
  }

  await browser.close();

  console.log("\n===== SUMMARY =====");
  const bad = results.filter((r) => !r.ok);
  console.log(`captured ${results.length} screenshots, ${bad.length} with problems`);
  for (const b of bad) console.log(`  ! ${b.file}: ${b.note}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
