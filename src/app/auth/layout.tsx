import type { Metadata } from "next";
import { loginMetadata } from "@/lib/seo";
export const metadata: Metadata = loginMetadata;
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
