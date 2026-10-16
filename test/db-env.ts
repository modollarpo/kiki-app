import { getDb } from "@/lib/db";

// Reports whether the application database layer is usable. It exercises the
// exact path the suites will use — getDb() resolves PostgreSQL, else the local
// SQLite file (honoring DATABASE_PATH), else an in-memory store — and runs the
// migrations + demo seed. This lets DB-dependent suites run everywhere (CI has
// no external Postgres) instead of silently skipping.
export async function isDbAvailable(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.prepare("SELECT 1 as ok").get();
    return true;
  } catch {
    return false;
  }
}
