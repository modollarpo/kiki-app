import type { Metadata } from "next";
import { scenariosMetadata } from "@/lib/seo";
export const metadata: Metadata = scenariosMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
