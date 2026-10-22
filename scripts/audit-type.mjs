#!/usr/bin/env node
/**
 * Type-scale audit — fails if any hard-coded px font size sneaks back into the
 * UI (src/), outside the documented allowlist (scripts/type-allowlist.txt).
 *
 *   node scripts/audit-type.mjs
 *
 * Checks src/** for:
 *   - Tailwind arbitrary text sizes:  text-[13px]
 *   - Inline numeric styles:          fontSize: 13
 *   - Inline px string styles:        fontSize: "13px"
 *   - CSS declarations:               font-size: 13px
 *     (rem/variable values such as var(--fs-body) or 0.875rem are allowed)
 *
 * Any file whose path matches an allowlist glob is skipped.
 *
 * Exit code 1 on violation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const ALLOW_FILE = path.join(ROOT, "scripts", "type-allowlist.txt");

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".git"]);
const EXT = new Set([".tsx", ".ts", ".css", ".jsx", ".js"]);

// ── Load allowlist ────────────────────────────────────────
function loadAllowlist() {
  if (!fs.existsSync(ALLOW_FILE)) return [];
  return fs
    .readFileSync(ALLOW_FILE, "utf8")
    .split("\n")
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter(Boolean)
    .map((glob) => glob.replace(/\\/g, "/"));
}

function isAllowed(relPath, allowlist) {
  const p = relPath.replace(/\\/g, "/");
  return allowlist.some((glob) => {
    if (glob.endsWith("/**")) return p.startsWith(glob.slice(0, -3));
    if (glob.endsWith("*")) return p.startsWith(glob.slice(0, -1));
    return p === glob || p.startsWith(glob);
  });
}

// ── Violation patterns ────────────────────────────────────
const PATTERNS = [
  { name: "tailwind arbitrary text size", re: /text-\[[0-9.]+px\]/g },
  { name: "inline numeric fontSize",      re: /fontSize:\s*[0-9]/g },
  { name: "inline px fontSize",           re: /fontSize:\s*["'][0-9.]+px["']/g },
  { name: "css px font-size",             re: /font-size:\s*[0-9.]+px/g },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const allowlist = loadAllowlist();
const violations = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file);
  if (isAllowed(rel, allowlist)) continue;
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line)) {
        violations.push(`${rel}:${i + 1}  [${name}]  ${line.trim().slice(0, 100)}`);
      }
    }
  });
}

if (violations.length) {
  console.error(`\n✗ type-scale audit failed — ${violations.length} hard-coded px font size(s) found:`);
  for (const v of violations) console.error("  " + v);
  console.error(
    "\nUse the type tokens (text-caption/small/body/lead/… or var(--fs-*)) instead," +
      " or add a justified entry to scripts/type-allowlist.txt."
  );
  process.exit(1);
}

console.log(`✓ type-scale audit passed — no hard-coded px font sizes in src/ (${allowlist.length} allowlisted file(s))`);
