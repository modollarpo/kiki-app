import type { Metadata } from "next";
import { pricingMetadata } from "@/lib/seo";
export const metadata: Metadata = pricingMetadata;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
