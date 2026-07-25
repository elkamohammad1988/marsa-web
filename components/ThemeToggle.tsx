"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@/components/icons";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

/**
 * Light/dark theme switch. The initial class on <html> is set by the inline
 * script in app/layout.tsx (before paint, so there is no flash); this control
 * just reads the current state on mount and persists changes to localStorage.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / storage disabled — the choice just won't persist */
    }
    setTheme(next);
  }

  // Render a stable placeholder until mounted to avoid a hydration mismatch.
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 ring-offset-canvas",
        className,
      )}
    >
      {theme === null ? (
        <span className="h-4 w-4" aria-hidden />
      ) : isDark ? (
        <IconSun className="h-4 w-4" aria-hidden />
      ) : (
        <IconMoon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
