import { NextRequest, NextResponse } from "next/server";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { confirmTopUp } from "@/lib/wallet";

// Stripe webhook — settles pending wallet top-ups after payment success.
// Signature verification uses STRIPE_WEBHOOK_SECRET; without it the route
// refuses to process events (fail-closed) so we never credit on unverified data.
export async function POST(req: NextRequest) {
  if (!stripeEnabled || !stripe) {
    return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!webhookSecret || !sig) {
    return NextResponse.json({ ok: false, error: "Missing webhook secret or signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as { id: string };
    const result = await confirmTopUp(pi.id);
    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
    }
  }

  return NextResponse.json({ ok: true, received: true });
}
