import type { Metadata } from "next";
import { aiopMetadata } from "@/lib/seo";
export const metadata: Metadata = aiopMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
