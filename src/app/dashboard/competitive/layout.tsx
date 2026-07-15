import type { Metadata } from "next";
import { competitiveMetadata } from "@/lib/seo";
export const metadata: Metadata = competitiveMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
