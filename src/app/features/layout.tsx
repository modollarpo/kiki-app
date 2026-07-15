import type { Metadata } from "next";
import { featuresMetadata } from "@/lib/seo";
export const metadata: Metadata = featuresMetadata;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
