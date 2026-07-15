import type { Metadata } from "next";
import { aboutMetadata } from "@/lib/seo";
export const metadata: Metadata = aboutMetadata;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
