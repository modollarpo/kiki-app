import type { Metadata } from "next";
import { billingMetadata } from "@/lib/seo";
export const metadata: Metadata = billingMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
