import { getDb } from "./db";
import { logger } from "./logger";

export interface CrmCustomer {
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
  acquisitionSource?: string;
  acquisitionCampaign?: string;
}

interface ShopifyCustomer {
  id: string | number;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  orders_count?: number;
  total_spent?: number | string;
  created_at?: string;
  updated_at?: string;
  last_order_id?: string | number;
  note?: string;
  last_order_name?: string;
  last_order_date?: string;
}

interface ShopifyCustomersResponse {
  customers: ShopifyCustomer[];
}
interface StripeCustomer {
  id: string;
  email?: string;
  name?: string;
  created: number;
  phone?: string;
}

interface StripeInvoice {
  id: string;
  customer: string;
  status?: string;
  amount_paid?: number;
  created: number;
}

interface StripeList<T> {
  data: T[];
  has_more: boolean;
}

interface HubspotContact {
  id: string;
  properties?: Record<string, string>;
}

interface HubspotContactsResponse {
  results: HubspotContact[];
  paging?: { next?: { after: string } };
}



export async function syncShopifyCustomers(
  tenantId: string,
  accessToken: string,
  shopDomain: string
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;
  let cursor: string | null = null;

  do {
    try {
      const url = `https://${shopDomain}/admin/api/2024-01/customers.json?limit=250${cursor ? `&page_info=${cursor}` : ""}`;
      const response: Response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) break;
      const data = await response.json() as ShopifyCustomersResponse;
      if (!data.customers || data.customers.length === 0) break;

      for (const customer of data.customers) {
        try {
          await upsertCustomer(tenantId, {
            externalId: `shopify_${customer.id}`,
            email: customer.email,
            phone: customer.phone,
            firstName: customer.first_name,
            lastName: customer.last_name,
            totalOrders: customer.orders_count ?? 0,
            totalSpent: parseFloat(String(customer.total_spent || "0")),
            averageOrderValue: customer.orders_count && customer.orders_count > 0 ? (parseFloat(String(customer.total_spent || "0")) / Number(customer.orders_count)) : 0,
            firstOrderAt: customer.orders_count && customer.orders_count > 0 ? customer.created_at : undefined,
            lastOrderAt: customer.last_order_date,
          });
          synced++;
        } catch {
          errors++;
        }
      }

      const linkHeader: string = response.headers.get("Link") || "";
      cursor = linkHeader.includes('rel="next"')
        ? linkHeader.match(/<[^>]*[?&]page_info=([^>&]+)[^>]*>;\s*rel="next"/)?.[1] || null
        : null;
    } catch {
      break;
    }
  } while (cursor);

  logger.info(`Shopify sync: ${synced} customers synced`, { tenantId, errors });
  return { synced, errors };
}

export async function syncStripeCustomers(
  tenantId: string,
  secretKey: string
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;
  let startingAfter: string | null = null;

  do {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (startingAfter) params.set("starting_after", startingAfter);

      const response = await fetch(`https://api.stripe.com/v1/customers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });

      if (!response.ok) break;
      const data = await response.json() as StripeList<StripeCustomer>;
      if (!data.data || data.data.length === 0) break;

      for (const customer of data.data) {
        try {
          // Get customer's invoices for order history
          const invoicesResponse = await fetch(
            `https://api.stripe.com/v1/invoices?customer=${customer.id}&limit=100`,
            { headers: { Authorization: `Bearer ${secretKey}` } }
          );
          const invoices = invoicesResponse.ok ? ((await invoicesResponse.json()) as StripeList<StripeInvoice>).data : [];

          const paid = invoices.filter((i: StripeInvoice) => i.status === "paid");
          const totalSpent = paid.reduce((sum: number, i: StripeInvoice) => sum + (i.amount_paid || 0) / 100, 0);
          const orderCount = paid.length;

          await upsertCustomer(tenantId, {
            externalId: `stripe_${customer.id}`,
            email: customer.email,
            phone: customer.phone,
            firstName: customer.name?.split(" ")[0],
            lastName: customer.name?.split(" ").slice(1).join(" "),
            totalOrders: orderCount,
            totalSpent,
            averageOrderValue: orderCount > 0 ? totalSpent / orderCount : 0,
            firstOrderAt: customer.created ? new Date(customer.created * 1000).toISOString() : undefined,
            lastOrderAt: customer.created ? new Date(customer.created * 1000).toISOString() : undefined,
          });
          synced++;
        } catch {
          errors++;
        }
      }

      startingAfter = data.has_more ? data.data[data.data.length - 1].id : null;
    } catch {
      break;
    }
  } while (startingAfter);

  logger.info(`Stripe sync: ${synced} customers synced`, { tenantId, errors });
  return { synced, errors };
}

export async function syncHubspotContacts(
  tenantId: string,
  accessToken: string
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;
  let after: string | undefined;

  do {
    try {
      const url = `https://api.hubapi.com/crm/v3/objects/contacts?limit=100${after ? `&after=${after}` : ""}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });

      if (!response.ok) break;
      const data = await response.json() as HubspotContactsResponse;

      for (const contact of data.results) {
        try {
          const props = contact.properties || {};
          await upsertCustomer(tenantId, {
            externalId: `hubspot_${contact.id}`,
            email: props.email,
            phone: props.phone,
            firstName: props.firstname,
            lastName: props.lastname,
            totalOrders: parseInt(props.num_orders || "0"),
            totalSpent: parseFloat(props.total_revenue || "0"),
            averageOrderValue: parseFloat(props.avg_order_value || "0"),
          });
          synced++;
        } catch {
          errors++;
        }
      }

      after = data.paging?.next?.after;
    } catch {
      break;
    }
  } while (after);

  logger.info(`HubSpot sync: ${synced} contacts synced`, { tenantId, errors });
  return { synced, errors };
}

async function upsertCustomer(tenantId: string, customer: CrmCustomer): Promise<void> {
  const db = await getDb();

  const existing = await db.prepare(`
    SELECT id FROM customer_profiles
    WHERE tenant_id = ? AND external_id = ?
  `).get(tenantId, customer.externalId) as { id: string } | undefined;

  const id = existing?.id || crypto.randomUUID();
  const daysSinceLastOrder = customer.lastOrderAt
    ? Math.floor((Date.now() - new Date(customer.lastOrderAt).getTime()) / 86400000)
    : undefined;

  // Predict LTV segment
  let ltvSegment = "low";
  if (customer.totalSpent > 500) ltvSegment = "high";
  else if (customer.totalSpent > 200) ltvSegment = "mid";
  else if (customer.totalSpent < 50) ltvSegment = "churn_risk";

  // Simple repeat purchase probability
  const repeatProbability = customer.totalOrders >= 3 ? 0.8
    : customer.totalOrders >= 2 ? 0.5
    : customer.totalOrders >= 1 ? 0.2
    : 0;

  // Churn risk
  const churnRisk = daysSinceLastOrder !== undefined
    ? Math.min(1, daysSinceLastOrder / 180)
    : 0.5;

  const sql = existing
    ? `UPDATE customer_profiles SET
        email = COALESCE(?, email), phone = COALESCE(?, phone),
        first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
        total_orders = ?, total_spent = ?, predicted_ltv = ?,
        ltv_segment = ?, repeat_purchase_probability = ?,
        average_order_value = ?, days_since_last_order = ?,
        churn_risk = ?, last_order_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    : `INSERT INTO customer_profiles
        (id, tenant_id, external_id, email, phone, first_name, last_name,
         total_orders, total_spent, predicted_ltv, ltv_segment,
         repeat_purchase_probability, average_order_value, days_since_last_order,
         churn_risk, first_order_at, last_order_at, acquisition_source, acquisition_campaign)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  if (existing) {
    await db.prepare(sql).run(
      customer.email ?? null, customer.phone ?? null, customer.firstName ?? null, customer.lastName ?? null,
      customer.totalOrders, customer.totalSpent, customer.totalSpent,
      ltvSegment, repeatProbability,
      customer.averageOrderValue, daysSinceLastOrder ?? null,
      churnRisk, customer.lastOrderAt ?? null, id
    );
  } else {
    await db.prepare(sql).run(
      id, tenantId, customer.externalId, customer.email ?? null, customer.phone ?? null,
      customer.firstName ?? null, customer.lastName ?? null,
      customer.totalOrders, customer.totalSpent, customer.totalSpent,
      ltvSegment, repeatProbability,
      customer.averageOrderValue, daysSinceLastOrder ?? null,
      churnRisk, customer.firstOrderAt ?? null, customer.lastOrderAt ?? null,
      customer.acquisitionSource ?? null, customer.acquisitionCampaign ?? null
    );
  }
}

export async function getCrmStats(tenantId: string): Promise<{
  totalCustomers: number;
  segmentBreakdown: Record<string, number>;
  avgLtv: number;
  avgRepeatProbability: number;
  lastSyncAt: string | null;
}> {
  const db = await getDb();
  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      AVG(predicted_ltv) as avg_ltv,
      AVG(repeat_purchase_probability) as avg_repeat,
      MAX(synced_at) as last_sync
    FROM customer_profiles WHERE tenant_id = ?
  `).get(tenantId) as { total: number; avg_ltv: number; avg_repeat: number; last_sync: string };

  const segments = await db.prepare(`
    SELECT ltv_segment, COUNT(*) as cnt
    FROM customer_profiles WHERE tenant_id = ?
    GROUP BY ltv_segment
  `).all(tenantId) as Array<{ ltv_segment: string; cnt: number }>;

  const segmentBreakdown: Record<string, number> = {};
  for (const s of segments) segmentBreakdown[s.ltv_segment] = s.cnt;

  return {
    totalCustomers: stats.total,
    segmentBreakdown,
    avgLtv: stats.avg_ltv || 0,
    avgRepeatProbability: stats.avg_repeat || 0,
    lastSyncAt: stats.last_sync,
  };
}
