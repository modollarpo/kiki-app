import type { Metadata } from "next";
import { oaasMetadata } from "@/lib/seo";
export const metadata: Metadata = oaasMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
