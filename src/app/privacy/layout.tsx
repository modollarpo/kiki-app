import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy Policy | KIKI Agent™",
  description: "KIKI Agent privacy policy. GDPR and CCPA compliant, SOC 2 Type II audit programme in progress. How we collect, use, and protect your data.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
