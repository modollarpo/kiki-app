export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const tenantId = user.tenantId;

    const contacts = await (await db.prepare(`
      SELECT id, first_name, last_name, email, company, status, created_at
      FROM contacts WHERE tenant_id = ? ORDER BY created_at DESC
    `)).all(tenantId) as any[];

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
    `)).get(tenantId) as any;

    const activeDeals = await (await db.prepare(`
      SELECT COUNT(*) as count FROM campaigns WHERE tenant_id = ? AND status = 'active'
    `)).get(tenantId) as any;

    // Get contact status distribution
      const statusDistribution = await (await db.prepare(`
      SELECT status, COUNT(*) as count FROM contacts WHERE tenant_id = ? GROUP BY status
    `)).all(tenantId) as any[];

    return Response.json({
      ok: true,
      data: {
        stats: {
          totalContacts,
          pipelineValue: pipelineValue?.total || 0,
          activeDeals: activeDeals?.count || 0,
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
