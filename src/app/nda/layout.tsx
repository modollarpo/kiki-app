import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Mutual NDA | KIKI Agent™",
  description: "Execute a mutual non-disclosure agreement with KIKI Agent Inc. Legally binding electronic signature via ESIGN Act.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
