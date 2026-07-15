import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Download KIKI Agent App | KIKI Agent™",
  description: "Download KIKI Agent for iOS, Android, or install as a PWA. Full campaign management, AI agents, and SyncBrain voice.",
  robots: "index,follow",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
