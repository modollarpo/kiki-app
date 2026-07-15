import type { Metadata } from "next";
import { walletMetadata } from "@/lib/seo";
export const metadata: Metadata = walletMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
