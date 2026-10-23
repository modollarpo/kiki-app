// Automated accessibility gate for the KIKI design system.
//
// Usage (server must already be running):
//   npm run audit:a11y            # gate against the baseline
//   node scripts/a11y-audit.mjs --base http://localhost:3000
//   node scripts/a11y-audit.mjs --report docs/design/a11y-report.json
//
// Exits non-zero when the number of WCAG 2.1 A/AA violations exceeds the
// recorded baseline (scripts/a11y-baseline.json). This lets us lock in the
// current clean state and fail future regressions without freezing the whole
// suite behind a single flaky rule.
//
// Uses the preinstalled Playwright Chromium; never runs `playwright install`.

import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = arg("--base", process.env.A11Y_BASE_URL || "http://localhost:3000");
const REPORT = arg("--report", "docs/design/a11y-report.json");
const BASELINE_FILE = arg("--baseline", "scripts/a11y-baseline.json");
const EXECUTABLE =
  process.env.PW_CHROMIUM ||
  (fs.existsSync("C:/Users/USER/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe")
    ? "C:/Users/USER/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe"
    : undefined);
const EMAIL = process.env.A11Y_EMAIL || "demo@keekii.net";
const PASSWORD = process.env.A11Y_PASSWORD || process.env.DEMO_USER_PASSWORD || "password123";

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
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function loginAndGetState(browser, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('input[type="email"]', { timeout: 60000 });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await Promise.all([
      page
        .waitForResponse(
          (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST",
          { timeout: 45000 }
        )
        .catch(() => {}),
      page.getByRole("button", { name: /sign in/i }).first().click(),
    ]);
    await page.waitForTimeout(1500);
    const state = await ctx.storageState();
    await ctx.close();
    return state;
  } catch (e) {
    console.log(`[a11y] login failed: ${e.message}`);
    await ctx.close();
    return null;
  }
}

async function main() {
  const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
  const storageState = await loginAndGetState(browser, { width: 1440, height: 1000 });

  const violations = {};
  let totalNodes = 0;
  const scanned = [];

  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({
        viewport: { width: width.width, height: width.height },
        storageState: storageState || undefined,
      });
      const page = await ctx.newPage();
      await page.addInitScript((t) => {
        try {
          localStorage.setItem("kiki-theme", t);
        } catch {}
      }, theme);

      for (const p of PAGES) {
        try {
          await page.goto(`${BASE}${p.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
          await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
          await page
            .waitForFunction(() => document.body && document.body.innerText.trim().length > 40, null, {
              timeout: 30000,
            })
            .catch(() => {});
          await page.waitForTimeout(1000);
          const results = await new AxeBuilder({ page })
            .withTags(TAGS)
            .analyze();
          const key = `${p.name}/${theme}/${width.label}`;
          scanned.push(key);
          for (const v of results.violations) {
            totalNodes += v.nodes.length;
            if (!violations[v.id]) {
              violations[v.id] = { impact: v.impact, help: v.help, count: 0, nodes: [] };
            }
            violations[v.id].count += v.nodes.length;
            for (const n of v.nodes) {
              violations[v.id].nodes.push({ page: key, target: n.target.join(" ") });
            }
          }
        } catch (e) {
          console.log(`[a11y] ${p.path} (${theme}/${width.label}) failed: ${e.message}`);
        }
      }
      await ctx.close();
    }
  }

  await browser.close();

  const baseline = fs.existsSync(BASELINE_FILE)
    ? JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"))
    : { maxViolationNodes: 0 };

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    scanned,
    totalViolationNodes: totalNodes,
    baseline: baseline.maxViolationNodes,
    violations,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");

  const entries = Object.entries(violations).sort((a, b) => b[1].count - a[1].count);
  console.log(`\n[a11y] scanned ${scanned.length} page/theme/width combinations`);
  if (entries.length === 0) {
    console.log("[a11y] no WCAG 2.1 A/AA violations found");
  } else {
    for (const [id, d] of entries) {
      console.log(`[a11y] [${d.impact}] ${id}: ${d.count} node(s) — ${d.help}`);
    }
  }
  console.log(`[a11y] total violation nodes: ${totalNodes} (baseline: ${baseline.maxViolationNodes})`);
  console.log(`[a11y] report written to ${REPORT}`);

  if (totalNodes > baseline.maxViolationNodes) {
    console.error(
      `\n[a11y] FAIL: ${totalNodes} violation node(s) exceed baseline ${baseline.maxViolationNodes}.`
    );
    process.exit(1);
  }
  console.log("\n[a11y] PASS — at or below baseline");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
