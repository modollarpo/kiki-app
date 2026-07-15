import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Contracts & Downloads | KIKI Agent™",
  description: "KIKI Agent contract templates, PDF downloads, sub-processor list, DPA, and compliance documentation.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
