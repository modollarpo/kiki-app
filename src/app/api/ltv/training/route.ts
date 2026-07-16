import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { trainModel, getActiveModel, getModelHistory, getMetacognitionLog, getFeatureStore, getFeedbackSummary } from "@/lib/ltv-training";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const view = url.searchParams.get("view") || "active";

    switch (view) {
      case "active": {
        const model = await getActiveModel(user.tenantId);
        return NextResponse.json({ model });
      }
      case "history": {
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const history = await getModelHistory(user.tenantId, limit);
        return NextResponse.json({ history });
      }
      case "metacognition": {
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const events = await getMetacognitionLog(user.tenantId, limit);
        return NextResponse.json({ events });
      }
      case "features": {
        const features = await getFeatureStore(user.tenantId);
        return NextResponse.json({ features });
      }
      case "feedback": {
        const feedback = await getFeedbackSummary(user.tenantId);
        return NextResponse.json({ feedback });
      }
      default: {
        const model = await getActiveModel(user.tenantId);
        const history = await getModelHistory(user.tenantId, 10);
        const features = await getFeatureStore(user.tenantId);
        const feedback = await getFeedbackSummary(user.tenantId);
        return NextResponse.json({ model, history, features, feedback });
      }
    }
  } catch (e) {
    logger.error("ltv/training/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await trainModel(user.tenantId);
    return NextResponse.json(result);
  } catch (e) {
    logger.error("ltv/training/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
