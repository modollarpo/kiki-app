import type { Metadata } from "next";
import { consentMetadata } from "@/lib/seo";
export const metadata: Metadata = consentMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
