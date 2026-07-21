// ============================================================
// Fraud Detection Engine — Detects IVT, click fraud, anomalies
// ============================================================

import { getDb, genId } from "./db";
import { UAParser } from "ua-parser-js";

interface FraudCheckResult {
  isFraud: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
  reasons: string[];
  blocked: boolean;
}

// ── Native IP Reputation (Datacenter & Tor detection) ─────
let torExitNodesCache: Set<string> | null = null;
let lastTorFetch = 0;

async function checkNativeIPReputation(ip: string): Promise<{ isBad: boolean; reason?: string }> {
  // 1. Basic Datacenter / Cloud Provider Prefix Check
  const datacenterPrefixes = [
    "35.192.", "35.193.", "35.194.", "34.64.", // GCP Examples
    "3.0.", "3.1.", "3.2.", "3.3.", "54.144.", "54.145.", // AWS Examples
    "104.40.", "104.41.", "104.42.", "104.43.", // Azure Examples
    "159.203.", "162.243.", "104.131.", "104.236.", // DigitalOcean Examples
  ];
  
  if (datacenterPrefixes.some(prefix => ip.startsWith(prefix))) {
    return { isBad: true, reason: `Native Check: IP ${ip} matches known Datacenter/Cloud provider prefix` };
  }

  // 2. Tor Exit Node Check (In-memory cached fetch)
  try {
    const now = Date.now();
    // Refresh cache every 24 hours
    if (!torExitNodesCache || now - lastTorFetch > 86400000) {
      const res = await fetch("https://check.torproject.org/torbulkexitlist", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const text = await res.text();
        const ips = text.split("\n").filter(line => line.trim() && !line.startsWith("#"));
        torExitNodesCache = new Set(ips);
        lastTorFetch = now;
      }
    }
    
    if (torExitNodesCache && torExitNodesCache.has(ip)) {
      return { isBad: true, reason: `Native Check: IP ${ip} is a known Tor Exit Node` };
    }
  } catch {
    // Ignore fetch errors, just skip Tor check
  }

  return { isBad: false };
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

  // Rule 6: Device Fingerprinting via User-Agent
  if (signalData.userAgent) {
    const parser = new UAParser(signalData.userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    
    if (browser.name && browser.name.toLowerCase().includes('headless')) {
      reasons.push(`Headless browser detected: ${browser.name}`);
      severity = "high";
    }
  }

  // Rule 7: IP Reputation (Native -> IPQualityScore Fallback)
  if (signalData.ipAddress) {
    const ip = signalData.ipAddress;
    
    // 1. Try Native Detection First
    const nativeCheck = await checkNativeIPReputation(ip);
    
    if (nativeCheck.isBad) {
      reasons.push(nativeCheck.reason!);
      severity = "critical";
    } else {
      // 2. Fallback to IPQualityScore (if configured) for deep residential proxy checks
      const apiKey = process.env.IPQS_API_KEY;
      
      if (!apiKey) {
        // Mock mode fallback for missing API key
        if (ip === "203.0.113.50") {
          reasons.push(`[MOCK] IP ${ip} has high fraud score (99)`);
          severity = "critical";
        }
      } else {
        try {
          const res = await fetch(`https://ipqualityscore.com/api/json/ip/${apiKey}/${ip}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.fraud_score > 85) {
              reasons.push(`IPQS Fraud Score > 85 for IP ${ip}: ${data.fraud_score}`);
              severity = "critical";
            }
          }
        } catch (e) {
          console.error("IPQS API Error", e);
        }
      }
    }
  }

  const isFraud = reasons.length > 0 && severity !== "none";
  const blocked = severity === "high" || severity === "critical";

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

  // Dynamic savings based on tenant's average CPA from campaigns table
  const avgCpaQuery = await db.prepare(
    "SELECT AVG(cpa) as avgCpa FROM campaigns WHERE tenant_id = ? AND cpa > 0"
  ).get(tenantId) as { avgCpa: number | null };
  const avgCpa = avgCpaQuery.avgCpa || 33.4; // Fallback to 33.4 if no active CPA data
  
  const estimatedSavings = totalBlocked * avgCpa;

  return {
    totalBlocked,
    totalDetected,
    estimatedSavings: Math.round(estimatedSavings),
    bySeverity: Object.fromEntries(bySeverity.map(r => [r.severity, r.c])),
    dataQualityScore: Math.max(90, 100 - (totalDetected * 0.1)),
  };
}
