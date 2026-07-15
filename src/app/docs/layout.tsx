import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Developer Documentation | KIKI Agent™",
  description: "KIKI Agent API reference, SDK docs, CAPI integration guides, webhook setup, and LTV enrichment API documentation.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
