import type { Metadata } from "next";
import { notificationsMetadata } from "@/lib/seo";
export const metadata: Metadata = notificationsMetadata;
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
