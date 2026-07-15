import type { Metadata } from "next";
import { mobileMetadata } from "@/lib/seo";
export const metadata: Metadata = mobileMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
