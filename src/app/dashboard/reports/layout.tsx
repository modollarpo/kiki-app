import type { Metadata } from "next";
import { reportsMetadata } from "@/lib/seo";
export const metadata: Metadata = reportsMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
