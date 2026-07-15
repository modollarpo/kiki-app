import type { Metadata } from "next";
import { kycMetadata } from "@/lib/seo";
export const metadata: Metadata = kycMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
