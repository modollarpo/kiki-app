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

interface BigCommerceOrderProduct {
  id?: number | string;
  product_id?: number | string;
  name?: string;
  quantity?: number;
  price?: number;
}

interface BigCommerceBillingAddress {
  email?: string;
  phone?: string;
}

interface BigCommerceOrder {
  id?: number | string;
  orderId?: number | string;
  status?: string;
  total_inc_tax?: number | string;
  total?: number | string;
  currency_code?: string;
  date_created?: string;
  customer_id?: number | string | null;
  billing_address?: BigCommerceBillingAddress | null;
  products?: BigCommerceOrderProduct[];
}

interface BigCommerceCustomer {
  id?: number | string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  order_count?: number | string;
  total_spent?: number | string;
  date_created?: string;
  date_modified?: string;
}

interface BigCommerceList<T> {
  data?: T[];
}

function mapOrder(raw: BigCommerceOrder): CommerceOrder {
  const items: CommerceOrderItem[] = Array.isArray(raw.products)
    ? raw.products.map((p) => ({
        productId: String(p.product_id ?? p.id ?? ""),
        name: String(p.name ?? ""),
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
    currency: String(raw.currency_code ?? "USD"),
    status: String(raw.status ?? ""),
    createdAt: String(raw.date_created ?? new Date().toISOString()),
    items,
    refunded: raw.status === "Refunded",
  };
}

function mapCustomer(raw: BigCommerceCustomer): CommerceCustomer {
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
    const result = await httpClient<BigCommerceList<BigCommerceOrder>>(
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
    const result = await httpClient<BigCommerceList<BigCommerceCustomer>>(
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
    const raw = body as { data?: BigCommerceOrder };
    const order = raw.data ?? (body as BigCommerceOrder);
    return mapOrder(order);
  }
}
