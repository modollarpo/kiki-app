import type { Metadata } from "next";
import { syncbrainMetadata } from "@/lib/seo";
export const metadata: Metadata = syncbrainMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
