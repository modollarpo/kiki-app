const fs = require("fs");
const path = require("path");
const appDir = path.join(process.cwd(), "src", "app");
const routes = new Set();

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/^(page|route)\.(tsx|ts)$/.test(e.name)) {
      let r = path.relative(appDir, p).replace(/\\/g, "/");
      r = r.replace(/\/(page|route)\.(tsx|ts)$/, "");
      routes.add(r === "" ? "/" : "/" + r);
    } else if (e.name === "robots.ts") routes.add("/robots.txt");
    else if (e.name === "sitemap.ts") routes.add("/sitemap.xml");
    else if (/^manifest\.(tsx|ts)$/.test(e.name)) routes.add("/manifest.webmanifest");
  }
}
walk(appDir);

function exists(href) {
  const base = href.split("?")[0].split("#")[0].replace(/\/$/, "");
  if (base === "" || base === "/") return routes.has("/");
  if (routes.has(base)) return true;
  return [...routes].some((r) => base === r || base.startsWith(r + "/"));
}

const hrefs = new Map(); // href -> file
function scan(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      scan(p);
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      const s = fs.readFileSync(p, "utf8");
      const patterns = [
        /(?:href|to)=\s*["'`](\/[^"'`}]+)["'`]/g, // href="/x"
        /(?:href|to|path):\s*["'`](\/[^"'`}]+)["'`]/g, // href: "/x" in objects
        /(?:href|to)=\s*\{`(\/[^`]*)`\}/g, // href={`/x`}
      ];
      for (const re of patterns) {
        let m;
        while ((m = re.exec(s))) {
          if (m[1].includes("${")) {
            const prefix = m[1].split("${")[0];
            if (prefix) hrefs.set(prefix + "*", p);
          } else {
            hrefs.set(m[1], p);
          }
        }
      }
    }
  }
}
scan(path.join(process.cwd(), "src"));

const bad = [];
for (const [h, file] of hrefs) {
  const base = h.replace(/\*$/, "").replace(/\/$/, "");
  if (!exists(base)) bad.push(h + "  (" + path.relative(process.cwd(), file) + ")");
}
bad.sort();
console.log("ROUTES:", routes.size, "| INTERNAL HREFS:", hrefs.size);
console.log("POTENTIAL DEAD LINKS:");
bad.forEach((b) => console.log("  " + b));
if (bad.length === 0) console.log("  (none)");
