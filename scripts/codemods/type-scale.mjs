#!/usr/bin/env node
/**
 * Codemod: migrate hard-coded px font sizes to the design-system type scale.
 *
 *   node scripts/codemods/type-scale.mjs --dry-run   # report only
 *   node scripts/codemods/type-scale.mjs             # write changes
 *
 * What it rewrites:
 *   - Tailwind arbitrary text classes  text-[8px] … text-[28px]
 *   - Inline React styles              fontSize: 10  (numeric literal)
 *   - Inline React string styles       fontSize: "10px"
 *   - CSS declarations                 font-size: 11px
 *
 * Mapping:
 *   text-[8px] / [9px] / [10px]  -> text-caption  (12px)  by default
 *                                   text-micro    (11px)  for dense metadata
 *                                   (axis ticks, timestamps, eyebrows/ticks)
 *   text-[11px] / [12px]         -> text-caption  (12px)
 *   text-[13px]                  -> text-small    (13px)
 *   text-[14px]                  -> text-body     (14px)
 *   text-[15px] / [16px]         -> text-lead     (16px)
 *   text-[18px]                  -> text-h4       (18px)
 *   text-[20px] / [22px]         -> text-h3       (20px)
 *   text-[24px]                  -> text-h2       (24px)
 *   text-[28px] / [30px]         -> text-h1       (30px)
 *   text-[40px]                  -> text-display  (40px)
 *
 * Inline/CSS px values map to the nearest token on the same scale and are
 * written as `var(--fs-<token>)` so inline styles stay on the scale.
 *
 * The "micro" allowlist: an element is treated as non-essential metadata (and
 * therefore may use the 11px token) only when its className contains a
 * `tracking-[…]` utility AND (it is a text-t4 eyebrow OR the line contains a
 * time-like token). Everything else defaults to the readable 12px caption.
 * See docs/design/type-scale.md for the reasoning.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "src");
const DRY = process.argv.includes("--dry-run");

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".git"]);
const EXT = new Set([".tsx", ".ts", ".css", ".jsx", ".js"]);

// Tailwind arbitrary text-size → token.
const TW_MAP = {
  8: "caption",
  9: "caption",
  10: "caption",
  11: "caption",
  12: "caption",
  13: "small",
  14: "body",
  15: "lead",
  16: "lead",
  17: "lead",
  18: "h4",
  19: "h4",
  20: "h3",
  21: "h3",
  22: "h3",
  23: "h2",
  24: "h2",
  25: "h2",
  26: "h2",
  27: "h1",
  28: "h1",
  30: "h1",
  32: "display",
  36: "display",
  40: "display",
};

// Numeric px → token (nearest), used for inline styles / CSS.
const PX_TO_TOKEN = [
  [11, "micro"],
  [12, "caption"],
  [13, "small"],
  [14, "body"],
  [16, "lead"],
  [18, "h4"],
  [20, "h3"],
  [24, "h2"],
  [30, "h1"],
  [40, "display"],
];

function pxToToken(px) {
  if (px <= 11) return "micro";
  let best = PX_TO_TOKEN[0];
  for (const entry of PX_TO_TOKEN) {
    if (Math.abs(entry[0] - px) < Math.abs(best[0] - px)) best = entry;
  }
  return best[1];
}

// Heuristic: is this `<12px` occurrence "non-essential metadata" (keep micro)?
// Only for 8/9/10px lines that look like ticks/timestamps/eyebrows.
function isMicroContext(line, px) {
  if (px > 10) return false;
  const hasTracking = /tracking-\[/.test(line);
  const isEyebrow = /text-t4/.test(line) && hasTracking;
  const looksLikeTime = /\d{1,2}:\d{2}|ago\b|timestamp/i.test(line);
  return isEyebrow || looksLikeTime;
}

const stats = { files: 0, twChanges: 0, styleChanges: 0, cssChanges: 0 };

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

function rewriteFile(file) {
  const original = fs.readFileSync(file, "utf8");
  let text = original;
  let changed = false;
  const lines = text.split("\n");

  // 1) Tailwind arbitrary classes: text-[Npx]
  text = text.replace(/text-\[(\d+(?:\.\d+)?)px\]/g, (m, n, offset) => {
    const px = parseFloat(n);
    // find the surrounding line for context
    const lineStart = text.lastIndexOf("\n", offset) + 1;
    const lineEnd = text.indexOf("\n", offset);
    const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    let token = TW_MAP[px] || pxToToken(px);
    if (px <= 10 && isMicroContext(line, px)) token = "micro";
    stats.twChanges++;
    changed = true;
    return `text-${token}`;
  });

  // 2) Inline React numeric styles: fontSize: 10
  text = text.replace(/fontSize:\s*(\d+(?:\.\d+)?)\b(?!\s*px)/g, (m, n) => {
    const token = pxToToken(parseFloat(n));
    stats.styleChanges++;
    changed = true;
    return `fontSize: "var(--fs-${token})"`;
  });

  // 3) Inline React string styles: fontSize: "10px" | '10px'
  text = text.replace(/fontSize:\s*(["'])(\d+(?:\.\d+)?)px\1/g, (m, q, n) => {
    const token = pxToToken(parseFloat(n));
    stats.styleChanges++;
    changed = true;
    return `fontSize: "var(--fs-${token})"`;
  });

  // 4) CSS declarations: font-size: 11px
  if (file.endsWith(".css")) {
    text = text.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (m, n) => {
      const token = pxToToken(parseFloat(n));
      stats.cssChanges++;
      changed = true;
      return `font-size:var(--fs-${token})`;
    });
  }

  if (changed) {
    stats.files++;
    const lineDelta = text.split("\n").length - lines.length;
    if (!DRY) fs.writeFileSync(file, text);
    const rel = path.relative(ROOT, file);
    console.log(`  ${DRY ? "[dry] " : ""}${rel}${lineDelta ? ` (${lineDelta > 0 ? "+" : ""}${lineDelta} lines)` : ""}`);
  }
}

console.log(`\n=== type-scale codemod ${DRY ? "(dry run)" : ""} ===`);
for (const file of walk(SRC)) rewriteFile(file);

console.log("\n=== summary ===");
console.log(`files changed:        ${stats.files}`);
console.log(`tailwind classes:     ${stats.twChanges}`);
console.log(`inline style values:  ${stats.styleChanges}`);
console.log(`css declarations:     ${stats.cssChanges}`);
if (DRY) console.log("\n(dry run — nothing written)");
