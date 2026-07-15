import type { Metadata } from "next";
import { enterpriseMetadata } from "@/lib/seo";
export const metadata: Metadata = enterpriseMetadata;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
