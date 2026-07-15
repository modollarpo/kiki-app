import type { Metadata } from "next";
import { settingsMetadata } from "@/lib/seo";
export const metadata: Metadata = settingsMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
