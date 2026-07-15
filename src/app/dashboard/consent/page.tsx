"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Badge, ProgressBar, StatCard } from "@/components/ui";
import { K } from "@/lib/kdls";

export default function ConsentPrivacyPage() {
  const regions = [
    { region: "GDPR (EU)", compliance: 98.2, users: 234567, consentRate: 72.3 },
    { region: "CCPA (California)", compliance: 96.8, users: 89234, consentRate: 68.9 },
    { region: "PIPEDA (Canada)", compliance: 97.5, users: 45678, consentRate: 71.2 },
    { region: "LGPD (Brazil)", compliance: 95.4, users: 67890, consentRate: 65.8 },
    { region: "Other Regions", compliance: 94.1, users: 123456, consentRate: 63.4 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" style={{ color: K.t1 }}>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: K.t1 }}>Consent & Privacy</h1>
          <p className="mt-1 text-sm" style={{ color: K.t3 }}>Manage user consent, privacy compliance, and data protection</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Overall Compliance" value="96.8%" delta={1.2} sub="+1.2% this month" accent={K.mint} />
          <StatCard label="Consent Rate" value="69.4%" delta={2.1} sub="+2.1% improvement" accent={K.mint} />
          <StatCard label="UID2 Adoption" value="78.3%" delta={5.6} sub="+5.6% growth" accent={K.mint} />
          <StatCard label="Privacy Sandbox" value="Ready" sub="All APIs enabled" accent={K.mint} />
        </div>

        <Card className="p-4" style={{ background: K.g950, borderColor: K.g850 }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: K.t1 }}>Compliance by Region</h3>
          <div className="space-y-3">
            {regions.map((region, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: K.g900 }}>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: K.t1 }}>{region.region}</span>
                    <span className="text-sm font-semibold" style={{ color: K.mint }}>{region.compliance}%</span>
                  </div>
                  <ProgressBar value={region.compliance} max={100} color={K.mint} height={4} />
                </div>
                <div className="text-right w-24">
                  <div className="text-xs" style={{ color: K.t3 }}>Users</div>
                  <div className="text-sm font-medium" style={{ color: K.t2 }}>{(region.users / 1000).toFixed(1)}K</div>
                </div>
                <div className="text-right w-24">
                  <div className="text-xs" style={{ color: K.t3 }}>Consent</div>
                  <div className="text-sm font-medium" style={{ color: K.blue }}>{region.consentRate}%</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4" style={{ background: K.g950, borderColor: K.g850 }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: K.t1 }}>UID2 Adoption Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: K.t2 }}>Hashed Email Match Rate</span>
                <span className="text-sm font-semibold" style={{ color: K.mint }}>84.2%</span>
              </div>
              <ProgressBar value={84.2} max={100} color={K.mint} height={4} />
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: K.t2 }}>Phone Number Match Rate</span>
                <span className="text-sm font-semibold" style={{ color: K.blue }}>72.6%</span>
              </div>
              <ProgressBar value={72.6} max={100} color={K.blue} height={4} />
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: K.t2 }}>Address Match Rate</span>
                <span className="text-sm font-semibold" style={{ color: K.teal }}>61.8%</span>
              </div>
              <ProgressBar value={61.8} max={100} color={K.teal} height={4} />
            </div>
          </Card>

          <Card className="p-4" style={{ background: K.g950, borderColor: K.g850 }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: K.t1 }}>Privacy Sandbox Status</h3>
            <div className="space-y-3">
              {[
                { api: "Topics API", status: "Active", color: K.mint },
                { api: "Protected Audiences", status: "Active", color: K.mint },
                { api: "Attribution Reporting", status: "Active", color: K.mint },
                { api: "FLEDGE", status: "Testing", color: K.gold },
                { api: "Trust Tokens", status: "Deprecated", color: K.warn },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: K.g900 }}>
                  <span className="text-sm" style={{ color: K.t1 }}>{item.api}</span>
                  <Badge style={{ background: item.color + "20", color: item.color }}>{item.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
