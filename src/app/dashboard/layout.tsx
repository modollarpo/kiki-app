import type { Metadata } from "next";
import { dashboardMetadata } from "@/lib/seo";
export const metadata: Metadata = dashboardMetadata;
export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
