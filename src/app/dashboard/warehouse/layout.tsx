import type { Metadata } from "next";
import { warehouseMetadata } from "@/lib/seo";
export const metadata: Metadata = warehouseMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
