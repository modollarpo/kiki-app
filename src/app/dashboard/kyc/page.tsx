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
      <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1, letterSpacing: "-0.02em", marginBottom: 4 }}>KYC & AML</h1>
          <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>Entity verification · Document management · Compliance checks</p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <AIThinking text="Loading compliance data..." />
          </div>
        ) : entities.length === 0 ? (
          <Card>
            <div style={{ padding: 40, textAlign: "center" }}>
              <p style={{ fontFamily: K.mono, fontSize: 12, color: K.t4, marginBottom: 12 }}>No entities found.</p>
              <Button variant="primary" size="sm">+ Add Entity</Button>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              <StatCard label="Entities Verified" value={`${verified}/${entities.length}`} accent={K.mint} />
              <StatCard label="Documents Uploaded" value={String(documents.filter(d => d.status === "uploaded").length)} accent={K.blue} />
              <StatCard label="Compliance Score" value={`${totalChecks > 0 ? Math.round(passedChecks / totalChecks * 100) : 0}%`} accent={K.gold} delta={5.2} period="last quarter" />
              <StatCard label="Failed Checks" value={String(checks.filter(c => c.status === "failed").length)} accent={K.danger} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card accent={K.gold}>
                <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Business Entities</h3>
                {entities.map(e => (
                  <div key={e.name} style={{ padding: "14px 0", borderBottom: `1px solid ${K.g800}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <p style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>{e.name}</p>
                        <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>{e.type} · {e.jurisdiction}</p>
                      </div>
                      <Badge
                        color={e.verificationStatus === "verified" ? K.mint : e.verificationStatus === "pending" ? K.warn : K.danger}
                        dot
                      >
                        {e.verificationStatus.toUpperCase()}
                      </Badge>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>DOCUMENTS</p>
                        <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1 }}>{e.documentsUploaded}/{e.documentsRequired}</p>
                      </div>
                      <div>
                        <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>CHECKS</p>
                        <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1 }}>{e.checksPassed}P / {e.checksFailed}F</p>
                      </div>
                      <div>
                        <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>NEXT REVIEW</p>
                        <p style={{ fontFamily: K.mono, fontSize: 11, fontWeight: 700, color: K.t1 }}>{e.nextReview}</p>
                      </div>
                    </div>
                    <ProgressBar value={e.complianceScore} max={100} color={e.complianceScore === 100 ? K.mint : e.complianceScore >= 60 ? K.warn : K.danger} height={4} glow />
                    <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4, marginTop: 4, textAlign: "right" }}>Compliance: {e.complianceScore}%</p>
                  </div>
                ))}
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card accent={K.blue}>
                  <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Documents</h3>
                  {documents.length === 0 ? (
                    <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t4 }}>No documents uploaded.</p>
                  ) : documents.map(d => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${K.g800}` }}>
                      <Badge color={d.status === "uploaded" ? K.mint : d.status === "pending" ? K.warn : K.danger}>
                        {d.status === "uploaded" ? "UPLOADED" : d.status === "pending" ? "PENDING" : "MISSING"}
                      </Badge>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t1 }}>{d.name}</p>
                        <p style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{d.entity}</p>
                      </div>
                    </div>
                  ))}
                </Card>

                <Card accent={K.teal}>
                  <h3 style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 13, color: K.t1, marginBottom: 14 }}>Compliance Checks</h3>
                  {checks.map(c => (
                    <div key={c.check} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${K.g800}` }}>
                      <Badge color={c.status === "passed" ? K.mint : c.status === "failed" ? K.danger : K.warn} dot>
                        {c.status === "passed" ? "PASSED" : c.status === "failed" ? "FAILED" : "PENDING"}
                      </Badge>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t1 }}>{c.check}</p>
                        {c.entity && <p style={{ fontFamily: K.mono, fontSize: 9, color: K.danger }}>{c.entity}</p>}
                      </div>
                      <span style={{ fontFamily: K.mono, fontSize: 9, color: K.t4 }}>{c.date}</span>
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
