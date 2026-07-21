import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import {
  getCompetitorConfigs,
  saveCompetitorConfig,
  runCompetitorMonitor,
  fetchCompetitorPrices,
  saveCompetitorSnapshot,
  type CompetitorConfig,
} from "@/lib/competitor";
import { genId } from "@/lib/db";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const configs = await getCompetitorConfigs(user.tenantId);
  return json({ ok: true, configs, count: configs.length });
}

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  let body: { action: string; domain?: string; productCategory?: string; priceDropThreshold?: number; monitoredUrls?: string[] };
  try {
    body = await req.json() as typeof body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (body.action === "run_monitor") {
    const summary = await runCompetitorMonitor(user.tenantId);
    return json({ ok: true, ...summary });
  }

  if (body.action === "add_competitor") {
    const { domain, productCategory = "general", priceDropThreshold = 15, monitoredUrls = [] } = body;
    if (!domain) return jsonError("domain is required", 400);

    const config: CompetitorConfig = {
      id: genId("comp"),
      tenantId: user.tenantId,
      domain,
      productCategory,
      monitoredUrls,
      priceDropThreshold,
      status: "active",
    };

    await saveCompetitorConfig(config);

    // Take first snapshot immediately
    const price = await fetchCompetitorPrices(config);
    await saveCompetitorSnapshot({
      id: genId("snap"),
      competitorId: config.id,
      domain: config.domain,
      productCategory: config.productCategory,
      avgPrice: price,
      sampleUrls: config.monitoredUrls,
      capturedAt: Date.now(),
    });

    return json({ ok: true, config, initialPrice: price });
  }

  return jsonError("Unknown action. Use 'run_monitor' or 'add_competitor'", 400);
}
