"use client";
import { useState, useEffect, type ReactNode } from "react";

export function HydrationGuard({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <>{children}</>;
}
