// ============================================================
// KIKI Agent Platform — Shopify Commerce Connector
// Admin API: orders + customers + webhook HMAC verification.
// ============================================================

import crypto from "crypto";
import {
  type CommerceOrder,
  type CommerceOrderItem,
  type CommerceCustomer,
  type ICommerceConnector,
} from "./types";
import { httpClient } from "./base";

function buildUrl(shopDomain: string | undefined, path: string, params: Record<string, string>): string {
  const base = shopDomain?.replace(/\/+$/, "") ?? "";
  const query = new URLSearchParams(params).toString();
  return `${base}${path}?${query}`;
}

function mapOrder(raw: any): CommerceOrder {
  const items: CommerceOrderItem[] = Array.isArray(raw.line_items)
    ? raw.line_items.map((li: any) => ({
        productId: String(li.product_id ?? li.id ?? ""),
        name: li.name ?? "",
        quantity: Number(li.quantity ?? 1),
        price: Number(li.price ?? 0),
      }))
    : [];
  const customer = raw.customer ?? {};
  return {
    orderId: String(raw.id ?? raw.orderId ?? ""),
    customerEmail: raw.email ?? customer.email,
    customerPhone: raw.phone ?? customer.phone,
    customerId: customer.id != null ? String(customer.id) : undefined,
    total: Number(raw.total_price ?? 0),
    currency: raw.currency ?? "USD",
    status: raw.financial_status ?? raw.status ?? "",
    createdAt: raw.created_at ?? new Date().toISOString(),
    items,
    refunded: raw.financial_status === "refunded",
  };
}

function mapCustomer(raw: any): CommerceCustomer {
  const totalOrders = Number(raw.orders_count ?? 0);
  const totalSpent = Number(raw.total_spent ?? 0);
  return {
    externalId: String(raw.id ?? raw.email ?? ""),
    email: raw.email,
    phone: raw.phone,
    firstName: raw.first_name,
    lastName: raw.last_name,
    totalOrders,
    totalSpent,
    averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
    firstOrderAt: raw.note?.first_order_at,
    lastOrderAt: raw.updated_at
      ? new Date(raw.updated_at).toISOString()
      : undefined,
  };
}

export class ShopifyConnector implements ICommerceConnector {
  readonly platformId = "shopify" as const;
  readonly name = "Shopify";
  readonly authType = "api_key" as const;

  async fetchOrders(
    apiKey: string,
    shopDomain: string | undefined,
    since: string,
    limit: number
  ): Promise<CommerceOrder[]> {
    if (!shopDomain) return [];
    const url = buildUrl(shopDomain, "/admin/api/2024-01/orders.json", {
      status: "any",
      created_at_min: since,
      limit: String(limit),
    });
    const result = await httpClient<{ orders?: any[] }>(url, {
      headers: { "X-Shopify-Access-Token": apiKey },
    });
    if (!result.success || !result.data?.orders) return [];
    return result.data.orders.map(mapOrder);
  }

  async fetchCustomers(
    apiKey: string,
    shopDomain: string | undefined,
    limit: number
  ): Promise<CommerceCustomer[]> {
    if (!shopDomain) return [];
    const url = buildUrl(shopDomain, "/admin/api/2024-01/customers.json", {
      limit: String(limit),
    });
    const result = await httpClient<{ customers?: any[] }>(url, {
      headers: { "X-Shopify-Access-Token": apiKey },
    });
    if (!result.success || !result.data?.customers) return [];
    return result.data.customers.map(mapCustomer);
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
    const order = raw.order ?? raw;
    if (order.financial_status && order.financial_status !== "paid") {
      return null;
    }
    return mapOrder(order);
  }
}
