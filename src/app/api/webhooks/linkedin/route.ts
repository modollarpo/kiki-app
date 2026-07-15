import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "@/lib/webhooks";

export async function POST(req: NextRequest) {
  return handleWebhook(req, "linkedin");
}
