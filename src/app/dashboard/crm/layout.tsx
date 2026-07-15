import type { Metadata } from "next";
import { crmMetadata } from "@/lib/seo";
export const metadata: Metadata = crmMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
