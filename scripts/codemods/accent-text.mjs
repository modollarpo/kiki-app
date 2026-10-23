import fs from "node:fs";
import path from "node:path";

const ACCENTS = ["blue", "blue4", "mint", "mint4", "gold", "oaas", "indigo", "crm", "teal", "green", "pos", "warn", "danger", "pink"];
const MAP = {
  blue: "tBlue", blue4: "tBlue", mint: "tMint", mint4: "tMint", gold: "tGold",
  oaas: "tOaas", indigo: "tIndigo", crm: "tCrm", teal: "tTeal", green: "tGreen",
  pos: "tPos", warn: "tWarn", danger: "tDanger", pink: "tPink",
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

let files = 0, total = 0;
for (const f of walk("src")) {
  const src = fs.readFileSync(f, "utf8");
  let out = src;
  // Only inside style={{ ... }} blocks: rewrite `color: K.accent` (and `color:K.accent`)
  out = out.replace(/style=\{\{([\s\S]*?)\}\}/g, (block, inner) => {
    const next = inner.replace(/\bcolor\s*:\s*K\.(blue4|blue|mint4|mint|gold|oaas|indigo|crm|teal|green|pos|warn|danger|pink)\b/g,
      (_m, acc) => `color: K.${MAP[acc]}`);
    return `style={{${next}}}`;
  });
  if (out !== src) {
    const n = (src.match(/\bcolor\s*:\s*K\.(blue4|blue|mint4|mint|gold|oaas|indigo|crm|teal|green|pos|warn|danger|pink)\b/g) || []).length;
    total += n;
    files++;
    fs.writeFileSync(f, out, "utf8");
  }
}
console.log(`rewrote ${total} inline color: K.accent across ${files} files`);
