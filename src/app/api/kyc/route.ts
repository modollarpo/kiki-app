export const dynamic = "force-dynamic";
import { getDb } from "@/lib/db";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";

interface KycEntity {
  id: string;
  name: string;
  entity_type: string;
  jurisdiction: string;
  verification_status: string;
  documents_uploaded: number;
  documents_required: number;
  checks_passed: number;
  checks_failed: number;
  next_review: string | null;
  compliance_score: number;
}

interface KycDocument {
  name: string;
  status: string;
  entity_id: string | null;
}

interface KycCheck {
  check_name: string;
  status: string;
  check_date: string | null;
  entity_id: string | null;
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const db = await getDb();

  const entities = await db.prepare(`
    SELECT * FROM kyc_entities WHERE tenant_id = ? ORDER BY compliance_score DESC
  `).all<KycEntity>(user.tenantId);

  const documents = await db.prepare(`
    SELECT * FROM kyc_documents WHERE tenant_id = ? ORDER BY created_at DESC
  `).all<KycDocument>(user.tenantId);

  const checks = await db.prepare(`
    SELECT * FROM kyc_checks WHERE tenant_id = ? ORDER BY created_at DESC
  `).all<KycCheck>(user.tenantId);

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
