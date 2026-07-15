import type { Metadata } from "next";
import { workflowMetadata } from "@/lib/seo";
export const metadata: Metadata = workflowMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
