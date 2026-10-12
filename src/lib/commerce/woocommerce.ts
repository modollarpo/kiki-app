// ============================================================
// KIKI Agent Platform — WooCommerce Commerce Connector
// REST API: orders + customers + webhook signature verification.
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
  const params = new URLSearchParams({
    after: since,
    per_page: String(limit),
    status: "completed",
  });
  return `${base}/wp-json/wc/v3/orders?${params.toString()}`;
}

function buildCustomersUrl(shopDomain: string | undefined, limit: number): string {
  const base = shopDomain?.replace(/\/+$/, "") ?? "";
  const params = new URLSearchParams({ per_page: String(limit) });
  return `${base}/wp-json/wc/v3/customers?${params.toString()}`;
}

interface WooLineItem {
  id?: number | string;
  product_id?: number | string;
  name?: string;
  quantity?: number | string;
  price?: number | string;
}

interface WooBilling {
  email?: string;
  phone?: string;
}

interface WooOrder {
  id?: number | string;
  orderId?: string;
  customer_id?: number | string | null;
  total?: number | string;
  currency?: string;
  status?: string;
  date_created?: string;
  date_created_gmt?: string;
  billing?: WooBilling | null;
  line_items?: WooLineItem[];
}

interface WooCustomer {
  id?: number | string;
  email?: string;
  first_name?: string;
  last_name?: string;
  orders_count?: number | string;
  total_spent?: number | string;
  last_order?: string;
}

function mapOrder(raw: WooOrder): CommerceOrder {
  const items: CommerceOrderItem[] = Array.isArray(raw.line_items)
    ? raw.line_items.map((li) => ({
        productId: String(li.product_id ?? li.id ?? ""),
        name: String(li.name ?? ""),
        quantity: Number(li.quantity ?? 1),
        price: Number(li.price ?? 0),
      }))
    : [];
  const billing = raw.billing ?? {};
  return {
    orderId: String(raw.id ?? raw.orderId ?? ""),
    customerEmail: billing.email,
    customerPhone: billing.phone,
    customerId: raw.customer_id != null ? String(raw.customer_id) : undefined,
    total: Number(raw.total ?? 0),
    currency: String(raw.currency ?? "USD"),
    status: String(raw.status ?? ""),
    createdAt: String(raw.date_created ?? raw.date_created_gmt ?? new Date().toISOString()),
    items,
    refunded: raw.status === "refunded",
  };
}

function mapCustomer(raw: WooCustomer): CommerceCustomer {
  const totalOrders = Number(raw.orders_count ?? 0);
  const totalSpent = Number(raw.total_spent ?? 0);
  return {
    externalId: String(raw.id ?? raw.email ?? ""),
    email: raw.email,
    firstName: raw.first_name,
    lastName: raw.last_name,
    totalOrders,
    totalSpent,
    averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
    lastOrderAt: raw.last_order != null ? new Date(raw.last_order).toISOString() : undefined,
  };
}

export class WooCommerceConnector implements ICommerceConnector {
  readonly platformId = "woocommerce" as const;
  readonly name = "WooCommerce";
  readonly authType = "api_key" as const;

  async fetchOrders(
    apiKey: string,
    shopDomain: string | undefined,
    since: string,
    limit: number
  ): Promise<CommerceOrder[]> {
    if (!shopDomain) return [];
    const [key, secret] = apiKey.split(":");
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const result = await httpClient<WooOrder[]>(buildOrdersUrl(shopDomain, since, limit), {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!result.success || !Array.isArray(result.data)) return [];
    return result.data.map(mapOrder);
  }

  async fetchCustomers(
    apiKey: string,
    shopDomain: string | undefined,
    limit: number
  ): Promise<CommerceCustomer[]> {
    if (!shopDomain) return [];
    const [key, secret] = apiKey.split(":");
    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const result = await httpClient<WooCustomer[]>(buildCustomersUrl(shopDomain, limit), {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!result.success || !Array.isArray(result.data)) return [];
    return result.data.map(mapCustomer);
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
    const raw = body as WooOrder;
    if (raw.status && raw.status !== "completed" && raw.status !== "processing") {
      return null;
    }
    return mapOrder(raw);
  }
}
