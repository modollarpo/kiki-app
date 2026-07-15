"use client";
import { useState, useEffect } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

const BREAKPOINTS = { xs: 0, sm: 480, md: 768, lg: 1024, xl: 1280 } as const;

export function useBreakpoint(): {
  bp: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
} {
  // Start with desktop default to avoid SSR hydration mismatch
  const [width, setWidth] = useState(1280);

  useEffect(() => {
    // Set actual width after mount
    setWidth(window.innerWidth);

    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);

  const bp: Breakpoint =
    width < BREAKPOINTS.sm
      ? "xs"
      : width < BREAKPOINTS.md
        ? "sm"
        : width < BREAKPOINTS.lg
          ? "md"
          : width < BREAKPOINTS.xl
            ? "lg"
            : "xl";

  return {
    bp,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    width,
  };
}

/**
 * Responsive value helper: pick value for current breakpoint,
 * falling back to smaller breakpoints if the current one isn't defined.
 */
export function rv<T>(
  values: Partial<Record<Breakpoint, T>>,
  bp: Breakpoint,
  fallback: T
): T {
  const order: Breakpoint[] = ["xs", "sm", "md", "lg", "xl"];
  const idx = order.indexOf(bp);
  for (let i = idx; i >= 0; i--) {
    const v = values[order[i]!];
    if (v !== undefined) return v;
  }
  return fallback;
}
