import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "OaaS Master Services Agreement | KIKI Agent™",
  description: "KIKI Agent Optimization as a Service agreement. Autonomous campaign management with guaranteed ROAS uplift targets.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
