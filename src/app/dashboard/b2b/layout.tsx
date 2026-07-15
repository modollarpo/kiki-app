import type { Metadata } from "next";
import { b2bMetadata } from "@/lib/seo";
export const metadata: Metadata = b2bMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
