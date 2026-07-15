import type { Metadata } from "next";
import { developerMetadata } from "@/lib/seo";
export const metadata: Metadata = developerMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
