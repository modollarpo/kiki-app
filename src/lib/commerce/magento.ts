// ============================================================
// KIKI Agent Platform — Magento Commerce Connector
// REST API: orders + customers + webhook HMAC verification.
// ============================================================

import crypto from "crypto";
import {
  type CommerceOrder,
  type CommerceOrderItem,
  type CommerceCustomer,
  type ICommerceConnector,
} from "./types";
import { httpClient } from "./base";

function buildOrdersUrl(shopDomain: string | undefined, since: string, limit: number): string {
  const base = shopDomain?.replace(/\/+$/, "") ?? "";
  const params = new URLSearchParams();
  params.set("searchCriteria[filterGroups][0][filters][0][field]", "created_at");
  params.set("searchCriteria[filterGroups][0][filters][0][value]", since);
  params.set("searchCriteria[filterGroups][0][filters][0][conditionType]", "gt");
  params.set("searchCriteria[pageSize]", String(limit));
  return `${base}/rest/V1/orders?${params.toString()}`;
}

function buildCustomersUrl(shopDomain: string | undefined, limit: number): string {
  const base = shopDomain?.replace(/\/+$/, "") ?? "";
  const params = new URLSearchParams();
  params.set("searchCriteria[pageSize]", String(limit));
  return `${base}/rest/V1/customers/search?${params.toString()}`;
}

function mapOrder(raw: any): CommerceOrder {
  const items: CommerceOrderItem[] = Array.isArray(raw.items)
    ? raw.items.map((it: any) => ({
        productId: String(it.sku ?? it.product_id ?? it.item_id ?? ""),
        name: it.name ?? "",
        quantity: Number(it.qty_ordered ?? it.qty ?? 1),
        price: Number(it.price ?? 0),
      }))
    : [];
  return {
    orderId: String(raw.entity_id ?? raw.increment_id ?? raw.orderId ?? ""),
    customerEmail: raw.customer_email,
    customerPhone: raw.billing_address?.telephone,
    customerId:
      raw.customer_id != null ? String(raw.customer_id) : undefined,
    total: Number(raw.grand_total ?? 0),
    currency: raw.order_currency_code ?? "USD",
    status: raw.status ?? "",
    createdAt: raw.created_at ?? new Date().toISOString(),
    items,
    refunded: raw.status === "closed" && raw.total_refunded > 0,
  };
}

function mapCustomer(raw: any): CommerceCustomer {
  const totalOrders = Number(raw.total_orders ?? 0);
  const totalSpent = Number(raw.total_spent ?? 0);
  return {
    externalId: String(raw.id ?? raw.email ?? ""),
    email: raw.email,
    firstName: raw.firstname,
    lastName: raw.lastname,
    totalOrders,
    totalSpent,
    averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
    lastOrderAt: raw.updated_at
      ? new Date(raw.updated_at).toISOString()
      : undefined,
  };
}

export class MagentoConnector implements ICommerceConnector {
  readonly platformId = "magento" as const;
  readonly name = "Magento";
  readonly authType = "api_key" as const;

  async fetchOrders(
    apiKey: string,
    shopDomain: string | undefined,
    since: string,
    limit: number
  ): Promise<CommerceOrder[]> {
    if (!shopDomain) return [];
    const result = await httpClient<{ items?: any[] }>(
      buildOrdersUrl(shopDomain, since, limit),
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!result.success || !result.data?.items) return [];
    return result.data.items.map(mapOrder);
  }

  async fetchCustomers(
    apiKey: string,
    shopDomain: string | undefined,
    limit: number
  ): Promise<CommerceCustomer[]> {
    if (!shopDomain) return [];
    const result = await httpClient<{ items?: any[] }>(
      buildCustomersUrl(shopDomain, limit),
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!result.success || !result.data?.items) return [];
    return result.data.items.map(mapCustomer);
  }

  verifyWebhook(payload: string, signature: string, secret: string): boolean {
    if (!payload || !signature || !secret) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64");
    return expected === signature;
  }

  parseOrderWebhook(body: unknown): CommerceOrder | null {
    if (!body || typeof body !== "object") return null;
    const raw = body as any;
    return mapOrder(raw);
  }
}
