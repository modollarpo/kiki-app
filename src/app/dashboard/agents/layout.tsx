import type { Metadata } from "next";
import { agentsMetadata } from "@/lib/seo";
export const metadata: Metadata = agentsMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
