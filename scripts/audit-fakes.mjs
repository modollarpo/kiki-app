// scripts/audit-fakes.mjs
//
// Phase 0 audit gate. Scans `src/` for signs of stubs, mock/fake data, dead
// links, no-op handlers, stray console logging, and API route/method
// mismatches. Findings are matched against `.fake-allowlist.json` so the gate
// can be baselined and then burned down over time.
//
// Usage:
//   node scripts/audit-fakes.mjs                  # report + exit 1 if un-allowed findings
//   node scripts/audit-fakes.mjs --json           # machine-readable report
//   node scripts/audit-fakes.mjs --write-allowlist # rewrite allowlist from ALL current findings
//
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = path.join(ROOT, "src");
const ALLOWLIST_PATH = path.join(ROOT, ".fake-allowlist.json");

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) {
      out.push(p);
    }
  }
  return out;
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

const toParts = (p) => p.replace(/^\/|\/$/g, "").split("/").filter(Boolean);

function pathMatches(urlParts, routeParts) {
  if (urlParts.length !== routeParts.length) return false;
  for (let i = 0; i < routeParts.length; i++) {
    const seg = routeParts[i];
    if (seg.startsWith("[") && seg.endsWith("]")) continue;
    if (seg !== urlParts[i]) return false;
  }
  return true;
}

// ── App route/page inventory ────────────────────────────────
function collectApp() {
  const app = path.join(SRC, "app");
  const pagePaths = new Set();
  const routes = new Map();
  for (const p of walk(app, [".tsx", ".ts"])) {
    const base = path.basename(p);
    let r = rel(path.dirname(p)).replace(/^src\/app/, "");
    r = r === "" ? "/" : r;
    if (base === "page.tsx" || base === "page.ts") {
      pagePaths.add(r);
    } else if (base === "route.ts" || base === "route.tsx") {
      const text = fs.readFileSync(p, "utf8");
      const methods = new Set();
      const re = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
      let m;
      while ((m = re.exec(text))) methods.add(m[1]);
      routes.set(r, { file: rel(p), methods });
    } else if (base === "robots.ts") pagePaths.add("/robots.txt");
    else if (base === "sitemap.ts") pagePaths.add("/sitemap.xml");
    else if (base === "manifest.ts") pagePaths.add("/manifest.webmanifest");
  }

  // Static files served from public/ are valid link targets too.
  const publicDir = path.join(ROOT, "public");
  if (fs.existsSync(publicDir)) {
    for (const p of walk(publicDir, [""])) {
      pagePaths.add("/" + path.relative(publicDir, p).replace(/\\/g, "/"));
    }
  }
  return { pagePaths, routes };
}

// ── Findings collectors ─────────────────────────────────────

const FAKE_PATTERNS = [
  { id: "math-random", re: /\bMath\.random\b/g },
  { id: "mock", re: /\bmock(?:ed|ing|s)?\b|\[MOCK\b/gi },
  { id: "fake", re: /\bfake(?:\w+)?\b/gi },
  { id: "dummy", re: /\bdummy\b/gi },
  { id: "lorem-ipsum", re: /lorem ipsum/gi },
  { id: "placeholder", re: /\bplaceholder\b(?!\s*[=:])/gi },
  { id: "todo-marker", re: /\b(TODO|FIXME|XXX|HACK)\b/g },
  { id: "coming-soon", re: /coming soon/gi },
  { id: "not-implemented", re: /not implemented|unimplemented/gi },
  { id: "mock-flag", re: /mock\s*:\s*(true|false)/gi },
  { id: "demo-literal", re: /\bdemo_[A-Za-z0-9]+|["']demo["']/g },
  { id: "console-log", re: /\bconsole\.(log|debug|info|warn|error)\b/g },
  { id: "empty-handler", re: /\bon[A-Z]\w*=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/g },
];

function scanTextFindings(files) {
  const out = [];
  for (const p of files) {
    const text = fs.readFileSync(p, "utf8");
    for (const { id, re } of FAKE_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        out.push({
          id,
          file: rel(p),
          line: lineAt(text, m.index),
          text: m[0].slice(0, 80),
        });
      }
    }
  }
  return out;
}

function scanDeadLinks(files, pagePaths) {
  const out = [];
  const patterns = [
    /(?:href|to)=\s*["'`](\/[^"'`}\s]+)["'`]/g,
    /(?:href|to|path):\s*["'`](\/[^"'`}\s]+)["'`]/g,
  ];
  for (const p of files) {
    const text = fs.readFileSync(p, "utf8");
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const href = m[1];
        const base = href.split("?")[0].split("#")[0];
        // `/api/...` here denotes an upstream microservice endpoint (e.g. in
        // service-proxy config), not an in-app page link — not a dead link.
        if (base.startsWith("/api/")) continue;
        const hit = [...pagePaths].some((pp) => pathMatches(toParts(base), toParts(pp)));
        if (!hit) {
          out.push({
            id: "dead-link",
            file: rel(p),
            line: lineAt(text, m.index),
            text: href.slice(0, 80),
          });
        }
      }
    }
  }
  return out;
}

function scanApiCalls(files, routes) {
  const out = [];
  const callRe =
    /\b(?:fetch|request)(?:<[^>]*>)?\(\s*([`"'])((?:\/api\/)[^`"'\s]*)\1([\s\S]{0,400}?)\)/g;
  for (const p of files) {
    const text = fs.readFileSync(p, "utf8");
    callRe.lastIndex = 0;
    let m;
    while ((m = callRe.exec(text))) {
      const url = m[2];
      if (url.includes("${")) continue;
      const methodMatch = /method\s*:\s*["']([A-Z]+)["']/.exec(m[3]);
      const method = methodMatch ? methodMatch[1] : "GET";
      const base = url.split("?")[0];
      let match = null;
      for (const [routePath, info] of routes) {
        if (pathMatches(toParts(base), toParts(routePath))) {
          match = info;
          break;
        }
      }
      if (!match) {
        out.push({ id: "api-unknown-route", file: rel(p), line: lineAt(text, m.index), text: `${method} ${url}` });
      } else if (!match.methods.has(method)) {
        out.push({ id: "api-method-mismatch", file: rel(p), line: lineAt(text, m.index), text: `${method} ${url}` });
      }
    }
  }
  return out;
}

// ── Allowlist ───────────────────────────────────────────────
function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return { rules: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));
    return { rules: Array.isArray(parsed.rules) ? parsed.rules : [] };
  } catch {
    return { rules: [] };
  }
}

function isAllowed(rule, f) {
  if (rule.id !== f.id) return false;
  if (rule.file && rule.file !== f.file) return false;
  if (rule.match && rule.match !== f.text) return false;
  return true;
}

// ── Entry point ─────────────────────────────────────────────
export function runAudit() {
  const { pagePaths, routes } = collectApp();
  const files = walk(SRC, [".ts", ".tsx"]).filter((p) => {
    const r = rel(p);
    return !r.endsWith(".d.ts");
  });

  const findings = [
    ...scanTextFindings(files),
    ...scanDeadLinks(files, pagePaths),
    ...scanApiCalls(files, routes),
  ];

  const { rules } = loadAllowlist();
  const allowed = [];
  const unallowed = [];
  for (const f of findings) {
    (rules.some((r) => isAllowed(r, f)) ? allowed : unallowed).push(f);
  }

  const byId = {};
  for (const f of findings) byId[f.id] = (byId[f.id] || 0) + 1;

  return { findings, allowed, unallowed, byId, pageCount: pagePaths.size, routeCount: routes.size };
}

function writeAllowlist(findings) {
  const seen = new Set();
  const rules = [];
  for (const f of findings) {
    const key = `${f.id}\u0000${f.file}\u0000${f.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push({ id: f.id, file: f.file, match: f.text, reason: "baseline — pending remediation" });
  }
  rules.sort((a, b) => (a.id + a.file + a.match).localeCompare(b.id + b.file + b.match));
  fs.writeFileSync(ALLOWLIST_PATH, JSON.stringify({ rules }, null, 2) + "\n", "utf8");
  return rules.length;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const result = runAudit();

  if (args.includes("--write-allowlist")) {
    const count = writeAllowlist(result.findings);
    console.log(`Wrote ${count} baseline rule(s) to ${rel(ALLOWLIST_PATH)}`);
    process.exit(0);
  }

  if (args.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.unallowed.length > 0 ? 1 : 0);
  }

  console.log(`Scanned ${result.pageCount} page path(s), ${result.routeCount} API route(s).`);
  console.log("Findings by rule:");
  for (const [id, n] of Object.entries(result.byId).sort()) {
    console.log(`  ${id.padEnd(20)} ${n}`);
  }
  console.log(`\nAllowed (allowlisted): ${result.allowed.length}`);
  console.log(`Un-allowed:            ${result.unallowed.length}`);
  if (result.unallowed.length > 0) {
    console.log("\nUN-ALLOWED FINDINGS:");
    for (const f of result.unallowed) {
      console.log(`  ${f.id}  ${f.file}:${f.line}  ${f.text}`);
    }
    process.exit(1);
  }
  console.log("\nNo un-allowed findings.");
}
