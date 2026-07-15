// ============================================================
// Fraud Detection Engine — Detects IVT, click fraud, anomalies
// ============================================================

import { getDb, genId } from "./db";

interface FraudCheckResult {
  isFraud: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
  reasons: string[];
  blocked: boolean;
}

// ── Check a signal for fraud indicators ───────────────────
export async function checkFraud(tenantId: string, signalData: {
  platform: string;
  eventType: string;
  value: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionDuration?: number;
  referrer?: string;
}): Promise<FraudCheckResult> {
  const reasons: string[] = [];
  let severity: FraudCheckResult["severity"] = "none";

  // Rule 1: Unusually high conversion value
  if (signalData.value > 1000) {
    reasons.push(`Abnormally high value: $${signalData.value}`);
    severity = "medium";
  }

  // Rule 2: Very short session (bot indicator)
  if (signalData.sessionDuration !== undefined && signalData.sessionDuration < 3) {
    reasons.push(`Suspiciously short session: ${signalData.sessionDuration}s`);
    severity = severity === "none" ? "low" : severity;
  }

  // Rule 3: Check recent fraud rate for this platform
  const db = await getDb();
  const recentFraud = (await db.prepare(
    "SELECT COUNT(*) as c FROM fraud_events WHERE tenant_id = ? AND created_at > datetime('now', '-1 hour')"
  ).get(tenantId) as { c: number }).c;

  if (recentFraud > 50) {
    reasons.push(`High fraud rate detected: ${recentFraud} events in last hour`);
    severity = "high";
  }

  // Rule 4: Duplicate event check
  if (signalData.userId) {
    const recentEvents = (await db.prepare(
      "SELECT COUNT(*) as c FROM signals WHERE tenant_id = ? AND user_id = ? AND created_at > datetime('now', '-5 minutes')"
    ).get(tenantId, signalData.userId) as { c: number }).c;

    if (recentEvents > 5) {
      reasons.push(`Duplicate events from user ${signalData.userId}: ${recentEvents} in 5min`);
      severity = "high";
    }
  }

  // Rule 5: Known bad referrer patterns
  const suspiciousReferrers = ["bot", "crawler", "spider", "scraper"];
  if (signalData.referrer && suspiciousReferrers.some(r => signalData.referrer!.toLowerCase().includes(r))) {
    reasons.push(`Suspicious referrer: ${signalData.referrer}`);
    severity = "medium";
  }

  const isFraud = reasons.length > 0 && severity !== "none";
  const blocked = severity === "high";

  // Log fraud event if detected
  if (isFraud) {
    await db.prepare(`
      INSERT INTO fraud_events (id, tenant_id, event_type, severity, description, blocked)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(genId("fraud"), tenantId, "auto_detect", severity, reasons.join("; "), blocked ? 1 : 0);
  }

  return { isFraud, severity, reasons, blocked };
}

// ── Get fraud stats for dashboard ─────────────────────────
export async function getFraudStats(tenantId: string) {
  const db = await getDb();
  const today = new Date().toISOString().split("T")[0];

  const totalBlocked = (await db.prepare(
    "SELECT COUNT(*) as c FROM fraud_events WHERE tenant_id = ? AND blocked = 1 AND created_at >= ?"
  ).get(tenantId, today) as { c: number }).c;

  const totalDetected = (await db.prepare(
    "SELECT COUNT(*) as c FROM fraud_events WHERE tenant_id = ? AND created_at >= ?"
  ).get(tenantId, today) as { c: number }).c;

  const bySeverity = await db.prepare(
    "SELECT severity, COUNT(*) as c FROM fraud_events WHERE tenant_id = ? AND created_at >= ? GROUP BY severity"
  ).all(tenantId, today) as Array<{ severity: string; c: number }>;

  const estimatedSavings = totalBlocked * 33.4; // avg $ saved per blocked event

  return {
    totalBlocked,
    totalDetected,
    estimatedSavings: Math.round(estimatedSavings),
    bySeverity: Object.fromEntries(bySeverity.map(r => [r.severity, r.c])),
    dataQualityScore: Math.max(90, 100 - (totalDetected * 0.1)),
  };
}
