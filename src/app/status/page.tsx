"use client";
import { useState, useEffect, useCallback } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Badge } from "@/components/ui";
import { status as statusApi } from "@/lib/api";

type Service = { name: string; status: string; p99: number; uptime: number };

const STATUS_COLORS: Record<string,string> = { operational:K.mint, degraded:K.warn, outage:K.danger, maintenance:K.blue };

export default function StatusPage() {
  const [now, setNow] = useState(new Date());
  const [overall, setOverall] = useState<string>("operational");
  const [services, setServices] = useState<Service[]>([]);
  const [updated, setUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await statusApi.get();
      setOverall(data.status);
      setServices(data.services);
      setUpdated(new Date().toLocaleTimeString("en-US", { hour12:false }));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const clock = setInterval(() => setNow(new Date()), 1000);
    const poll = setInterval(load, 30000);
    return () => { clearInterval(clock); clearInterval(poll); };
  }, [load]);

  const allOk = overall === "operational";

  return (
    <MarketingLayout>
      <div style={{ background:K.void }} className="p-[clamp(40px,6vw,80px)] px-[clamp(16px,4vw,48px)] max-w-[960px] mx-auto">
        <div className="text-center mb-12">
          <div style={{ background:allOk?K.mintT:K.warnT, border:`1px solid ${allOk?K.mint:K.warn}30` }} className="inline-flex items-center gap-2.5 px-6 py-3 rounded-sm mb-5">
            <span className="animate-kdls-pulse w-2.5 h-2.5 rounded-full inline-block" style={{ background:allOk?K.mint:K.warn }}/>
            <span className="font-mono text-[13px] font-bold" style={{ color:allOk?K.mint:K.warn }}>{allOk ? "ALL SYSTEMS OPERATIONAL" : "DEGRADED PERFORMANCE"}</span>
          </div>
          <h1 className="font-mono font-bold text-[clamp(22px,4vw,36px)] text-t1 tracking-[-0.025em] mb-2">KIKI Agent Status</h1>
          <p className="font-mono text-[11px] text-t3">
            {loading ? "Loading live status…" : failed ? "Could not load live status — retrying every 30s" : <>Live status · Updated {updated} ({now.toLocaleTimeString("en-US", { hour12:false })} local)</>}
          </p>
        </div>

        <div className="mb-7">
          <p className="font-mono font-bold text-[10px] text-t2 mb-2.5 tracking-[0.04em]">PLATFORM SERVICES</p>
          <div className="border border-g800 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="grid grid-cols-[1fr_100px_80px_90px] gap-3 px-4 py-2 bg-g950 border-b border-g800">
                  {["SERVICE","STATUS","P99","UPTIME"].map(h => <span key={h} className="font-mono text-[9px] tracking-widest text-t4">{h}</span>)}
                </div>
                {services.length === 0 && !loading && (
                  <div className="px-4 py-6 bg-g900">
                    <span className="font-mono text-[12px] text-t3">{failed ? "Status service unavailable." : "No service data."}</span>
                  </div>
                )}
                {services.map((svc,i) => (
                  <div key={svc.name} className="grid grid-cols-[1fr_100px_80px_90px] gap-3 px-4 py-3 items-center bg-g900" style={{ borderBottom:i<services.length-1?`1px solid ${K.g900}`:"none" }}>
                    <span className="font-mono text-[12px] text-t1">{svc.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="animate-kdls-pulse w-[7px] h-[7px] rounded-full inline-block" style={{ background:STATUS_COLORS[svc.status]||K.t3 }}/>
                      <span className="font-mono text-[10px] capitalize" style={{ color:STATUS_COLORS[svc.status]||K.t3 }}>{svc.status}</span>
                    </div>
                    <span className="font-mono text-[11px] text-t2">{svc.p99}ms</span>
                    <span className="font-mono font-bold text-[11px] text-kmint">{svc.uptime}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <p className="font-mono font-bold text-[10px] text-t2 mb-4 tracking-[0.04em]">RECENT INCIDENTS</p>
          <div className="px-[18px] py-5 bg-g900 border border-g800 rounded-sm">
            <span className="font-mono text-[12px] text-t3">No incidents reported.</span>
          </div>
        </div>

        <div className="mt-8 text-center p-5 bg-g900 border border-g800 rounded-sm">
          <p className="font-mono text-[11px] text-t3">
            Incident notifications:{" "}
            <a href="mailto:hello@keekii.net?subject=Status%20notifications" className="no-underline" style={{ color:K.blue4 }}>hello@keekii.net</a>
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
