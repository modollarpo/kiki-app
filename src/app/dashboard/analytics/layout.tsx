import type { Metadata } from "next";
import { analyticsMetadata } from "@/lib/seo";
export const metadata: Metadata = analyticsMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
