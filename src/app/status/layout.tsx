import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "System Status | KIKI Agent™",
  description: "Live KIKI Agent platform status. Service health, uptime, latency, and incident history across all 12 platform connectors.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
