"use client";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Button } from "@/components/ui";
import { K } from "@/lib/kdls";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const PLATFORMS = [
  { name: "Meta (Facebook/Instagram)", permissions: ["ads_management", "business_management", "pages_read_engagement"], time: "2-4 weeks for app review", color: "#1877F2" },
  { name: "Google Ads", permissions: ["ads_management", "customer management"], time: "1-2 weeks for developer token", color: "#4285F4" },
  { name: "TikTok", permissions: ["campaign_management", "audience_management"], time: "2-3 weeks for partner approval", color: "#FF0050" },
  { name: "LinkedIn", permissions: ["ad_account_management", "campaign management"], time: "2-6 weeks, may need volume commitment", color: "#0A66C2" },
  { name: "Shopify", permissions: ["read_customers", "read_orders"], time: "Instant for private apps", color: "#96BF48" },
  { name: "Stripe", permissions: ["charges", "customers", "issuing"], time: "Instant via dashboard", color: "#635BFF" },
  { name: "HubSpot", permissions: ["contacts", "companies", "deals"], time: "Instant, no review needed", color: "#FF7A59" },
  { name: "Salesforce", permissions: ["api", "refresh_token"], time: "1 day for Connected App", color: "#00A1E0" },
];

export default function ConnectAccountsGuide() {
  const { token } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!token) router.push("/auth/login"); }, [token, router]);
  if (!token) return null;
  return (
    <DashboardLayout>
      <div className="p-[clamp(14px,3vw,28px)] max-w-[800px]">
        <Link href="/dashboard/guides" className="inline-block font-mono text-[10px] text-t3 no-underline mb-4">
          ← Back to Guides
        </Link>

        <h1 className="font-mono font-bold text-lg text-t1 mb-2">Connect your ad accounts</h1>
        <p className="font-mono text-[11px] text-t3 mb-6 leading-relaxed">
          KIKI needs read access to your ad accounts to pull metrics and optimise bids, plus write access to send LTV-enriched conversion events via CAPI. Here&apos;s exactly what happens at each step.
        </p>

        <Section title="How the connection works">
          <Step n={1} title="Click 'Connect' on the Integrations page">
            KIKI generates a secure OAuth URL with PKCE (S256) CSRF protection. You&apos;re redirected to the platform&apos;s login page — KIKI never sees your password.
          </Step>
          <Step n={2} title="Approve permissions on the platform">
            You&apos;ll see a permissions screen listing exactly what KIKI can do. For ad platforms, this typically includes: read campaign data, manage campaigns, access audiences, and send conversion events.
          </Step>
          <Step n={3} title="Select your ad account">
            Most users have multiple ad accounts under one login. KIKI shows you the list and asks which one to connect. You can connect multiple accounts.
          </Step>
          <Step n={4} title="KIKI stores an encrypted token">
            Your OAuth token is encrypted with AES-256-GCM before touching our database. KIKI uses this token to pull metrics every 15 minutes and send LTV-enriched conversion events in real-time.
          </Step>
        </Section>

        <Section title="What KIKI does and doesn't do with access">
          <Card padding={0}>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="px-4 py-3 border-b border-g800 border-r border-r-g800">
                <div className="font-mono text-[10px] text-kmint font-bold mb-2">✓ KIKI DOES</div>
                <ul className="font-mono text-[10px] text-t2 leading-loose pl-[14px] m-0">
                  <li>Pull campaign metrics every 15 minutes</li>
                  <li>Send LTV-enriched conversion events</li>
                  <li>Adjust bids and budgets (autonomously)</li>
                  <li>Create and manage custom audiences</li>
                  <li>Pause/resume campaigns (stop-loss)</li>
                  <li>Pull creative performance data</li>
                </ul>
              </div>
              <div className="px-4 py-3 border-b border-g800">
                <div className="font-mono text-[10px] text-kdanger font-bold mb-2">✗ KIKI DOES NOT</div>
                <ul className="font-mono text-[10px] text-t2 leading-loose pl-[14px] m-0">
                  <li>Access your personal social media</li>
                  <li>Post organic content on your behalf</li>
                  <li>Access billing or payment methods</li>
                  <li>Share data with third parties</li>
                  <li>Modify account settings</li>
                  <li>Delete any data without your request</li>
                </ul>
              </div>
            </div>
          </Card>
        </Section>

        <Section title="Platform-by-platform permissions">
          <div className="flex flex-col gap-2">
            {PLATFORMS.map((p) => (
              <Card key={p.name} padding={0}>
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full shrink-0 mt-[5px]" style={{ background: p.color }} />
                  <div className="flex-1">
                    <div className="font-mono text-[11px] font-bold text-t1">{p.name}</div>
                    <div className="font-mono text-[10px] text-t3 mt-[2px]">
                      Permissions: {p.permissions.join(", ")}
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-t4 text-right shrink-0">
                    {p.time}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="What happens after you connect">
          <div className="font-mono text-[11px] text-t2 leading-loose">
            <p><strong className="text-t1">Minute 0:</strong> KIKI pulls your campaign structure — campaigns, ad sets, creatives, targeting.</p>
            <p><strong className="text-t1">Minute 1:</strong> The metrics collector starts pulling performance data (impressions, clicks, conversions, spend).</p>
            <p><strong className="text-t1">Hour 1:</strong> The token refresh watchdog verifies your token is valid and schedules proactive refresh 1 hour before expiry.</p>
            <p><strong className="text-t1">Day 1-3:</strong> KIKI builds baseline metrics. The bidding agent observes but does not act until it has at least 5 conversions per campaign.</p>
            <p><strong className="text-t1">Day 3-7:</strong> First bid decisions are made. You&apos;ll see them on the Intelligence screen with full explanations.</p>
            <p><strong className="text-t1">Week 2+:</strong> LTV enrichment kicks in. Conversion events start being enriched with predicted 90-day value. Platform algorithms begin shifting toward high-LTV buyers.</p>
          </div>
        </Section>

        <Section title="Troubleshooting">
          <div className="font-mono text-[11px] text-t2 leading-loose">
            <p><strong className="text-t1">Token expired:</strong> KIKI&apos;s watchdog refreshes tokens 1 hour before expiry automatically. If it fails, the integration shows &quot;expired&quot; status — click Reconnect.</p>
            <p><strong className="text-t1">No campaigns showing:</strong> Verify you selected the correct ad account during OAuth. Some users have test accounts and production accounts under the same login.</p>
            <p><strong className="text-t1">CAPI events failing:</strong> Check that your pixel/conversion API is set up on the platform side. KIKI sends events, but the platform needs to accept them.</p>
            <p><strong className="text-t1">Bid agent not acting:</strong> The agent requires at least 5 conversions per campaign before making decisions. Below that threshold, it observes only.</p>
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="font-mono text-[13px] font-bold text-t1 mb-3 pb-2 border-b border-g800">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3">
      <div className="w-[22px] h-[22px] rounded-kdls bg-kblue flex items-center justify-center shrink-0 font-mono text-[10px] font-bold text-white">
        {n}
      </div>
      <div>
        <div className="font-mono text-[11px] font-bold text-t1 mb-[2px]">{title}</div>
        <div className="font-mono text-[10px] text-t3 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
