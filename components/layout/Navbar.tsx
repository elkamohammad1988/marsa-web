"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mainNav } from "@/lib/nav";
import { siteConfig } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/icons/Logo";
import { IconMenu, IconClose, IconChevronDown, IconUserCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-container px-5 py-3 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-4 rounded-full border border-line/70 glass px-4 py-2 shadow-nav sm:px-5 lg:px-6">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            aria-label="Marsa home"
          >
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {mainNav.map((group) => {
              const hasChildren = !!group.children?.length;
              if (!hasChildren) {
                return (
                  <li key={group.label}>
                    <Link
                      href={group.href ?? "#"}
                      className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
                    >
                      {group.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li
                  key={group.label}
                  className="relative"
                  onMouseEnter={() => setOpenGroup(group.label)}
                  onMouseLeave={() => setOpenGroup(null)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenGroup(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpenGroup(null);
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={openGroup === group.label}
                    onClick={() =>
                      setOpenGroup(openGroup === group.label ? null : group.label)
                    }
                    className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2"
                  >
                    {group.label}
                    <IconChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        openGroup === group.label && "rotate-180",
                      )}
                    />
                  </button>
                  {openGroup === group.label && (
                    <div className="absolute left-0 top-full pt-2">
                      <div
                        role="menu"
                        aria-label={group.label}
                        className="min-w-[248px] origin-top animate-scale-in rounded-2xl border border-line glass p-2 shadow-elevated"
                      >
                        {group.children!.map((child) => (
                          <Link
                            key={child.label}
                            href={child.href}
                            role="menuitem"
                            onClick={() => setOpenGroup(null)}
                            className="block rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-brand-blue/[0.06] hover:text-ink focus-visible:bg-brand-blue/[0.06] focus-visible:text-ink focus-visible:outline-none"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href={siteConfig.appUrl}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
            >
              <IconUserCircle className="h-4 w-4" />
              Log In
            </Link>
            <Button href="/get-started" size="md" variant="primary">
              Open An Account
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      <div
        className={cn(
          "lg:hidden",
          mobileOpen ? "block" : "hidden",
        )}
      >
        <div className="mx-auto max-w-container px-5 pb-4 sm:px-6 lg:px-8">
          <div className="max-h-[calc(100vh-7rem)] origin-top animate-scale-in overflow-y-auto rounded-2xl border border-line glass p-4 shadow-elevated">
            <ul className="flex flex-col gap-1">
              {mainNav.map((group) => (
                <li key={group.label}>
                  {group.children?.length ? (
                    <details className="group">
                      <summary className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5">
                        {group.label}
                        <IconChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="pl-3 pt-1">
                        {group.children.map((child) => (
                          <Link
                            key={child.label}
                            href={child.href}
                            className="block rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-surface-blue-tint hover:text-ink"
                            onClick={() => setMobileOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <Link
                      href={group.href ?? "#"}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                      onClick={() => setMobileOpen(false)}
                    >
                      {group.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href={siteConfig.appUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink"
                onClick={() => setMobileOpen(false)}
              >
                <IconUserCircle className="h-4 w-4" /> Log In
              </Link>
              <Button
                href="/get-started"
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => setMobileOpen(false)}
              >
                Open An Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
