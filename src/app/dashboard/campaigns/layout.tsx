import type { Metadata } from "next";
import { campaignsMetadata } from "@/lib/seo";
export const metadata: Metadata = campaignsMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
