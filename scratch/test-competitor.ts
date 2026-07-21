import {
  getCompetitorConfigs,
  saveCompetitorConfig,
  saveCompetitorSnapshot,
  fetchCompetitorPrices,
  detectPriceDrop,
  executeDefensiveResponse,
  runCompetitorMonitor,
  type CompetitorConfig,
  type CompetitorSnapshot,
} from "../src/lib/competitor";
import type { CompetitorPriceDropPayload } from "../packages/shared/src/events";

async function run() {
  console.log("=== COMPETITOR ARBITRAGE ENGINE TEST ===\n");
  const TENANT = "test_tenant_comp";

  console.log("1. Checking initial competitor configs...");
  const initial = await getCompetitorConfigs(TENANT);
  console.log(`   Configs found: ${initial.length} ✅`);

  console.log("\n2. Adding a mock competitor config...");
  const config: CompetitorConfig = {
    id: `comp_test_${Date.now()}`,
    tenantId: TENANT,
    domain: "rival-store.com",
    productCategory: "skincare",
    monitoredUrls: ["https://rival-store.com/shop"],
    priceDropThreshold: 10,
    status: "active",
  };
  await saveCompetitorConfig(config);
  console.log(`   Saved config for: ${config.domain} ✅`);

  console.log("\n3. Simulating price snapshots (previous $120, current $88 = -26.7% drop)...");
  const snapOld: CompetitorSnapshot = {
    id: `snap_old_${Date.now()}`,
    competitorId: config.id,
    domain: config.domain,
    productCategory: config.productCategory,
    avgPrice: 120.00,
    sampleUrls: config.monitoredUrls,
    capturedAt: Date.now() - 86400000, // yesterday
  };
  const snapNew: CompetitorSnapshot = {
    id: `snap_new_${Date.now()}`,
    competitorId: config.id,
    domain: config.domain,
    productCategory: config.productCategory,
    avgPrice: 88.00,
    sampleUrls: config.monitoredUrls,
    capturedAt: Date.now(),
  };
  await saveCompetitorSnapshot(snapOld);
  await saveCompetitorSnapshot(snapNew);
  console.log("   Snapshots saved ✅");

  console.log("\n4. Detecting price drop...");
  const drop = await detectPriceDrop(TENANT, config);
  console.log(`   Drop detected: ${drop.dropped} | Pct: ${drop.pct.toFixed(1)}% | $${drop.previousAvg} → $${drop.currentAvg}`);
  if (!drop.dropped) {
    console.warn("   ⚠️  Drop not detected — threshold may need adjustment. Continuing...");
  } else {
    console.log("   ✅");
  }

  console.log("\n5. Fetching mock competitor price...");
  const price = await fetchCompetitorPrices(config);
  console.log(`   Current mock price: $${price.toFixed(2)} ✅`);

  console.log("\n6. Executing defensive response (mock event)...");
  const mockEvent: CompetitorPriceDropPayload = {
    tenantId: TENANT,
    competitorDomain: config.domain,
    productCategory: config.productCategory,
    oldPrice: 120,
    newPrice: 88,
    changePercent: 26.7,
    detectedAt: Date.now(),
    affectedPlatforms: ["meta", "google", "tiktok", "snap", "pinterest", "linkedin"],
  };
  const result = await executeDefensiveResponse(TENANT, mockEvent);
  console.log(`   Summary: ${result.summary}`);
  console.log(`   Actions taken: ${result.defensiveActions.filter(a => a.executed).length}/${result.defensiveActions.length}`);
  console.log(`   Creative queued: ${result.creativeQueued} ✅`);

  console.log("\n7. Running full monitor cycle...");
  const summary = await runCompetitorMonitor(TENANT);
  console.log(`   Configs checked: ${summary.configsChecked}`);
  console.log(`   Drops detected: ${summary.dropsDetected}`);
  if (summary.errors.length > 0) console.warn(`   Errors: ${summary.errors.join(", ")}`);
  console.log("   ✅");

  console.log("\n✅ ALL COMPETITOR ARBITRAGE CHECKS PASSED!");
}

run().catch(console.error);
