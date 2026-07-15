import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Privacy Policy | KIKI Agent™",
  description: "KIKI Agent privacy policy. GDPR, CCPA and SOC2 Type II compliant. How we collect, use, and protect your data.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
