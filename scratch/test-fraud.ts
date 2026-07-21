import { checkFraud } from "../src/lib/fraud";
import { getDb } from "../src/lib/db";

async function run() {
  const db = await getDb();
  
  // Clean up any old fraud events for the test
  await db.prepare("DELETE FROM fraud_events WHERE tenant_id = 'test_tenant'").run();

  console.log("=== STARTING FRAUD DETECTION TESTS ===");

  // 1. Valid human traffic
  console.log("\n[Test 1] Valid Human Traffic");
  const result1 = await checkFraud("test_tenant", {
    platform: "meta",
    eventType: "purchase",
    value: 50,
    userId: "user_valid_1",
    ipAddress: "192.168.1.100", // Valid/safe
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    sessionDuration: 120,
    referrer: "https://google.com"
  });
  console.log(result1);

  // 2. High value anomaly
  console.log("\n[Test 2] High Value Anomaly");
  const result2 = await checkFraud("test_tenant", {
    platform: "meta",
    eventType: "purchase",
    value: 5000,
    userId: "user_anomaly_1",
    ipAddress: "192.168.1.101",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    sessionDuration: 45,
    referrer: "https://facebook.com"
  });
  console.log(result2);

  // 3. Headless Browser (Device Fingerprinting)
  console.log("\n[Test 3] Headless Browser Bot");
  const result3 = await checkFraud("test_tenant", {
    platform: "google",
    eventType: "lead",
    value: 10,
    userId: "user_bot_1",
    ipAddress: "10.0.0.5",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/92.0.4515.107 Safari/537.36",
    sessionDuration: 1,
    referrer: "direct"
  });
  console.log(result3);

  // 4. IPQualityScore Mock API (Flagged IP)
  console.log("\n[Test 4] Known Malicious IP (Mocked)");
  const result4 = await checkFraud("test_tenant", {
    platform: "tiktok",
    eventType: "purchase",
    value: 20,
    userId: "user_bad_ip",
    ipAddress: "203.0.113.50", // We will mock this specifically to return a high fraud score if no API key
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    sessionDuration: 5,
    referrer: "https://tiktok.com"
  });
  console.log(result4);

}

run().catch(console.error);
