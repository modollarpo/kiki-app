const fs = require("fs");
const src = fs.readFileSync("src/lib/db.ts", "utf8");
const m = src.match(/const SCHEMA = `([\s\S]*?)`;/);
const schema = m[1].replace(/BIGSERIAL PRIMARY KEY/g, "INTEGER PRIMARY KEY AUTOINCREMENT");
const { DatabaseSync } = require("node:sqlite");
const raw = new DatabaseSync(":memory:");
raw.exec("PRAGMA foreign_keys = OFF;");
// replicate SqliteDb.exec exactly
const statements = schema.split(";").map((s) => s.trim()).filter((s) => s.length > 0 && !/^--/.test(s));
for (const s of statements) {
  try {
    raw.exec(s);
  } catch (e) {
    console.error("FIRST THROW at: " + s.slice(0, 70) + "\n  " + e.message);
    break;
  }
}
const tables = raw.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name);
console.log("tables after abort-style exec:", tables.length);
console.log(tables.join(", "));
