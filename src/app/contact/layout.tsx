import type { Metadata } from "next";
import { contactMetadata } from "@/lib/seo";
export const metadata: Metadata = contactMetadata;
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
