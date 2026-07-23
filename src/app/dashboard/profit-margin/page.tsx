"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

interface Portfolio { summary: { total_skus: number; avg_margin: number; total_cogs: number; total_revenue: number; low_margin_count: number; mid_margin_count: number; high_margin_count: number; }; distribution: Array<{ bucket: string; count: number; avg_margin: number; }>; }

export default function ProfitMarginPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [csvInput, setCsvInput] = useState("");
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);

  const fetchPortfolio = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profit-margin", { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setPortfolio(data.data);
    } catch {}
    setLoading(false);
  }, [token]);

  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  const uploadMargins = async () => {
    if (!token) return;
    const lines = csvInput.split("\n").filter(l => l.trim());
    const products = lines.map(l => {
      const [sku, productName, cogs, price] = l.split(",").map((s: string) => s.trim());
      return { sku, productName, cogs: parseFloat(cogs || "0"), price: parseFloat(price || "0") };
    });
    await fetch("/api/profit-margin", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ products }) });
    setCsvInput("");
    fetchPortfolio();
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] p-[clamp(14px,3vw,28px)] text-white">
        <div className="mb-5">
          <h1 className="font-mono font-bold text-lg text-white tracking-tight mb-1">Profit & Margin Intelligence</h1>
          <p className="font-mono text-[11px] text-gray-500">COGS-aware bidding — profit ROAS instead of revenue ROAS</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total SKUs" value={String(portfolio?.summary?.total_skus || 0)} accent={K.blue} loading={loading} />
          <StatCard label="Avg Margin" value={portfolio?.summary?.avg_margin ? `${portfolio.summary.avg_margin.toFixed(1)}%` : "—"} accent={K.mint} loading={loading} />
          <StatCard label="Low Margin (<15%)" value={String(portfolio?.summary?.low_margin_count || 0)} accent={K.danger} loading={loading} />
          <StatCard label="High Margin (>40%)" value={String(portfolio?.summary?.high_margin_count || 0)} accent={K.gold} loading={loading} />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3">
          <Card accent={K.mint}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Margin Distribution</h3>
            {portfolio?.distribution?.map((d, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 mb-1 rounded-sm bg-g850">
                <span className="font-mono text-[11px] text-white min-w-[70px] flex-shrink-0">{d.bucket}</span>
                <div className="flex-1 h-1.5 rounded-[3px] bg-g800">
                  <div className="h-full rounded-[3px]" style={{ width: `${Math.min(100, (d.count / Math.max(...portfolio.distribution.map(x => x.count))) * 100)}%`, background: K.mint }} />
                </div>
                <span className="font-mono text-[11px] text-gray-500 flex-shrink-0">{d.count} SKUs</span>
              </div>
            )) || <p className="font-mono text-xs text-gray-500">Upload product margins to see distribution.</p>}
          </Card>

          <Card accent={K.gold}>
            <h3 className="font-mono font-bold text-[13px] text-white mb-3.5">Upload Margins (CSV)</h3>
            <p className="font-mono text-[11px] text-gray-500 mb-2">Format: SKU, Product Name, COGS, Price</p>
            <textarea value={csvInput} onChange={e => setCsvInput(e.target.value)} placeholder={"SKU-001, Widget Pro, 12.50, 49.99\nSKU-002, Basic Widget, 3.20, 19.99"}
              className="w-full h-[120px] p-2 font-mono text-xs rounded-sm resize-vertical"
              style={{ background: K.inputBg, border: `1px solid ${K.inputBorder}`, color: K.t1 }} />
            <button onClick={uploadMargins} className="mt-2 font-mono text-[11px] font-semibold px-4 py-2 rounded-sm cursor-pointer"
              style={{ border: `1px solid ${K.mint}40`, background: K.mint + "20", color: K.mint }}>Upload</button>
          </Card>
        </div>

        <div className="mt-3 text-center">
          <button onClick={fetchPortfolio} className="font-mono text-[11px] font-semibold px-5 py-2 rounded-sm cursor-pointer"
            style={{ border: `1px solid ${K.blue}40`, background: K.blue + "20", color: K.blue }}>Refresh Portfolio</button>
        </div>
      </div>
    </DashboardLayout>
  );
}
