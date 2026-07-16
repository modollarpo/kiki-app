"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { K } from "@/lib/kdls";

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
}

const STEPS: Step[] = [
  { id: "connect", label: "Connect ad account", description: "Link Meta, Google, or TikTok via OAuth", href: "/dashboard/integrations", icon: "🔗" },
  { id: "pixel", label: "Install tracking pixel", description: "Deploy the CAPI pixel on your store", href: "/dashboard/signals", icon: "📡" },
  { id: "campaign", label: "Create first campaign", description: "Set target CAC and connect to an ad set", href: "/dashboard/campaigns", icon: "🎯" },
  { id: "wallet", label: "Fund wallet", description: "Add balance for ad spend via Stripe", href: "/dashboard/wallet", icon: "💰" },
  { id: "signal", label: "Review first signal", description: "Watch for your first LTV-enriched conversion", href: "/dashboard/signals", icon: "◎" },
  { id: "bid", label: "Watch first bid cycle", description: "The agent runs every 15 min once 5+ conversions arrive", href: "/dashboard/agents", icon: "⚡" },
  { id: "stoploss", label: "Set up stop-loss", description: "Create an OaaS workflow to pause on high CAC", href: "/dashboard/oaas", icon: "🛡" },
  { id: "mfa", label: "Enable MFA", description: "Secure your account with authenticator app", href: "/dashboard/settings", icon: "🔒" },
];

const STORAGE_KEY = "kiki_onboarding_checklist";

export function OnboardingChecklist() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setCompleted(new Set(data.completed || []));
        setDismissed(data.dismissed || false);
      }
    } catch {}
  }, []);

  const persist = useCallback((c: Set<string>, d: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        completed: Array.from(c),
        dismissed: d,
        updatedAt: Date.now(),
      }));
    } catch {}
  }, []);

  const toggle = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      persist(next, dismissed);
      return next;
    });
  }, [dismissed, persist]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    persist(completed, true);
  }, [completed, persist]);

  const restore = useCallback(() => {
    setDismissed(false);
    persist(completed, false);
  }, [completed, persist]);

  const doneCount = completed.size;
  const total = STEPS.length;
  const allDone = doneCount === total;
  const pct = Math.round((doneCount / total) * 100);

  if (allDone && dismissed) return null;

  if (dismissed && !allDone) {
    return (
      <div
        onClick={restore}
        style={{
          background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 4,
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer", marginBottom: 16, transition: "all 0.15s",
        }}
      >
        <span style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>
          ▸ Setup checklist · {doneCount}/{total} complete · click to expand
        </span>
        <div style={{ flex: 1, height: 3, background: K.g800, borderRadius: 2 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: K.mint, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
      </div>
    );
  }

  if (allDone) {
    return (
      <div style={{
        background: `${K.mint}10`, border: `1px solid ${K.mint}40`, borderRadius: 4,
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
      }}>
        <span style={{ fontFamily: K.mono, fontSize: 12, color: K.mint }}>
          ✓ Setup complete — all {total} steps done. KIKI is fully operational.
        </span>
        <button onClick={dismiss} style={{ fontFamily: K.mono, fontSize: 10, color: K.t3, background: "none", border: "none", cursor: "pointer" }}>
          dismiss
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: K.g900, border: `1px solid ${K.g800}`, borderRadius: 4,
      marginBottom: 16, overflow: "hidden",
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", borderBottom: expanded ? `1px solid ${K.g800}` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: K.mono, fontSize: 12, fontWeight: 700, color: K.t1 }}>
            Setup Checklist
          </span>
          <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>
            {doneCount}/{total}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 80, height: 4, background: K.g800, borderRadius: 2 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? K.mint : K.blue, borderRadius: 2, transition: "width 0.3s" }} />
          </div>
          <button onClick={(e) => { e.stopPropagation(); dismiss(); }} style={{ fontFamily: K.mono, fontSize: 10, color: K.t4, background: "none", border: "none", cursor: "pointer" }}>
            {expanded ? "collapse" : "expand"}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "8px 12px" }}>
          {STEPS.map((step, i) => {
            const isDone = completed.has(step.id);
            return (
              <div
                key={step.id}
                onClick={() => toggle(step.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 8px", borderRadius: 3, cursor: "pointer",
                  background: isDone ? `${K.mint}08` : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => !isDone && (e.currentTarget.style.background = K.g850)}
                onMouseLeave={e => !isDone && (e.currentTarget.style.background = "transparent")}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 3,
                  border: `1.5px solid ${isDone ? K.mint : K.g700}`,
                  background: isDone ? K.mint : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.15s",
                }}>
                  {isDone && <span style={{ fontSize: 10, color: K.void, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: K.mono, fontSize: 11, color: isDone ? K.t3 : K.t1, textDecoration: isDone ? "line-through" : "none" }}>
                      {step.icon} {step.label}
                    </span>
                  </div>
                  <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t4 }}>{step.description}</span>
                </div>
                {!isDone && (
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(step.href); }}
                    style={{
                      fontFamily: K.mono, fontSize: 9, color: K.blue, background: "none",
                      border: `1px solid ${K.blue}40`, borderRadius: 2, padding: "3px 8px",
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    Go →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
