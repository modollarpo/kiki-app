"use client";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard, Card, Badge, ProgressBar, Button, AIThinking } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { K } from "@/lib/kdls";

interface KycEntity {
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
  name: string;
  status: string;
  entity: string;
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

  const entities = data?.entities || [];
  const documents = data?.documents || [];
  const checks = data?.checks || [];
  const verified = entities.filter(e => e.verificationStatus === "verified").length;
  const totalChecks = checks.length;
  const passedChecks = checks.filter(c => c.status === "passed").length;

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[1400px]">
        <div className="mb-[22px]">
          <h1 className="font-mono font-bold text-lg text-t1 tracking-tight mb-1">KYC &amp; AML</h1>
          <p className="font-mono text-[11px] text-t3">Entity verification · Document management · Compliance checks</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-15">
            <AIThinking text="Loading compliance data..." />
          </div>
        ) : entities.length === 0 ? (
          <Card>
            <div className="p-10 text-center">
              <p className="font-mono text-xs text-t4 mb-3">No entities found.</p>
              <Button variant="primary" size="sm">+ Add Entity</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard label="Entities Verified" value={`${verified}/${entities.length}`} accent={K.mint} />
              <StatCard label="Documents Uploaded" value={String(documents.filter(d => d.status === "uploaded").length)} accent={K.blue} />
              <StatCard label="Compliance Score" value={`${totalChecks > 0 ? Math.round(passedChecks / totalChecks * 100) : 0}%`} accent={K.gold} period="last quarter" />
              <StatCard label="Failed Checks" value={String(checks.filter(c => c.status === "failed").length)} accent={K.danger} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card accent={K.gold}>
                <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Business Entities</h3>
                {entities.map(e => (
                  <div key={e.name} className="py-[14px] border-b border-g800">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-mono text-xs font-bold text-t1">{e.name}</p>
                        <p className="font-mono text-[10px] text-t2">{e.type} · {e.jurisdiction}</p>
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
                        <p className="font-mono text-[10px] text-t4">DOCUMENTS</p>
                        <p className="font-mono text-[11px] font-bold text-t1">{e.documentsUploaded}/{e.documentsRequired}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] text-t4">CHECKS</p>
                        <p className="font-mono text-[11px] font-bold text-t1">{e.checksPassed}P / {e.checksFailed}F</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] text-t4">NEXT REVIEW</p>
                        <p className="font-mono text-[11px] font-bold text-t1">{e.nextReview}</p>
                      </div>
                    </div>
                    <ProgressBar value={e.complianceScore} max={100} color={e.complianceScore === 100 ? K.mint : e.complianceScore >= 60 ? K.warn : K.danger} height={4} glow />
                    <p className="font-mono text-[10px] text-t4 mt-1 text-right">Compliance: {e.complianceScore}%</p>
                  </div>
                ))}
              </Card>

              <div className="flex flex-col gap-3">
                <Card accent={K.blue}>
                  <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Documents</h3>
                  {documents.length === 0 ? (
                    <p className="font-mono text-[11px] text-t4">No documents uploaded.</p>
                  ) : documents.map(d => (
                    <div key={d.name} className="flex items-center gap-[10px] py-2 border-b border-g800">
                      <Badge color={d.status === "uploaded" ? K.mint : d.status === "pending" ? K.warn : K.danger}>
                        {d.status === "uploaded" ? "UPLOADED" : d.status === "pending" ? "PENDING" : "MISSING"}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-mono text-[11px] text-t1">{d.name}</p>
                        <p className="font-mono text-[10px] text-t4">{d.entity}</p>
                      </div>
                    </div>
                  ))}
                </Card>

                <Card accent={K.teal}>
                  <h3 className="font-mono text-[13px] font-bold text-t1 mb-[14px]">Compliance Checks</h3>
                  {checks.map(c => (
                    <div key={c.check} className="flex items-center gap-[10px] py-2 border-b border-g800">
                      <Badge color={c.status === "passed" ? K.mint : c.status === "failed" ? K.danger : K.warn} dot>
                        {c.status === "passed" ? "PASSED" : c.status === "failed" ? "FAILED" : "PENDING"}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-mono text-[11px] text-t1">{c.check}</p>
                        {c.entity && <p className="font-mono text-[10px] text-kdanger">{c.entity}</p>}
                      </div>
                      <span className="font-mono text-[10px] text-t4">{c.date}</span>
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
