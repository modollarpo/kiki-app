// ============================================================
// KIKI Agent Platform — Identity Resolution
// Matches conversion signals to customer_profiles rows via a
// stable, privacy-preserving hashed identity (email / phone).
// ============================================================

import { getDb } from "./db";
import { hashEmailIdentity, hashPhoneIdentity } from "./commerce/base";

export interface ResolvedCustomer {
  customerId: string | null; // customer_profiles.id if matched
  identityHash: string; // sha256 of normalized email or phone
  matchMethod: "email" | "phone" | "none";
}

// Match a signal (which carries an email/phone) to a customer_profiles row.
// Hashes the email or phone, then looks up customer_profiles by identity_hash.
export async function resolveCustomer(
  tenantId: string,
  email?: string,
  phone?: string
): Promise<ResolvedCustomer> {
  const hasEmail = !!email && email.trim().length > 0;
  const hasPhone = !!phone && phone.trim().length > 0;

  if (!hasEmail && !hasPhone) {
    return { customerId: null, identityHash: "", matchMethod: "none" };
  }

  const identityHash = hasEmail
    ? hashEmailIdentity(email!)
    : hashPhoneIdentity(phone!);

  const matchMethod: "email" | "phone" = hasEmail ? "email" : "phone";

  const db = await getDb();
  const row = (await db.prepare(`
    SELECT id FROM customer_profiles
    WHERE tenant_id = ? AND identity_hash = ?
    LIMIT 1
  `).get(tenantId, identityHash)) as { id: string } | undefined;

  if (row) {
    return { customerId: row.id, identityHash, matchMethod };
  }

  return { customerId: null, identityHash, matchMethod: "none" };
}
