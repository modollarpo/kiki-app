import type { Metadata } from "next";
import { influencerMetadata } from "@/lib/seo";
export const metadata: Metadata = influencerMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
