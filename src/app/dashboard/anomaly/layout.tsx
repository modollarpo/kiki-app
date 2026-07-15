import type { Metadata } from "next";
import { anomalyMetadata } from "@/lib/seo";
export const metadata: Metadata = anomalyMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
