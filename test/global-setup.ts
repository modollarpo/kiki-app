import fs from "fs";
import path from "path";

// Deletes the isolated test SQLite database (and its journal/WAL siblings)
// before the suite runs so every run starts from a freshly seeded store.
// On CI (node:sqlite unavailable) the DB layer falls back to in-memory and this
// is a harmless no-op.
export default function globalSetup() {
  const dbPath = process.env.DATABASE_PATH || path.join("test", ".test-kiki.db");
  const file = path.resolve(process.cwd(), dbPath);
  for (const candidate of [file, `${file}-journal`, `${file}-wal`, `${file}-shm`]) {
    try {
      if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
    } catch {
      // best-effort cleanup; a locked file should not fail the run
    }
  }
}
