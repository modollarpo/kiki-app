import type { Metadata } from "next";
import { changelogMetadata } from "@/lib/seo";
export const metadata: Metadata = changelogMetadata;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
