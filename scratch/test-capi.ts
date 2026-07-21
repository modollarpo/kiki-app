import { enrichConversionEvent } from "../src/lib/capi";
import { getDb } from "../src/lib/db";
import crypto from "crypto";

async function run() {
  const db = await getDb();
  console.log("Testing CAPI pipeline...");

  const testEvent = {
    platform: "meta",
    eventName: "Purchase",
    eventTime: Math.floor(Date.now() / 1000),
    userData: {
      email: "test@example.com",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    customData: {
      currency: "USD",
      value: 125.50,
      orderId: "ORDER_" + crypto.randomBytes(4).toString("hex"),
    },
    consent: {
      gdpr: true,
      ccpa: true
    }
  } as any;

  try {
    const result = await enrichConversionEvent("t1", testEvent);
    console.log("Pipeline result:", JSON.stringify(result, null, 2));
    
    // Check if the signal was saved to DB
    const signal = await db.prepare('SELECT * FROM signals WHERE id = ?').get(result.id);
    if (signal) {
      console.log("SUCCESS: Signal saved to database with LTV prediction!");
    }
  } catch (error) {
    console.error("Pipeline failed:", error);
  }
}

run().catch(console.error);
