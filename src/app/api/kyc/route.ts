export const dynamic = "force-dynamic";
import { randomUUID } from "crypto";
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
  id: string;
  name: string;
  status: string;
  entity_id: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number;
}

interface KycCheck {
  check_name: string;
  status: string;
  check_date: string | null;
  entity_id: string | null;
}

const ALLOWED_DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_DOC_BYTES = 5 * 1024 * 1024;

async function recomputeEntityScore(entityId: string, tenantId: string) {
  const db = await getDb();
  const entity = await db.prepare(
    "SELECT documents_required, checks_passed, checks_failed FROM kyc_entities WHERE id = ? AND tenant_id = ?"
  ).get<{ documents_required: number; checks_passed: number; checks_failed: number }>(entityId, tenantId);
  if (!entity) return 0;

  const docs = await db.prepare(
    "SELECT COUNT(*) AS c FROM kyc_documents WHERE entity_id = ? AND tenant_id = ? AND status = 'uploaded'"
  ).get<{ c: number }>(entityId, tenantId);
  const uploaded = docs?.c || 0;
  const required = Math.max(entity.documents_required || 1, 1);
  const totalChecks = (entity.checks_passed || 0) + (entity.checks_failed || 0);
  const docScore = Math.min(uploaded / required, 1) * 60;
  const checkScore = totalChecks > 0 ? (entity.checks_passed / totalChecks) * 40 : 0;
  const score = Math.round(docScore + checkScore);

  await db.prepare(
    "UPDATE kyc_entities SET documents_uploaded = ?, compliance_score = ? WHERE id = ? AND tenant_id = ?"
  ).run(uploaded, score, entityId, tenantId);
  return score;
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
    id: e.id,
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
    id: d.id,
    name: d.name,
    status: d.status,
    entity: entities.find(e => e.id === d.entity_id)?.name || "—",
    entityId: d.entity_id,
    fileName: d.file_name || null,
    mimeType: d.mime_type || null,
    fileSize: d.file_size || 0,
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

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);
  if (!["admin", "superadmin", "finance"].includes(user.role)) {
    return jsonError("Forbidden", 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const action = body.action;
  const db = await getDb();

  if (action === "create_entity") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return jsonError("Entity name required", 400);
    if (name.length > 200) return jsonError("Entity name too long", 400);

    const entityType = typeof body.type === "string" && body.type.trim() ? body.type.trim() : "Corporation";
    const jurisdiction = typeof body.jurisdiction === "string" ? body.jurisdiction.trim() : "";
    const required = typeof body.documentsRequired === "number" && body.documentsRequired > 0
      ? Math.min(Math.round(body.documentsRequired), 20)
      : 5;
    const id = randomUUID();

    await db.prepare(`
      INSERT INTO kyc_entities (id, tenant_id, name, entity_type, jurisdiction, verification_status, documents_uploaded, documents_required, checks_passed, checks_failed, next_review, compliance_score)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, 0, 0, NULL, 0)
    `).run(id, user.tenantId, name, entityType, jurisdiction, required);

    return json({ id, name, type: entityType, jurisdiction, verificationStatus: "pending", documentsUploaded: 0, documentsRequired: required, checksPassed: 0, checksFailed: 0, nextReview: "—", complianceScore: 0 });
  }

  if (action === "upload_document") {
    const entityId = typeof body.entityId === "string" ? body.entityId : "";
    if (!entityId) return jsonError("entityId required", 400);

    const entity = await db.prepare(
      "SELECT id FROM kyc_entities WHERE id = ? AND tenant_id = ?"
    ).get<{ id: string }>(entityId, user.tenantId);
    if (!entity) return jsonError("Entity not found", 404);

    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const contentBase64 = typeof body.contentBase64 === "string" ? body.contentBase64 : "";
    if (!fileName) return jsonError("File name required", 400);
    if (!ALLOWED_DOC_TYPES.has(mimeType)) {
      return jsonError("Unsupported file type. Upload a PDF, JPEG, PNG, or WEBP.", 400);
    }
    if (!contentBase64) return jsonError("File content required", 400);

    let size = 0;
    try {
      size = Buffer.from(contentBase64, "base64").byteLength;
    } catch {
      return jsonError("Invalid file content", 400);
    }
    if (size <= 0) return jsonError("Empty file", 400);
    if (size > MAX_DOC_BYTES) return jsonError("File exceeds the 5MB limit", 413);

    const docName = typeof body.name === "string" && body.name.trim() ? body.name.trim() : fileName;
    const id = randomUUID();

    await db.prepare(`
      INSERT INTO kyc_documents (id, tenant_id, entity_id, name, status, file_name, mime_type, file_size, content_base64, uploaded_by)
      VALUES (?, ?, ?, ?, 'uploaded', ?, ?, ?, ?, ?)
    `).run(id, user.tenantId, entityId, docName, fileName, mimeType, size, contentBase64, user.id);

    const complianceScore = await recomputeEntityScore(entityId, user.tenantId);

    return json({ id, name: docName, status: "uploaded", entityId, fileName, mimeType, fileSize: size, complianceScore });
  }

  if (action === "delete_document") {
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    if (!documentId) return jsonError("documentId required", 400);

    const doc = await db.prepare(
      "SELECT id, entity_id FROM kyc_documents WHERE id = ? AND tenant_id = ?"
    ).get<{ id: string; entity_id: string }>(documentId, user.tenantId);
    if (!doc) return jsonError("Document not found", 404);

    await db.prepare("DELETE FROM kyc_documents WHERE id = ? AND tenant_id = ?").run(documentId, user.tenantId);
    const complianceScore = await recomputeEntityScore(doc.entity_id, user.tenantId);
    return json({ deleted: true, complianceScore });
  }

  return jsonError("Unknown action", 400);
}
