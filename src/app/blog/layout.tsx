import type { Metadata } from "next";
import { blogMetadata } from "@/lib/seo";
export const metadata: Metadata = blogMetadata;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
