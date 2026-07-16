import { Pool } from "pg";

// Detects whether a reachable PostgreSQL instance is configured. DB-dependent
// test suites use this to gracefully skip in environments (CI, offline local)
// where no database is available, while pure unit tests still run.
export async function isDbAvailable(): Promise<boolean> {
  const url =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/kiki?sslmode=disable";
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 2500 });
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}
