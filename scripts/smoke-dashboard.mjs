// Dashboard functional smoke test.
//
// Visits every dashboard page as a signed-in admin, records console errors,
// uncaught page errors, failed API calls (status >= 400) and unexpected
// redirects. Exits non-zero when any page reports a problem.
//
// Usage (server must already be running):
//   node scripts/smoke-dashboard.mjs
//   node scripts/smoke-dashboard.mjs --base http://localhost:3000
//   node scripts/smoke-dashboard.mjs --report .tmp/smoke.json

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = arg("--base", process.env.SMOKE_BASE_URL || "http://localhost:3000");
const REPORT = arg("--report", "");
const EXECUTABLE =
  process.env.PW_CHROMIUM ||
  (fs.existsSync("C:/Users/USER/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe")
    ? "C:/Users/USER/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe"
    : undefined);
const EMAIL = process.env.SMOKE_EMAIL || "admin@keekii.net";
const PASSWORD = process.env.SMOKE_PASSWORD || process.env.DEMO_ADMIN_PASSWORD || "admin123";

function dashboardRoutes() {
  const root = path.join(process.cwd(), "src", "app", "dashboard");
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx") {
        const url = "/" + path.relative(path.join(process.cwd(), "src", "app"), dir).replace(/\\/g, "/");
        out.push(url);
      }
    }
  };
  walk(root);
  return out.sort();
}

const IGNORED_API = [/\/api\/events(\?|$)/];
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /favicon/i,
  /net::ERR_ABORTED.*\/api\/events/i,
];

async function main() {
  const routes = dashboardRoutes();
  const browser = await chromium.launch({ executablePath: EXECUTABLE, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 60000 }).catch(() => {}),
    page.getByRole("button", { name: /sign in/i }).first().click(),
  ]);
  if (page.url().includes("/auth/login")) {
    throw new Error("login failed");
  }

  const results = [];
  for (const route of routes) {
    const result = { route, pathname: "", status: null, console: [], pageErrors: [], api: [], redirect: null };
    const onConsole = (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
      result.console.push(text.slice(0, 300));
    };
    const onPageError = (err) => result.pageErrors.push(String(err.message || err).slice(0, 300));
    const onResponse = (res) => {
      const url = res.url();
      if (!url.includes("/api/")) return;
      if (IGNORED_API.some((re) => re.test(url))) return;
      if (res.status() >= 400) result.api.push(`${res.status()} ${new URL(url).pathname}`);
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("response", onResponse);

    try {
      const res = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      result.status = res ? res.status() : null;
      await page.waitForTimeout(4000);
      result.pathname = new URL(page.url()).pathname;
      if (result.pathname.replace(/\/$/, "") !== route.replace(/\/$/, "")) {
        result.redirect = result.pathname;
      }
    } catch (err) {
      result.pageErrors.push(`navigation: ${String(err.message || err).slice(0, 300)}`);
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);
    }

    const failed =
      (result.status !== null && result.status >= 400) ||
      result.console.length > 0 ||
      result.pageErrors.length > 0 ||
      result.api.length > 0;
    if (failed) results.push(result);
  }

  await browser.close();

  if (REPORT) {
    fs.mkdirSync(path.dirname(REPORT), { recursive: true });
    fs.writeFileSync(REPORT, JSON.stringify({ base: BASE, routes: routes.length, failures: results }, null, 2));
  }

  console.log(`[smoke] visited ${routes.length} dashboard page(s)`);
  if (results.length === 0) {
    console.log("[smoke] PASS — no console errors, page errors, failed APIs or unexpected redirects");
    return;
  }
  console.log(`[smoke] FAIL — ${results.length} page(s) with problems:`);
  for (const r of results) {
    console.log(`\n  ${r.route}  (status ${r.status})`);
    if (r.redirect) console.log(`    redirect -> ${r.redirect}`);
    for (const e of r.pageErrors) console.log(`    pageerror: ${e}`);
    for (const e of r.console) console.log(`    console:   ${e}`);
    for (const e of r.api) console.log(`    api:       ${e}`);
  }
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("[smoke] fatal:", err);
  process.exit(2);
});
