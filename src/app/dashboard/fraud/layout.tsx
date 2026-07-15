import type { Metadata } from "next";
import { fraudMetadata } from "@/lib/seo";
export const metadata: Metadata = fraudMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
