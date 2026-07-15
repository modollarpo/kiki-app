import type { Metadata } from "next";
import { mmmMetadata } from "@/lib/seo";
export const metadata: Metadata = mmmMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
