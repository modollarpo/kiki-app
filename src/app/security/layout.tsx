import type { Metadata } from "next";
import { securityMetadata } from "@/lib/seo";
export const metadata: Metadata = securityMetadata;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
