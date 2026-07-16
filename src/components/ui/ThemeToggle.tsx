"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeToggle({ size = 36 }: { size?: number }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
      style={{ width: size, height: size }}
    >
      <span className="icon" style={{ fontSize: size * 0.45 }}>
        {isLight ? "☀" : "☾"}
      </span>
    </button>
  );
}
