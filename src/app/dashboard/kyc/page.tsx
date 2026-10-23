"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, AIThinking, Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";

interface KycEntity {
  id: string;
  name: string;
  type: string;
  jurisdiction: string;
  verificationStatus: string;
  documentsUploaded: number;
  documentsRequired: number;
  checksPassed: number;
  checksFailed: number;
  nextReview: string;
  complianceScore: number;
}

interface KycDocument {
  id: string;
  name: string;
  status: string;
  entity: string;
  entityId: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number;
}

interface KycCheck {
  check: string;
  status: string;
  date: string;
  entity?: string;
}

interface KycData {
  entities: KycEntity[];
  documents: KycDocument[];
  checks: KycCheck[];
}

export default function KycPage() {
  const { token } = useAuth();
  const [data, setData] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("Corporation");
  const [entityJurisdiction, setEntityJurisdiction] = useState("");
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [uploadEntity, setUploadEntity] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useKikiStore(s => s.addToast);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/kyc", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateEntity = async () => {
    if (!token) return;
    if (!entityName.trim()) {
      addToast("error", "Entity name is required");
      return;
    }
    setCreatingEntity(true);
    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create_entity", name: entityName.trim(), type: entityType, jurisdiction: entityJurisdiction.trim() }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Failed to create entity");
      setEntityName("");
      setEntityJurisdiction("");
      setShowEntityForm(false);
      await fetchData();
      addToast("success", "Business entity created");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Failed to create entity");
    } finally {
      setCreatingEntity(false);
    }
  };

  const handleUpload = async () => {
    if (!token) return;
    if (!uploadEntity) {
      addToast("error", "Select an entity first");
      return;
    }
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      addToast("error", "Choose a file to upload");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast("error", "File exceeds the 5MB limit");
      return;
    }
    setUploading(true);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const raw = typeof reader.result === "string" ? reader.result : "";
          resolve(raw.includes(",") ? raw.split(",")[1] : raw);
        };
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "upload_document",
          entityId: uploadEntity,
          name: uploadName.trim() || file.name,
          fileName: file.name,
          mimeType: file.type,
          contentBase64,
        }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Upload failed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadName("");
      await fetchData();
      addToast("success", "Document uploaded");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!token) return;
    if (!confirm("Delete this document?")) return;
    setDeletingDoc(documentId);
    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete_document", documentId }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.ok) throw new Error(result?.error || "Delete failed");
      await fetchData();
      addToast("success", "Document deleted");
    } catch (e) {
      addToast("error", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingDoc(null);
    }
  };

  const entities = useMemo(() => data?.entities || [], [data?.entities]);

  useEffect(() => {
    if (!uploadEntity && entities.length > 0) setUploadEntity(entities[0].id);
  }, [entities, uploadEntity]);

  const documents = data?.documents || [];
  const checks = data?.checks || [];
  const verified = entities.filter(e => e.verificationStatus === "verified").length;

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-[22px]">
          <div>
            <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">KYC &amp; AML</h1>
            <p className="font-mono text-caption text-t3">Entity verification · Document management · Compliance checks</p>
          </div>
          {entities.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setShowEntityForm(v => !v)}>
              {showEntityForm ? "Close" : "+ Add Entity"}
            </Button>
          )}
        </div>

        {showEntityForm && entities.length > 0 && (
          <Card className="mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label htmlFor="kyc-new-name" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">LEGAL NAME</label>
                <input id="kyc-new-name" value={entityName} onChange={e => setEntityName(e.target.value)} placeholder="Acme Inc." className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
              </div>
              <div>
                <label htmlFor="kyc-new-type" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">TYPE</label>
                <select id="kyc-new-type" value={entityType} onChange={e => setEntityType(e.target.value)} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                  {["Corporation", "LLC", "Partnership", "Sole Proprietorship", "Non-Profit"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="kyc-new-jurisdiction" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">JURISDICTION</label>
                <input id="kyc-new-jurisdiction" value={entityJurisdiction} onChange={e => setEntityJurisdiction(e.target.value)} placeholder="Delaware, US" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
              </div>
            </div>
            <Button size="sm" loading={creatingEntity} onClick={handleCreateEntity}>Create Entity</Button>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center p-15">
            <AIThinking text="Loading compliance data..." />
          </div>
        ) : entities.length === 0 ? (
          <Card>
            <div className="p-6">
              <h2 className="font-mono text-small font-bold text-t1 mb-1">No business entities yet</h2>
              <p className="font-mono text-caption text-t3 mb-4">Add a legal entity to begin KYC verification and document collection.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                  <label htmlFor="kyc-entity-name" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">LEGAL NAME</label>
                  <input id="kyc-entity-name" value={entityName} onChange={e => setEntityName(e.target.value)} placeholder="Acme Inc." className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
                </div>
                <div>
                  <label htmlFor="kyc-entity-type" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">TYPE</label>
                  <select id="kyc-entity-type" value={entityType} onChange={e => setEntityType(e.target.value)} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                    {["Corporation", "LLC", "Partnership", "Sole Proprietorship", "Non-Profit"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="kyc-entity-jurisdiction" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">JURISDICTION</label>
                  <input id="kyc-entity-jurisdiction" value={entityJurisdiction} onChange={e => setEntityJurisdiction(e.target.value)} placeholder="Delaware, US" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[10px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
                </div>
              </div>
              <Button size="sm" loading={creatingEntity} onClick={handleCreateEntity}>Create Entity</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard label="Entities Verified" value={`${verified}/${entities.length}`} accent={K.mint} />
              <StatCard label="Documents Uploaded" value={String(documents.filter(d => d.status === "uploaded").length)} accent={K.blue} />
              <StatCard label="Avg Compliance" value={`${entities.length > 0 ? Math.round(entities.reduce((s, e) => s + e.complianceScore, 0) / entities.length) : 0}%`} accent={K.gold} />
              <StatCard label="Failed Checks" value={String(checks.filter(c => c.status === "failed").length)} accent={K.danger} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card accent={K.gold}>
                <h3 className="font-mono text-small font-bold text-t1 mb-[14px]">Business Entities</h3>
                {entities.map(e => (
                  <div key={e.name} className="py-[14px] border-b border-g800">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-mono text-xs font-bold text-t1">{e.name}</p>
                        <p className="font-mono text-caption text-t2">{e.type} · {e.jurisdiction}</p>
                      </div>
                      <Badge
                        color={e.verificationStatus === "verified" ? K.mint : e.verificationStatus === "pending" ? K.warn : K.danger}
                        dot
                      >
                        {e.verificationStatus.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                      <div>
                        <p className="font-mono text-caption text-t4">DOCUMENTS</p>
                        <p className="font-mono text-caption font-bold text-t1">{e.documentsUploaded}/{e.documentsRequired}</p>
                      </div>
                      <div>
                        <p className="font-mono text-caption text-t4">CHECKS</p>
                        <p className="font-mono text-caption font-bold text-t1">{e.checksPassed}P / {e.checksFailed}F</p>
                      </div>
                      <div>
                        <p className="font-mono text-caption text-t4">NEXT REVIEW</p>
                        <p className="font-mono text-caption font-bold text-t1">{e.nextReview}</p>
                      </div>
                    </div>
                    <ProgressBar value={e.complianceScore} max={100} color={e.complianceScore === 100 ? K.mint : e.complianceScore >= 60 ? K.warn : K.danger} height={4} glow label={`${e.name} compliance score`} />
                    <p className="font-mono text-caption text-t4 mt-1 text-right">Compliance: {e.complianceScore}%</p>
                  </div>
                ))}
              </Card>

              <div className="flex flex-col gap-3">
                <Card accent={K.blue}>
                  <h3 className="font-mono text-small font-bold text-t1 mb-[14px]">Documents</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <div>
                      <label htmlFor="kyc-doc-entity" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">ENTITY</label>
                      <select id="kyc-doc-entity" value={uploadEntity} onChange={e => setUploadEntity(e.target.value)} className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[9px] font-mono text-caption text-t1 outline-none focus:border-kblue">
                        {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="kyc-doc-name" className="block font-mono text-caption tracking-widest text-t4 mb-1.5">LABEL (OPTIONAL)</label>
                      <input id="kyc-doc-name" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Certificate of Incorporation" className="w-full bg-g850 border border-g700 rounded-kdls px-3 py-[9px] font-mono text-caption text-t1 outline-none focus:border-kblue" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="block max-w-full font-mono text-caption text-t2 file:mr-2 file:py-1.5 file:px-3 file:rounded-kdls file:border-0 file:bg-g800 file:text-t1 file:font-mono file:text-caption file:cursor-pointer" />
                    <Button size="sm" loading={uploading} onClick={handleUpload}>Upload</Button>
                  </div>
                  <p className="font-mono text-caption text-t4 mb-2">PDF, JPEG, PNG or WEBP · max 5MB</p>
                  {documents.length === 0 ? (
                    <p className="font-mono text-caption text-t4">No documents uploaded.</p>
                  ) : documents.map(d => (
                    <div key={d.id} className="flex items-center gap-[10px] py-2 border-b border-g800">
                      <Badge color={d.status === "uploaded" ? K.mint : d.status === "pending" ? K.warn : K.danger}>
                        {d.status === "uploaded" ? "UPLOADED" : d.status === "pending" ? "PENDING" : "MISSING"}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-caption text-t1 truncate">{d.name}</p>
                        <p className="font-mono text-caption text-t4 truncate">
                          {d.entity}{d.fileName ? ` · ${d.fileName}` : ""}{d.fileSize ? ` · ${Math.max(1, Math.round(d.fileSize / 1024))}KB` : ""}
                        </p>
                      </div>
                      <Button size="xs" variant="ghost" loading={deletingDoc === d.id} onClick={() => handleDeleteDocument(d.id)} style={{ color: K.danger }}>Delete</Button>
                    </div>
                  ))}
                </Card>

                <Card accent={K.teal}>
                  <h3 className="font-mono text-small font-bold text-t1 mb-[14px]">Compliance Checks</h3>
                  {checks.map(c => (
                    <div key={c.check} className="flex items-center gap-[10px] py-2 border-b border-g800">
                      <Badge color={c.status === "passed" ? K.mint : c.status === "failed" ? K.danger : K.warn} dot>
                        {c.status === "passed" ? "PASSED" : c.status === "failed" ? "FAILED" : "PENDING"}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-mono text-caption text-t1">{c.check}</p>
                        {c.entity && <p className="font-mono text-caption text-kdanger">{c.entity}</p>}
                      </div>
                      <span className="font-mono text-caption text-t4">{c.date}</span>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
