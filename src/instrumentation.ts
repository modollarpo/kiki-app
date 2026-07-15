// ============================================================
// Next.js Instrumentation — runs once when the server boots.
// Initializes the database, runs migrations, and starts the
// background agent scheduler. Server-only (never bundled client-side).
// ============================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initServer } = await import("./lib/startup");
    await initServer();
  }
}
