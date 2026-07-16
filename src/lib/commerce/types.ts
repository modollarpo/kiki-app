// ============================================================
// KIKI Agent Platform — Commerce Connector Types
// REVENUE SOURCES: e-commerce / CMS platforms that feed
// realized order revenue into the LTV feedback loop.
// Independent from ad-platform connectors (src/lib/connectors).
// ============================================================

export type CommercePlatformId =
  | "shopify"
  | "woocommerce"
  | "magento"
  | "bigcommerce"
  | "square";

export interface CommerceOrder {
  orderId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerId?: string; // platform customer id
  total: number; // order total in currency
  currency: string;
  status: string; // e.g. "paid", "completed", "refunded"
  createdAt: string; // ISO timestamp
  items: CommerceOrderItem[];
  refunded?: boolean;
}

export interface CommerceOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CommerceCustomer {
  externalId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
}

export interface ICommerceConnector {
  readonly platformId: CommercePlatformId;
  readonly name: string;
  readonly authType: "api_key" | "oauth";
  // Pull recent orders (used by manual sync)
  fetchOrders(
    apiKey: string,
    shopDomain: string | undefined,
    since: string,
    limit: number
  ): Promise<CommerceOrder[]>;
  // Pull customers (used by manual sync)
  fetchCustomers(
    apiKey: string,
    shopDomain: string | undefined,
    limit: number
  ): Promise<CommerceCustomer[]>;
  // Verify an incoming webhook signature
  verifyWebhook(payload: string, signature: string, secret: string): boolean;
  // Parse webhook body into a CommerceOrder (only order.create/paid events)
  parseOrderWebhook(body: unknown): CommerceOrder | null;
}
