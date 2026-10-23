export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb, genId, type SqlParam } from "@/lib/db";
import { getUserFromRequest, validateEmail, sanitizeString } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";

const CONTACT_STATUSES = ["new", "contacted", "qualified", "customer", "lost"];

interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  status: string;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const tenantId = user.tenantId;

    const contacts = await (await db.prepare(`
      SELECT id, first_name, last_name, email, company, status, created_at
      FROM contacts WHERE tenant_id = ? ORDER BY created_at DESC
    `)).all<ContactRow>(tenantId);

    const totalContacts = contacts.length;
    const recentLeads = contacts
      .filter(c => c.status === "new")
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        company: c.company,
        status: c.status,
        createdAt: c.created_at,
      }));

    // Get campaign pipeline value as pipeline proxy
    const pipelineValue = await (await db.prepare(`
      SELECT COALESCE(SUM(budget), 0) as total FROM campaigns WHERE tenant_id = ?
    `)).get<{ total: number }>(tenantId);

    const activeDeals = await (await db.prepare(`
      SELECT COUNT(*) as count FROM campaigns WHERE tenant_id = ? AND status = 'active'
    `)).get<{ count: number }>(tenantId);

    // Get contact status distribution
      const statusDistribution = await (await db.prepare(`
      SELECT status, COUNT(*) as count FROM contacts WHERE tenant_id = ? GROUP BY status
`)).all<{ status: string; count: number }>(tenantId);

    return Response.json({
      ok: true,
      data: {
        stats: {
          totalContacts,
          pipelineValue: pipelineValue?.total || 0,
          activeDeals: activeDeals?.count || 0,
          avgDealSize: (activeDeals?.count || 0) > 0 ? Math.round((pipelineValue?.total || 0) / activeDeals!.count) : 0,
          conversionRate: totalContacts > 0 ? Math.round((activeDeals?.count || 0) / totalContacts * 1000) / 10 : 0,
        },
        recentLeads,
        statusDistribution: statusDistribution.map(s => ({ status: s.status, count: s.count })),
        contacts: contacts.slice(0, 50).map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          email: c.email,
          company: c.company,
          status: c.status,
          createdAt: c.created_at,
        })),
      },
    });
  } catch (error) {
    logger.error("crm/handler", { message: error instanceof Error ? error.message : String(error) });
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const status = typeof body.status === "string" && CONTACT_STATUSES.includes(body.status) ? body.status : "new";

    if (!name) return Response.json({ ok: false, error: "Name is required" }, { status: 400 });
    if (!email || !validateEmail(email)) return Response.json({ ok: false, error: "Valid email is required" }, { status: 400 });
    if (name.length > 200) return Response.json({ ok: false, error: "Name too long" }, { status: 400 });
    if (company.length > 200) return Response.json({ ok: false, error: "Company too long" }, { status: 400 });

    const parts = name.split(/\s+/);
    const firstName = sanitizeString(parts[0] || name, 100);
    const lastName = sanitizeString(parts.slice(1).join(" "), 100);
    const db = await getDb();
    const id = genId("ctc");

    await db.prepare(`
      INSERT INTO contacts (id, first_name, last_name, email, company, message, status, tenant_id)
      VALUES (?, ?, ?, ?, ?, '', ?, ?)
    `).run(id, firstName, lastName, email, sanitizeString(company, 200), status, user.tenantId);

    return Response.json({ ok: true, data: { id, name, email, company, status } }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "crm/POST");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return Response.json({ ok: false, error: "id required" }, { status: 400 });

    const existing = await getDb().then(db => db.prepare(
      "SELECT id FROM contacts WHERE id = ? AND tenant_id = ?"
    ).get(id, user.tenantId));
    if (!existing) return Response.json({ ok: false, error: "Contact not found" }, { status: 404 });

    const updates: string[] = [];
    const values: SqlParam[] = [];

    if (typeof body.status === "string") {
      if (!CONTACT_STATUSES.includes(body.status)) {
        return Response.json({ ok: false, error: "Invalid status" }, { status: 400 });
      }
      updates.push("status = ?");
      values.push(body.status);
    }
    if (typeof body.company === "string") {
      const company = body.company.trim();
      if (company.length > 200) return Response.json({ ok: false, error: "Company too long" }, { status: 400 });
      updates.push("company = ?");
      values.push(sanitizeString(company, 200));
    }
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return Response.json({ ok: false, error: "Name cannot be empty" }, { status: 400 });
      if (name.length > 200) return Response.json({ ok: false, error: "Name too long" }, { status: 400 });
      const parts = name.split(/\s+/);
      updates.push("first_name = ?", "last_name = ?");
      values.push(sanitizeString(parts[0] || name, 100), sanitizeString(parts.slice(1).join(" "), 100));
    }

    if (updates.length === 0) return Response.json({ ok: false, error: "No updates provided" }, { status: 400 });

    values.push(id, user.tenantId);
    const db = await getDb();
    await db.prepare(`UPDATE contacts SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`).run(...values);

    return Response.json({ ok: true, data: { id } });
  } catch (error) {
    return handleApiError(error, "crm/PUT");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) return Response.json({ ok: false, error: "id required" }, { status: 400 });

    const db = await getDb();
    const existing = await db.prepare("SELECT id FROM contacts WHERE id = ? AND tenant_id = ?").get(id, user.tenantId);
    if (!existing) return Response.json({ ok: false, error: "Contact not found" }, { status: 404 });

    await db.prepare("DELETE FROM contacts WHERE id = ? AND tenant_id = ?").run(id, user.tenantId);
    return Response.json({ ok: true, data: { id, deleted: true } });
  } catch (error) {
    return handleApiError(error, "crm/DELETE");
  }
}
