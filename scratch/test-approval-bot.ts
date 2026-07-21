import { runBiddingCycle } from "../src/lib/bidding";
import { getDb } from "../src/lib/db";

async function run() {
  const db = await getDb();
  const tenantId = "t1";

  const existing = await db.prepare(
    "SELECT COUNT(*) as c FROM campaigns WHERE tenant_id = ? AND status = 'active'"
  ).get(tenantId);
  if (!existing || (existing as any).c === 0) {
    await db.prepare(`
      INSERT INTO campaigns (id, tenant_id, name, platform, status, budget, spend, target_cpa, target_roas)
      VALUES ('test_appr1', ?, 'Approval Test Campaign', 'meta', 'active', 500, 250, 50, 4.0)
    `).run(tenantId);
  }

  console.log("Running bidding cycle (look for [KIKI Slack] MOCK messages below)...");
  console.log("If circuit breaker works, you should see MOCK approval messages and NO [MOCK API] messages.\n");

  const decisions = await runBiddingCycle(tenantId);
  const heldCount = decisions.filter(
    (d) => Math.abs(d.changePercent) >= 20 || d.stopLossTriggered
  ).length;

  console.log(`\nTotal decisions: ${decisions.length}, Should-be-held: ${heldCount}`);
  for (const d of decisions) {
    const held =
      Math.abs(d.changePercent) >= 20 || d.stopLossTriggered
        ? "HELD"
        : "AUTO";
    console.log(
      `  ${held} ${d.platform}/${d.campaignId}: $${d.currentBid} -> $${d.newBid} (${d.changePercent >= 0 ? "+" : ""}${d.changePercent.toFixed(1)}%)${d.stopLossTriggered ? " STOP-LOSS" : ""}`
    );
  }
}

run().catch(console.error);
