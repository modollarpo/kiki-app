import type { Metadata } from "next";
import { signalsMetadata } from "@/lib/seo";
export const metadata: Metadata = signalsMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
