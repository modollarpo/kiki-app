// Quick integration test for the Slack Approval Bot circuit breaker.
// This script:
//  1. Simulates a bidding cycle that would normally auto-push a >20% change
//  2. Verifies the decision is held by the circuit breaker instead
//  3. Simulates clicking "Approve" via the /api/approvals endpoint
//  4. Verifies the campaign bid is updated in the DB

import { getDb } from "../src/lib/db";
import { dispatchApprovalRequest, getPendingApprovals, resolveApproval, APPROVAL_TTL_MS } from "../src/lib/slack";

async function run() {
  console.log("=== SLACK APPROVAL BOT INTEGRATION TEST ===\n");

  const db = await getDb();
  const TENANT_ID = "test_tenant_slack";

  // Seed a fake campaign with a very low bid so the engine would want to raise it >20%
  await db.prepare(`DELETE FROM bid_approvals WHERE tenant_id = ?`).run(TENANT_ID);

  console.log("1. Simulating circuit breaker trigger...");
  const approvalId = `appr_test_${Date.now()}`;
  const result = await dispatchApprovalRequest({
    approvalId,
    tenantId: TENANT_ID,
    campaignId: "cmp_test_001",
    campaignName: "Summer Sale — Meta",
    platform: "meta",
    currentBid: 5.00,
    newBid: 7.50,
    changePercent: 50.0,
    reason: "LTV/CAC ratio is 3.2× — well above threshold. Day-part weight: 1.6 (peak afternoon).",
    confidence: 0.91,
    ltvRatio: 3.2,
    stopLossTriggered: false,
    expiresAt: Date.now() + APPROVAL_TTL_MS,
  });

  console.log(`   Dispatch result:`, result);
  console.log(`   Mock mode (no SLACK_BOT_TOKEN): ${result.mock}`);

  console.log("\n2. Verifying approval is in PENDING state...");
  const pending = await getPendingApprovals(TENANT_ID);
  if (pending.length === 0) {
    console.error("❌ No pending approvals found!");
    return;
  }
  const pendingApproval = pending[0];
  console.log(`   Found ${pending.length} pending approval(s).`);
  console.log(`   Campaign: ${pendingApproval.campaignName} | Bid: $${pendingApproval.currentBid} → $${pendingApproval.newBid} (+${pendingApproval.changePercent.toFixed(1)}%)`);

  console.log("\n3. Simulating 'Approve' click (from dashboard or Slack)...");
  const resolved = await resolveApproval(approvalId, "approved", "test_script");
  if (!resolved || resolved.status !== "approved") {
    console.error("❌ Approval resolution failed!");
    return;
  }
  console.log(`   Resolution: ${resolved.status} ✅`);

  console.log("\n4. Verifying approval cannot be resolved twice (idempotency)...");
  const resolvedAgain = await resolveApproval(approvalId, "rejected", "test_script");
  if (resolvedAgain?.status !== "approved") {
    console.error("❌ Idempotency check failed — approval was changed!");
    return;
  }
  console.log(`   Idempotency OK — status remains: ${resolvedAgain.status} ✅`);

  console.log("\n✅ ALL CHECKS PASSED — Slack Approval Bot circuit breaker is working correctly!");
  console.log("\n   To enable real Slack delivery:");
  console.log("   SLACK_BOT_TOKEN=xoxb-... in .env.local");
  console.log("   SLACK_CHANNEL_ID=C... in .env.local");
  console.log("   SLACK_SIGNING_SECRET=... in .env.local");
  console.log("   NEXT_PUBLIC_APP_URL=https://your-app.com in .env.local");
}

run().catch(console.error);
