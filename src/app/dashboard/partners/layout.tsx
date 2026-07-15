import type { Metadata } from "next";
import { partnersMetadata } from "@/lib/seo";
export const metadata: Metadata = partnersMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
