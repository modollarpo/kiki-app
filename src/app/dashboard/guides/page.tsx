"use client";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui";
import { K } from "@/lib/kdls";
import Link from "next/link";

const GUIDES = [
  {
    slug: "connect-accounts",
    title: "Connect your ad accounts",
    description: "Step-by-step OAuth setup for Meta, Google, TikTok, and all 8 platforms. What permissions KIKI requests and why.",
    icon: "🔗",
    readTime: "5 min",
    color: K.blue,
  },
  {
    slug: "ltv-enrichment",
    title: "What is LTV enrichment",
    description: "The core mechanism: why sending $640 instead of $149 to Meta changes everything. How the ML model works.",
    icon: "🧠",
    readTime: "8 min",
    color: K.mint,
  },
  {
    slug: "first-bid-cycle",
    title: "Understand your first bid cycle",
    description: "The 5 bid decisions, why the agent needs 5 conversions first, how to read the Intelligence panel.",
    icon: "⚡",
    readTime: "6 min",
    color: K.gold,
  },
];

export default function GuidesIndex() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/auth/login");
  }, [token, authLoading, router]);
  if (authLoading) return <DashboardLayout><div style={{color:"var(--t2)",padding:"2rem"}}>Loading...</div></DashboardLayout>;
  if (!token) return null;

  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[900px]">
        <h1 className="font-mono font-bold text-lg text-t1 mb-1">User Guides</h1>
        <p className="font-mono text-[11px] text-t3 mb-6">
          Essential reading for every KIKI user. Start with connecting your accounts.
        </p>

        <div className="flex flex-col gap-3">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/dashboard/guides/${g.slug}`} className="no-underline">
              <div
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.borderColor = g.color)}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.borderColor = K.g800)}
                className="border border-g800 rounded-kdls transition-colors cursor-pointer"
              >
                <Card padding={0}>
                  <div className="px-5 py-4 flex items-start gap-[14px]">
                    <span className="text-xl leading-none">{g.icon}</span>
                    <div className="flex-1">
                      <div className="font-mono text-[13px] font-bold text-t1 mb-1">{g.title}</div>
                      <div className="font-mono text-[11px] text-t3 leading-relaxed">{g.description}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[10px] text-t4">{g.readTime} read</div>
                      <div className="font-mono text-[10px] mt-1" style={{ color: g.color }}>Read →</div>
                    </div>
                  </div>
                </Card>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
