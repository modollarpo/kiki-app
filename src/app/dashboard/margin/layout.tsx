import type { Metadata } from "next";
import { marginMetadata } from "@/lib/seo";
export const metadata: Metadata = marginMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
