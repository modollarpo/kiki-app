import type { Metadata } from "next";
import { savingsMetadata } from "@/lib/seo";
export const metadata: Metadata = savingsMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
