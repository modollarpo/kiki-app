import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { trainModel, getActiveModel, getModelHistory, getFeedbackSummary } from "@/lib/ltv-training";
import { collectWalletFeedback } from "@/lib/ltv-feedback";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const model = await getActiveModel(user.tenantId);
    const history = await getModelHistory(user.tenantId, 10);
    const feedback = await getFeedbackSummary(user.tenantId);

    return NextResponse.json({ model, history, feedback });
  } catch (e) {
    logger.error("ltv/train/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Collect fresh feedback first
    const feedbackResult = await collectWalletFeedback(user.tenantId);

    // Then train
    const result = await trainModel(user.tenantId);

    return NextResponse.json({ ...result, feedbackCollected: feedbackResult.newFeedbackCount });
  } catch (e) {
    logger.error("ltv/train/handler", { message: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
