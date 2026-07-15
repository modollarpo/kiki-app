import type { Metadata } from "next";
import { financeMetadata } from "@/lib/seo";
export const metadata: Metadata = financeMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
