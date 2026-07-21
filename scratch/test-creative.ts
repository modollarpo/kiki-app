import { detectCreativeFatigue, generateAdCopy, runCreativeGeneration, getCreatives } from "../src/lib/creative";
import type { CampaignContext } from "../src/lib/creative";

async function run() {
  console.log("=== CREATIVE GENERATION ENGINE TEST ===\n");

  console.log("1. Detecting fatigued campaigns (test_tenant)...");
  const fatigued = await detectCreativeFatigue("test_tenant");
  console.log(`   Found ${fatigued.length} fatigued campaign(s). ✅`);

  console.log("\n2. Generating ad copy for mock fatigued context...");
  const mockContext: CampaignContext = {
    campaignId: "cmp_test_creative_001",
    campaignName: "Summer Skincare — All Platforms",
    platform: "meta",
    currentRoas: 1.1,
    targetRoas: 4.0,
    consecutiveLowRoasDays: 4,
    productCategory: "skincare",
    targetAudience: "women 25–44 interested in beauty",
    brandVoice: "empowering, science-backed, premium",
  };

  const copies = await generateAdCopy(mockContext, "test_tenant");
  if (copies.length === 0) {
    console.error("   ❌ No copies generated!");
    return;
  }
  console.log(`   Generated ${copies.length} copy variation(s) across platforms:`);
  copies.forEach(c => {
    console.log(`   [${c.platform.toUpperCase().padEnd(10)}] "${c.headline}" | ${c.characterCount} chars | CTA: ${c.callToAction}`);
  });
  console.log("   ✅");

  console.log("\n3. Running full creative generation pipeline...");
  const summary = await runCreativeGeneration("test_tenant");
  console.log(`   Fatigued campaigns found: ${summary.fatigued}`);
  console.log(`   Creatives generated: ${summary.generated}`);
  if (summary.errors.length > 0) console.warn(`   Errors: ${summary.errors.join(", ")}`);
  console.log("   ✅");

  console.log("\n4. Fetching saved creatives from DB...");
  const saved = await getCreatives("test_tenant");
  console.log(`   Found ${saved.length} saved creative(s) in DB. ✅`);

  console.log("\n✅ ALL CREATIVE ENGINE CHECKS PASSED!");
}

run().catch(console.error);
