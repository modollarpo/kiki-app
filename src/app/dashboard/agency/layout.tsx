import type { Metadata } from "next";
import { agencyMetadata } from "@/lib/seo";
export const metadata: Metadata = agencyMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
