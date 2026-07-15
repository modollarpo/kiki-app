import type { Metadata } from "next";
import { auditMetadata } from "@/lib/seo";
export const metadata: Metadata = auditMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
