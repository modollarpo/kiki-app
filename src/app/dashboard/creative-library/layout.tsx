import type { Metadata } from "next";
import { creativeLibraryMetadata } from "@/lib/seo";
export const metadata: Metadata = creativeLibraryMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
