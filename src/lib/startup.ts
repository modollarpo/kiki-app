// ============================================================
// Server Startup — Initialize DB and start background scheduler
// ============================================================

import { getDb } from "./db";
import { startScheduler } from "./scheduler";

let initialized = false;

export async function initServer() {
  if (initialized) return;
  initialized = true;

  console.log("[Server] Initializing KIKI Agent Platform...");

  // Initialize database
  const db = await getDb();
  console.log("[Server] Database initialized");

  // Start background agent scheduler
  await startScheduler();
  console.log("[Server] Background scheduler started");

  // Log startup
  await db.prepare("INSERT INTO system_metrics (metric_name, metric_value, tags) VALUES (?, ?, ?)")
    .run("server.startup", 1, JSON.stringify({ pid: process.pid, time: Date.now() }));

  console.log("[Server] Ready ✓");
}
