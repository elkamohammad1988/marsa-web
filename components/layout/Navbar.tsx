"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { mainNav, type NavGroup } from "@/lib/nav";
import { siteConfig } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/icons/Logo";
import { IconMenu, IconClose, IconChevronDown, IconUserCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Site navigation.
 *
 * The dropdowns used to declare `role="menu"` with `role="menuitem"` children
 * (audit F10). That pattern is a promise: arrow keys move between items,
 * Home/End jump to the ends, type-ahead selects, and focus moves into the menu
 * on open. None of it was implemented, so a screen-reader user was told
 * "menu, 6 items" and then found the arrow keys did nothing — markup that
 * describes a richer component than the one that exists.
 *
 * What this actually is, is a disclosure: a button with `aria-expanded` and
 * `aria-controls` revealing a plain list of links. That is now what it says,
 * and Tab already walks it correctly. Escape closes and returns focus to the
 * trigger, which is the one keyboard affordance a disclosure does owe.
 */

/** Shared focus ring. `ring-offset-canvas` matters: the default offset colour
 *  is white, which paints a halo on the near-black navbar. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

/** True when `href` is the current page — not merely a prefix of it. */
function isCurrent(pathname: string, href: string | undefined): boolean {
  return Boolean(href) && (pathname === href || pathname === `${href}/`);
}

/** True when any child of the group is the current page. */
function groupContainsCurrent(pathname: string, group: NavGroup): boolean {
  return (group.children ?? []).some((c) => isCurrent(pathname, c.href));
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const pathname = usePathname();
  const baseId = useId();
  const mobilePanelId = `${baseId}-mobile-nav`;

  /**
   * Which mobile sections are expanded. Controlled rather than left to the
   * browser so the section containing the current page opens by default — and
   * controlled *with* `onToggle`, because a `<details open>` given no toggle
   * handler is reset by React on the next render, silently collapsing under
   * the reader.
   */
  const [expandedMobileGroups, setExpandedMobileGroups] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  /** Triggers, so Escape can return focus to the one that opened the panel. */
  const triggerRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
    setExpandedMobileGroups(
      new Set(mainNav.filter((g) => groupContainsCurrent(pathname, g)).map((g) => g.label)),
    );
  }, [pathname]);

  const closeGroup = useCallback((label: string, restoreFocus: boolean) => {
    setOpenGroup((current) => (current === label ? null : current));
    if (restoreFocus) triggerRefs.current.get(label)?.focus();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-container px-5 py-3 sm:px-6 lg:px-8">
        <nav
          aria-label="Main"
          className="flex items-center justify-between gap-4 rounded-full border border-line/70 glass px-4 py-2 shadow-nav sm:px-5 lg:px-6"
        >
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={cn("flex items-center gap-2 rounded-full", FOCUS_RING)}
            aria-label="Marsa home"
          >
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {mainNav.map((group) => {
              const panelId = `${baseId}-${group.label.replace(/\W+/g, "-").toLowerCase()}`;
              const open = openGroup === group.label;

              if (!group.children?.length) {
                const current = isCurrent(pathname, group.href);
                return (
                  <li key={group.label}>
                    <Link
                      href={group.href ?? "#"}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-ink/5 hover:text-ink",
                        current ? "text-ink" : "text-ink-muted",
                        FOCUS_RING,
                      )}
                    >
                      {group.label}
                    </Link>
                  </li>
                );
              }

              const holdsCurrent = groupContainsCurrent(pathname, group);
              return (
                <li
                  key={group.label}
                  className="relative"
                  // Pointer-typed, not `onMouseEnter`: a tap on a touch device
                  // synthesises mouseenter *before* click, so a plain hover-open
                  // paired with a click-toggle opened and immediately closed the
                  // panel — the desktop nav is reachable at ≥1024px, which
                  // includes tablets.
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setOpenGroup(group.label);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse") setOpenGroup(null);
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenGroup(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && open) {
                      e.stopPropagation();
                      closeGroup(group.label, true);
                    }
                  }}
                >
                  <button
                    type="button"
                    ref={(node) => {
                      triggerRefs.current.set(group.label, node);
                    }}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenGroup(open ? null : group.label)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-ink/5 hover:text-ink",
                      open || holdsCurrent ? "text-ink" : "text-ink-muted",
                      FOCUS_RING,
                    )}
                  >
                    {group.label}
                    <IconChevronDown
                      aria-hidden
                      className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                    />
                  </button>

                  {/*
                    Always rendered, hidden with the `hidden` attribute rather
                    than unmounted — the same fix the accordion took in #9, for
                    the same reason: `aria-controls` must point at an element
                    that exists, or it names nothing.
                  */}
                  <div id={panelId} hidden={!open} className="absolute left-0 top-full pt-2">
                    <ul className="min-w-[248px] origin-top animate-scale-in rounded-2xl border border-line glass p-2 shadow-elevated">
                      {group.children.map((child) => {
                        const current = isCurrent(pathname, child.href);
                        return (
                          <li key={child.label}>
                            <Link
                              href={child.href}
                              aria-current={current ? "page" : undefined}
                              onClick={() => setOpenGroup(null)}
                              className={cn(
                                "block rounded-xl px-3 py-2 text-sm transition-colors hover:bg-brand-blue/[0.06] hover:text-ink",
                                "focus-visible:bg-brand-blue/[0.06] focus-visible:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand-strong",
                                current ? "bg-brand-blue/[0.06] text-ink" : "text-ink-muted",
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href={siteConfig.appUrl}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5",
                FOCUS_RING,
              )}
            >
              <IconUserCircle aria-hidden className="h-4 w-4" />
              Log In
            </Link>
            <Button href="/get-started" size="md" variant="primary">
              Open An Account
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              ref={mobileToggleRef}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-ink/5",
                FOCUS_RING,
              )}
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls={mobilePanelId}
            >
              {mobileOpen ? (
                <IconClose aria-hidden className="h-5 w-5" />
              ) : (
                <IconMenu aria-hidden className="h-5 w-5" />
              )}
            </button>
          </div>
        </nav>
      </div>

      <div
        id={mobilePanelId}
        hidden={!mobileOpen}
        className="lg:hidden"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setMobileOpen(false);
            mobileToggleRef.current?.focus();
          }
        }}
      >
        <div className="mx-auto max-w-container px-5 pb-4 sm:px-6 lg:px-8">
          <div className="max-h-[calc(100vh-7rem)] origin-top animate-scale-in overflow-y-auto rounded-2xl border border-line glass p-4 shadow-elevated">
            <ul className="flex flex-col gap-1">
              {mainNav.map((group) => (
                <li key={group.label}>
                  {group.children?.length ? (
                    <details
                      className="group"
                      open={expandedMobileGroups.has(group.label)}
                      onToggle={(e) =>
                        setExpandedMobileGroups((prev) => {
                          const next = new Set(prev);
                          if (e.currentTarget.open) next.add(group.label);
                          else next.delete(group.label);
                          return next;
                        })
                      }
                    >
                      <summary
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5",
                          FOCUS_RING,
                        )}
                      >
                        {group.label}
                        <IconChevronDown
                          aria-hidden
                          className="h-4 w-4 transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <ul className="pl-3 pt-1">
                        {group.children.map((child) => {
                          const current = isCurrent(pathname, child.href);
                          return (
                            <li key={child.label}>
                              <Link
                                href={child.href}
                                aria-current={current ? "page" : undefined}
                                className={cn(
                                  "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-blue-tint hover:text-ink",
                                  current ? "bg-surface-blue-tint text-ink" : "text-ink-muted",
                                  FOCUS_RING,
                                )}
                                onClick={() => setMobileOpen(false)}
                              >
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  ) : (
                    <Link
                      href={group.href ?? "#"}
                      aria-current={isCurrent(pathname, group.href) ? "page" : undefined}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5",
                        isCurrent(pathname, group.href) && "bg-ink/5",
                        FOCUS_RING,
                      )}
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
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5",
                  FOCUS_RING,
                )}
                onClick={() => setMobileOpen(false)}
              >
                <IconUserCircle aria-hidden className="h-4 w-4" /> Log In
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
