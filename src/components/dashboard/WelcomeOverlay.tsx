"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { K } from "@/lib/kdls";
import { Button } from "@/components/ui";

const WELCOME_KEY = "kiki_welcome_shown";

const STEPS = [
  {
    icon: "🔗",
    title: "Connect your ad accounts",
    desc: "Link Meta, Google, or TikTok to start receiving campaign data.",
    href: "/dashboard/guides/connect-accounts",
  },
  {
    icon: "⚡",
    title: "Run your first bid cycle",
    desc: "The AI agent optimizes bids across all platforms in real time.",
    href: "/dashboard/guides/first-bid-cycle",
  },
  {
    icon: "📈",
    title: "Set up LTV enrichment",
    desc: "Enrich conversions with predicted lifetime value signals.",
    href: "/dashboard/guides/ltv-enrichment",
  },
];

export function WelcomeOverlay() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem(WELCOME_KEY);
    if (!shown) {
      setVisible(true);
      sessionStorage.setItem(WELCOME_KEY, "1");
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-[480px] rounded-sm p-6"
        style={{ background: K.g900, border: `1px solid ${K.g700}` }}
      >
        <div className="text-center mb-6">
          <div className="text-[32px] mb-2">🚀</div>
          <h2 className="font-mono font-bold text-[16px] text-white mb-1">Welcome to KIKI Agent</h2>
          <p className="font-mono text-[11px]" style={{ color: K.t3 }}>Here are 3 quick steps to get started:</p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {STEPS.map((s, i) => (
            <button
              key={s.href}
              onClick={() => { router.push(s.href); setVisible(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-sm cursor-pointer text-left transition-all duration-150"
              style={{ background: K.g850, border: `1px solid ${K.g700}` }}
              onMouseEnter={e => { e.currentTarget.style.background = K.g800; e.currentTarget.style.borderColor = K.g600; }}
              onMouseLeave={e => { e.currentTarget.style.background = K.g850; e.currentTarget.style.borderColor = K.g700; }}
            >
              <span className="text-[20px] flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold" style={{ color: K.blue4 }}>STEP {i + 1}</span>
                  <span className="font-mono text-[10px]" style={{ color: K.t3 }}>—</span>
                  <span className="font-mono text-[11px] text-white font-semibold">{s.title}</span>
                </div>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: K.t3 }}>{s.desc}</p>
              </div>
              <span className="font-mono text-[12px] flex-shrink-0" style={{ color: K.blue4 }}>→</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button full variant="mint" onClick={() => { router.push(STEPS[0].href); setVisible(false); }}>
            Start setup →
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setVisible(false)}>
            I'll do this later
          </Button>
        </div>
      </div>
    </div>
  );
}
