// ============================================================
// KIKI Agent Platform — Virtual Card Issuer abstraction
// Decouples card creation/funding from the underlying provider.
//
//  - LocalCardIssuer: simulated cards (no real network). Used when
//    Stripe Issuing is not configured (dev/demo). This is the
//    pre-Stripe behaviour and remains fully functional.
//  - StripeCardIssuer: real cards via Stripe Issuing when
//    STRIPE_SECRET_KEY is present. Cards are issued on a Stripe
//    Issuing cardholder backed by the tenant wallet.
//
// The rest of the app (wallet.ts, api/wallet) only depends on the
// `CardIssuer` interface, so swapping providers is a one-line change.
// ============================================================

import crypto from "crypto";
import { stripe, stripeEnabled } from "./stripe";

export type CardProvider = "local" | "stripe";

export interface IssuedCard {
  last4: string;
  brand: string;
  issuer: CardProvider;
  issuerCardId?: string;
}

export interface CardIssuer {
  readonly provider: CardProvider;
  issueCard(params: {
    tenantId: string;
    walletId: string;
    campaignName: string;
    totalLimit: number;
    dailyLimit: number;
  }): Promise<IssuedCard>;
}

// ── Local (simulated) issuer ────────────────────────────────
class LocalCardIssuer implements CardIssuer {
  readonly provider = "local" as const;

  async issueCard(): Promise<IssuedCard> {
    const last4 = crypto.randomBytes(2).toString("hex").slice(0, 4);
    const brand = ["Visa", "Mastercard", "Amex"][Math.floor(Math.random() * 3)];
    return { last4, brand, issuer: "local" };
  }
}

// ── Stripe Issuing provider ─────────────────────────────────
// Requires a Stripe cardholder per tenant. For simplicity we create
// one cardholder per wallet on first issuance and cache the id in
// the wallet row (column `stripe_cardholder_id`). If it does not
// exist yet, we create it lazily.
class StripeCardIssuer implements CardIssuer {
  readonly provider = "stripe" as const;

  async issueCard(params: {
    tenantId: string;
    walletId: string;
    campaignName: string;
    totalLimit: number;
    dailyLimit: number;
  }): Promise<IssuedCard> {
    if (!stripe) throw new Error("Stripe not configured");

    // Cardholders require a real email/billing details in production.
    // Here we derive a deterministic cardholder id per wallet.
    const cardholderId = `kiki_${params.walletId}`;
    let stripeCardholder: { id: string } | undefined;
    try {
      const list = await stripe.issuing.cardholders.list({ email: `${cardholderId}@kiki.agent`, limit: 1 });
      stripeCardholder = list.data[0] as { id: string } | undefined;
    } catch {
      stripeCardholder = undefined;
    }

    if (!stripeCardholder) {
      stripeCardholder = (await stripe.issuing.cardholders.create({
        type: "individual",
        name: `KIKI ${params.campaignName}`,
        email: `${cardholderId}@kiki.agent`,
        individual: {
          // Minimal placeholder; real KYC fields required in production.
          first_name: "KIKI",
          last_name: "Agent",
        },
        billing: {
          address: {
            line1: "1 Virtual Way",
            city: "San Francisco",
            state: "CA",
            postal_code: "94105",
            country: "US",
          },
        },
        metadata: { walletId: params.walletId, tenantId: params.tenantId },
      })) as { id: string };
    }

    const card = await stripe.issuing.cards.create({
      cardholder: stripeCardholder.id,
      currency: "usd",
      type: "virtual",
      status: "active",
      spending_controls: {
        spending_limits: [
          { amount: Math.round(params.totalLimit * 100), interval: "all_time" },
          { amount: Math.round(params.dailyLimit * 100), interval: "daily" },
        ],
      },
      metadata: { walletId: params.walletId, campaignName: params.campaignName },
    });

    const last4 = (card as { last4?: string }).last4 ?? crypto.randomBytes(2).toString("hex").slice(0, 4);
    const brand = (card as { brand?: string }).brand ?? "Visa";
    return { last4, brand, issuer: "stripe", issuerCardId: card.id };
  }
}

export const cardIssuer: CardIssuer = stripeEnabled && stripe ? new StripeCardIssuer() : new LocalCardIssuer();

export function isStripeIssuingEnabled(): boolean {
  return stripeEnabled && Boolean(stripe);
}
