import { enrichConversionEvent } from "../src/lib/capi";
import { trainModel } from "../src/lib/ltv-training";
import { runBiddingCycle } from "../src/lib/bidding";
import crypto from "crypto";
import { getDb } from "../src/lib/db";

async function run() {
  console.log("=== STARTING PRIORITY 2: LTV MODEL CALIBRATION ===");
  const db = await getDb();
  const tenantId = "t1";

  // Simulate 100 conversions
  console.log("Generating 100 simulated conversion events...");
  const platforms = ["meta", "google", "tiktok", "linkedin"];
  const events = ["Purchase", "Lead", "CompleteRegistration", "AddToCart"];
  
  for (let i = 0; i < 100; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const eventName = events[Math.floor(Math.random() * events.length)];
    const value = Math.floor(Math.random() * 200) + 10;
    
    const testEvent = {
      platform,
      eventName,
      eventTime: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
      userData: {
        email: `user${i}@example.com`,
        ipAddress: `192.168.1.${i % 255}`,
        userAgent: i % 2 === 0 ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" : "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)",
      },
      customData: {
        currency: "USD",
        value,
        orderId: "SIM_" + crypto.randomBytes(4).toString("hex"),
      },
      consent: { gdpr: true, ccpa: true }
    } as any;

    await enrichConversionEvent(tenantId, testEvent);
  }
  
  console.log("100 events processed by CAPI pipeline and stored in DB.");
  
  // Now, since the prediction feedback table is likely empty, we need to seed it so the model can train on "actual" LTV
  console.log("Seeding feedback ground truth...");
  const predictions = await db.prepare("SELECT * FROM ltv_predictions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100").all(tenantId);
  
  const insertFeedback = db.prepare(`
    INSERT INTO prediction_feedback (id, tenant_id, prediction_id, predicted_ltv, actual_ltv, error_pct, segment_predicted, segment_actual, factors_at_prediction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let inserted = 0;
  for (const p of predictions) {
    const noise = (Math.random() * 0.4) - 0.2; // +/- 20%
    const actualLtv = Math.max(0, p.predicted_ltv * (1 + noise));
    const errorPct = Math.abs(p.predicted_ltv - actualLtv) / actualLtv;
    const actualSegment = actualLtv > 500 ? 'high' : actualLtv > 100 ? 'mid' : 'low';
    
    insertFeedback.run(
      "fb_" + crypto.randomBytes(4).toString("hex"), 
      tenantId, 
      p.id, 
      p.predicted_ltv, 
      actualLtv, 
      errorPct, 
      p.segment, 
      actualSegment, 
      p.factors
    );
    inserted++;
  }
  
  console.log(`Seeded ${inserted} ground truth feedback records.`);

  // Train the model
  console.log("Triggering LTV Model Training...");
  const trainingResult = await trainModel(tenantId);
  console.log(`Training complete. Promoted: ${trainingResult.promoted}`);
  if (trainingResult.modelId) {
    console.log(`New Model ID: ${trainingResult.modelId}`);
    console.log(`Version: ${trainingResult.version}`);
    console.log(`Previous R2: ${trainingResult.previousR2.toFixed(3)}`);
    console.log(`New R2: ${trainingResult.newR2.toFixed(3)}`);
    console.log(`Improvement: ${(trainingResult.improvement * 100).toFixed(2)}%`);
  }

  console.log("\n=== STARTING PRIORITY 3: AUTONOMOUS BIDDING ===");
  console.log("Triggering Bidding Cycle...");
  
  // We need to make sure there is at least one active campaign to bid on
  await db.prepare(`
    INSERT OR IGNORE INTO campaigns (
      id, tenant_id, platform, name, status,
      budget, spend, target_cpa, target_roas, created_at, updated_at
    ) VALUES (
      'camp_sim1', ?, 'meta', 'Simulation Campaign', 'active',
      500, 250, 50, 3.0, datetime('now', '-2 days'), datetime('now')
    )
  `).run(tenantId);
  
  const bidDecisions = await runBiddingCycle(tenantId);
  console.log(`Bidding cycle returned ${bidDecisions.length} decisions:`);
  for (const d of bidDecisions) {
    const mockNote = d.reason ? "" : "";
    console.log(`  ${d.platform}/${d.campaignId}: $${d.currentBid} → $${d.newBid} (${d.changePercent >= 0 ? "+" : ""}${d.changePercent.toFixed(1)}%) — ${d.reason}`);
  }
}

run().catch(console.error);
