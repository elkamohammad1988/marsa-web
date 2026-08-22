"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { mainNav, type NavGroup } from "@/lib/nav";
import { siteConfig } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/icons/Logo";
import { ConceptBadge } from "@/components/layout/ConceptBadge";
import { IconMenu, IconClose, IconChevronDown } from "@/components/icons";
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

  /**
   * Whether the page has scrolled at all — the bar tightens and lifts off the
   * page once it has. A boolean that flips at most twice per journey, so it
   * can be React state; the read is still coalesced to one frame because a
   * scroll handler fires far faster than the display refreshes.
   *
   * It used to also compute a 0–1 ratio for a gradient reading-progress rail
   * drawn along the bottom of the pill. The rail said nothing the scrollbar
   * beside it was not already saying, so both it and the measurement are gone.
   */
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

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
      <div
        className={cn(
          "mx-auto max-w-container px-5 transition-[padding] duration-300 sm:px-6 lg:px-8",
          scrolled ? "py-2" : "py-3",
        )}
      >
        <nav
          aria-label="Main"
          className={cn(
            "relative flex items-center justify-between gap-4 rounded-full border glass px-4 transition-[padding,border-color,box-shadow] duration-300 sm:px-5 lg:px-6",
            scrolled
              ? "border-brand-strong/25 py-1.5 shadow-e3"
              : "border-line/70 py-2 shadow-nav",
          )}
        >
          {/*
            Logo and concept marker travel together, and this wrapper is
            deliberately *not* `relative`: the disclosure panel inside
            `ConceptBadge` is absolutely positioned, and the containing block it
            wants is the nav pill, so that `left-0` is an edge that is always on
            screen. Making this wrapper positioned would anchor the panel to the
            chip and push it off the right of a phone.
          */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className={cn("flex flex-none items-center gap-2 rounded-full", FOCUS_RING)}
              aria-label="Marsa home"
            >
              {/*
                The wordmark is dropped in exactly the two bands where the bar
                runs out of room, and shown everywhere else.

                Below `sm` the mark, wordmark, chip and menu button do not fit —
                at 320px the chip ran under the menu button. Between `lg` and
                `xl` the full desktop bar is live (five nav groups, Log In and
                the CTA) while the container is still only 1024–1280 wide, and
                the row overflowed by ~14px. Both bands keep the mark tile,
                which is the brand at small sizes anyway, and the link keeps its
                `aria-label`, so the accessible name never depends on this.
              */}
              <Logo wordmarkClassName="hidden sm:inline lg:hidden xl:inline" />
            </Link>
            <ConceptBadge />
          </div>

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
                        // 10px of side padding between `lg` and `xl`, 12px above.
                        // The desktop bar turns on at `lg`, where five nav
                        // groups, the concept chip, Log In and the CTA have to
                        // share 1024–1280px; at 12px the row overflowed its
                        // container. Two pixels an item, taken back at `xl`.
                        "rounded-full px-2.5 py-2 text-sm font-medium transition-colors hover:bg-ink/5 hover:text-ink xl:px-3",
                        // Gold is how this site says "important", so it is what
                        // the current page gets. `text-ink` alone was a
                        // lightness difference on a bar where the CTA, the
                        // wordmark and every hovered item are also `text-ink`.
                        current ? "nav-current text-brand-strong" : "text-ink-muted",
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
                      // Matches the plain nav link above: 10px of side padding
                      // between `lg` and `xl`, 12px above.
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-2 text-sm font-medium transition-colors hover:bg-ink/5 hover:text-ink xl:px-3",
                      // The indicator tracks the *page*, the gold text tracks
                      // either. An open panel is a thing the reader is doing;
                      // the rule underneath is a statement about where they
                      // are, and drawing it on hover would make it a lie.
                      holdsCurrent && "nav-current",
                      open || holdsCurrent ? "text-brand-strong" : "text-ink-muted",
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
                                "block rounded-xl px-3 py-2 text-sm transition-colors hover:bg-brand/[0.06] hover:text-ink",
                                "focus-visible:bg-brand/[0.06] focus-visible:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand-strong",
                                current
                                  ? "bg-brand/[0.08] text-brand-strong"
                                  : "text-ink-muted",
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
                "inline-flex flex-none items-center whitespace-nowrap rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5",
                FOCUS_RING,
              )}
            >
              Log In
            </Link>
            <Button href="/get-started" size="md" variant="primary">
              Open an account
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
                      onToggle={(e) => {
                        // Read `open` here, synchronously, and close over the
                        // boolean. React nulls `currentTarget` as soon as the
                        // handler returns, but a `setState` updater does not
                        // run until the next render — so reading it *inside*
                        // the updater throws "Cannot read properties of null".
                        //
                        // That is not a theoretical race. The effect above
                        // opens the group containing the current page on
                        // mount, which fires this toggle during hydration, so
                        // every route sitting inside a nav group took the
                        // throw straight to `app/global-error.tsx` — eleven of
                        // them, including /demo, /pricing and every /tools
                        // page. The crash was invisible to the server render
                        // and to any check that did not run the built client.
                        const isOpen = e.currentTarget.open;
                        setExpandedMobileGroups((prev) => {
                          const next = new Set(prev);
                          if (isOpen) next.add(group.label);
                          else next.delete(group.label);
                          return next;
                        });
                      }}
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
                                  "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-tint hover:text-ink",
                                  current
                                    ? "bg-surface-tint text-brand-strong"
                                    : "text-ink-muted",
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
                        "block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-ink/5",
                        isCurrent(pathname, group.href)
                          ? "bg-ink/5 text-brand-strong"
                          : "text-ink",
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
                  "inline-flex items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5",
                  FOCUS_RING,
                )}
                onClick={() => setMobileOpen(false)}
              >
                Log In
              </Link>
              <Button
                href="/get-started"
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => setMobileOpen(false)}
              >
                Open an account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
