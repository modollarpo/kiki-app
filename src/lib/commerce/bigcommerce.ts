// ============================================================
// KIKI Agent Platform — BigCommerce Commerce Connector
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

function buildOrdersUrl(storeHash: string | undefined, since: string, limit: number): string {
  const hash = storeHash?.replace(/\/+$/, "") ?? "";
  const params = new URLSearchParams({
    min_date_created: since,
    limit: String(limit),
  });
  return `https://api.bigcommerce.com/stores/${hash}/v3/orders?${params.toString()}`;
}

function buildCustomersUrl(storeHash: string | undefined, limit: number): string {
  const hash = storeHash?.replace(/\/+$/, "") ?? "";
  const params = new URLSearchParams({ limit: String(limit) });
  return `https://api.bigcommerce.com/stores/${hash}/v3/customers?${params.toString()}`;
}

function mapOrder(raw: any): CommerceOrder {
  const items: CommerceOrderItem[] = Array.isArray(raw.products)
    ? raw.products.map((p: any) => ({
        productId: String(p.product_id ?? p.id ?? ""),
        name: p.name ?? "",
        quantity: Number(p.quantity ?? 1),
        price: Number(p.price ?? 0),
      }))
    : [];
  return {
    orderId: String(raw.id ?? raw.orderId ?? ""),
    customerEmail: raw.billing_address?.email,
    customerPhone: raw.billing_address?.phone,
    customerId: raw.customer_id != null ? String(raw.customer_id) : undefined,
    total: Number(raw.total_inc_tax ?? raw.total ?? 0),
    currency: raw.currency_code ?? "USD",
    status: raw.status ?? "",
    createdAt: raw.date_created ?? new Date().toISOString(),
    items,
    refunded: raw.status === "Refunded",
  };
}

function mapCustomer(raw: any): CommerceCustomer {
  const totalOrders = Number(raw.order_count ?? 0);
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
    firstOrderAt: raw.date_created
      ? new Date(raw.date_created).toISOString()
      : undefined,
    lastOrderAt: raw.date_modified
      ? new Date(raw.date_modified).toISOString()
      : undefined,
  };
}

export class BigCommerceConnector implements ICommerceConnector {
  readonly platformId = "bigcommerce" as const;
  readonly name = "BigCommerce";
  readonly authType = "api_key" as const;

  async fetchOrders(
    apiKey: string,
    shopDomain: string | undefined,
    since: string,
    limit: number
  ): Promise<CommerceOrder[]> {
    if (!shopDomain) return [];
    const [key, secret] = apiKey.split(":");
    const result = await httpClient<{ data?: any[] }>(
      buildOrdersUrl(shopDomain, since, limit),
      {
        headers: {
          "X-Auth-Token": secret,
          "X-Auth-Client": key,
        },
      }
    );
    if (!result.success || !result.data?.data) return [];
    return result.data.data.map(mapOrder);
  }

  async fetchCustomers(
    apiKey: string,
    shopDomain: string | undefined,
    limit: number
  ): Promise<CommerceCustomer[]> {
    if (!shopDomain) return [];
    const [key, secret] = apiKey.split(":");
    const result = await httpClient<{ data?: any[] }>(
      buildCustomersUrl(shopDomain, limit),
      {
        headers: {
          "X-Auth-Token": secret,
          "X-Auth-Client": key,
        },
      }
    );
    if (!result.success || !result.data?.data) return [];
    return result.data.data.map(mapCustomer);
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
    const order = raw.data ?? raw;
    return mapOrder(order);
  }
}
