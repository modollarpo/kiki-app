import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Contract & Agreement Center | KIKI Agent™",
  description: "Sign and manage all KIKI Agent legal agreements electronically. Terms, DPA, NDA, OaaS MSA, and GDPR documentation.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
