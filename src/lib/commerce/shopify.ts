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

interface ShopifyLineItem {
  id?: number | string;
  product_id?: number | string;
  name?: string;
  quantity?: number | string;
  price?: number | string;
}

interface ShopifyCustomerRef {
  id?: number | string;
  email?: string;
  phone?: string;
}

interface ShopifyOrder {
  id?: number | string;
  orderId?: string;
  email?: string;
  phone?: string;
  total_price?: number | string;
  currency?: string;
  financial_status?: string;
  status?: string;
  created_at?: string;
  customer?: ShopifyCustomerRef | null;
  line_items?: ShopifyLineItem[];
}

interface ShopifyNote {
  first_order_at?: string;
}

interface ShopifyCustomer {
  id?: number | string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  orders_count?: number | string;
  total_spent?: number | string;
  updated_at?: string;
  note?: ShopifyNote | string | null;
}

function mapOrder(raw: ShopifyOrder): CommerceOrder {
  const items: CommerceOrderItem[] = Array.isArray(raw.line_items)
    ? raw.line_items.map((li) => ({
        productId: String(li.product_id ?? li.id ?? ""),
        name: String(li.name ?? ""),
        quantity: Number(li.quantity ?? 1),
        price: Number(li.price ?? 0),
      }))
    : [];
  const customer = (raw.customer && typeof raw.customer === "object") ? raw.customer : {};
  return {
    orderId: String(raw.id ?? raw.orderId ?? ""),
    customerEmail: raw.email ?? customer.email,
    customerPhone: raw.phone ?? customer.phone,
    customerId: customer.id != null ? String(customer.id) : undefined,
    total: Number(raw.total_price ?? 0),
    currency: String(raw.currency ?? "USD"),
    status: String(raw.financial_status ?? raw.status ?? ""),
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    items,
    refunded: raw.financial_status === "refunded",
  };
}

function mapCustomer(raw: ShopifyCustomer): CommerceCustomer {
  const totalOrders = Number(raw.orders_count ?? 0);
  const totalSpent = Number(raw.total_spent ?? 0);
  const note = raw.note && typeof raw.note === "object" ? raw.note : undefined;
  return {
    externalId: String(raw.id ?? raw.email ?? ""),
    email: raw.email,
    phone: raw.phone,
    firstName: raw.first_name,
    lastName: raw.last_name,
    totalOrders,
    totalSpent,
    averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
    firstOrderAt: note?.first_order_at,
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
    const result = await httpClient<{ orders?: ShopifyOrder[] }>(url, {
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
    const result = await httpClient<{ customers?: ShopifyCustomer[] }>(url, {
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
    const raw = body as { order?: ShopifyOrder };
    const order = raw.order ?? (body as ShopifyOrder);
    if (order.financial_status && order.financial_status !== "paid") {
      return null;
    }
    return mapOrder(order);
  }
}
