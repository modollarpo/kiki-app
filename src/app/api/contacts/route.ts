export const dynamic = "force-dynamic";
import { getDb, genId } from "@/lib/db";
import { json, jsonError, validateEmail, validateRequired, sanitizeString, getUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/logger";
import { NextRequest } from "next/server";

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);

    const body = await req.json();
    const { firstName, lastName, email, company, message } = body;

    const missing = validateRequired({ firstName, lastName, email, company, message });
    if (missing) return jsonError(missing);

    if (typeof email !== "string" || !validateEmail(email)) return jsonError("Invalid email");
    if (firstName.length > 100) return jsonError("First name too long");
    if (lastName.length > 100) return jsonError("Last name too long");
    if (company.length > 200) return jsonError("Company name too long");
    if (message.length > 5000) return jsonError("Message too long");

    // Public lead-capture endpoint: works without auth. Leads submitted while
    // authenticated are attributed to that tenant; anonymous leads are platform-owned.
    const db = await getDb();
    const id = genId("ctc");
    await db.prepare(`
      INSERT INTO contacts (id, first_name, last_name, email, company, message, status, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, 'new', ?)
    `).run(id, sanitizeString(firstName, 100), sanitizeString(lastName, 100),
      email.toLowerCase().trim(), sanitizeString(company, 200), sanitizeString(message, 5000),
      user?.tenantId ?? null);

    return json({ ok: true, id }, 201);
  } catch (e) {
    return handleApiError(e, "contacts/POST failed");
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return jsonError("Unauthorized", 401);

    const db = await getDb();
    // Contacts are tenant-scoped: regular users only see their own tenant's
    // leads; platform admins may view across tenants.
    const isPlatformAdmin = user.role === "admin" || user.role === "superadmin";
    const contacts = isPlatformAdmin
      ? await db.prepare("SELECT * FROM contacts ORDER BY created_at DESC").all()
      : await db.prepare("SELECT * FROM contacts WHERE tenant_id = ? ORDER BY created_at DESC").all(user.tenantId);
    return json({ contacts, total: contacts.length });
  } catch (e) {
    return handleApiError(e, "contacts/GET failed");
  }
}
