import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Terms of Service | KIKI Agent™",
  description: "KIKI Agent Terms of Service v2.4. Governing use of the autonomous LTV campaign execution platform.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
