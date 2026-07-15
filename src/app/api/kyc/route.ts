import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();

  const entities = await db.prepare(`
    SELECT * FROM kyc_entities WHERE tenant_id = ? ORDER BY compliance_score DESC
  `).all(user.tenantId) as any[];

  const documents = await db.prepare(`
    SELECT * FROM kyc_documents WHERE tenant_id = ? ORDER BY created_at DESC
  `).all(user.tenantId) as any[];

  const checks = await db.prepare(`
    SELECT * FROM kyc_checks WHERE tenant_id = ? ORDER BY created_at DESC
  `).all(user.tenantId) as any[];

  const formattedEntities = entities.map(e => ({
    name: e.name,
    type: e.entity_type,
    jurisdiction: e.jurisdiction,
    verificationStatus: e.verification_status,
    documentsUploaded: e.documents_uploaded,
    documentsRequired: e.documents_required,
    checksPassed: e.checks_passed,
    checksFailed: e.checks_failed,
    nextReview: e.next_review || "—",
    complianceScore: e.compliance_score,
  }));

  const formattedDocuments = documents.map(d => ({
    name: d.name,
    status: d.status,
    entity: entities.find(e => e.id === d.entity_id)?.name || "—",
  }));

  const formattedChecks = checks.map(c => ({
    check: c.check_name,
    status: c.status,
    date: c.check_date || "—",
    entity: c.entity_id ? entities.find(e => e.id === c.entity_id)?.name : undefined,
  }));

  return json({
    entities: formattedEntities,
    documents: formattedDocuments,
    checks: formattedChecks,
  });
}
