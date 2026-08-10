"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconClose } from "@/components/icons";

/**
 * The permanent marker that this site is a concept build.
 *
 * Marsa presents as a regulated financial institution — IBANs, SEPA, a live FX
 * feed, a compliance page. There is no company, no licence, no accounts and no
 * money. A visitor must not be able to mistake it for a service they could
 * sign up to, and the marker has to be present on every page rather than
 * buried in a footnote.
 *
 * Designed rather than disclaimed, deliberately. An interstitial would put a
 * modal between a visitor and the work in the first ten seconds; a banner
 * across the top would cost a strip of every viewport and read as something
 * bolted on afterwards. This is a small, on-brand affordance that expands into
 * a straight answer — and for the audience this site is built for, a project
 * that is scrupulous about not impersonating a regulated entity is making an
 * argument in its own favour.
 *
 * **It lives in the navbar, next to the wordmark.** It used to be
 * `fixed bottom-4 left-4`, floating over the page — which is the one thing a
 * permanent overlay cannot do safely, because it has no idea what is under it.
 * It was covering the left half of the primary "Get started for free" button on
 * /pricing, the account card on the mobile demo, and footer copy on several
 * marketing pages. A disclosure that obscures a call to action is a usability
 * bug; a disclosure that obscures *anything* is one waiting to happen, since
 * every new page is another chance to put content in that corner.
 *
 * Moving it into the chrome fixes the occlusion and makes the marker *more*
 * prominent rather than less: it is now beside the logo, above the fold, on
 * every route and at every width, instead of in the corner a reader's eye
 * reaches last. The panel it opens is unchanged.
 */

const REAL = [
  "Live European Central Bank rates, cached hourly — every number in the converter and the demo",
  "IBAN validation to ISO 13616 / MOD-97, fully offline",
  "A complete form-intake pipeline, admin dashboard and analytics funnel, unit-tested",
  "Sign-up, email confirmation, sign-in, password reset and roles, on Supabase Auth — creating an account stores your email address and, if you give one, your name",
];

const NOT_REAL = [
  "No company, no licence, no regulator, no partner institutions",
  "No balances, no money, no payments — the demo is a labelled sandbox",
  "The marketing forms still validate your input and then discard it — nothing there is stored or sent",
];

export function ConceptBadge() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes and returns focus, the one affordance a disclosure owes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Outside-click closes. This is new, and it is owed by the new position: as
   * a floating badge the panel was the only thing in its corner, but anchored
   * under the navbar it is a dropdown, and a dropdown that survives a click on
   * the page behind it reads as stuck. `pointerdown` rather than `click` so it
   * resolves before the underlying control activates.
   */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "inline-flex flex-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200",
          "sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px] sm:tracking-[0.12em]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          open
            ? "border-brand-strong/50 bg-brand/[0.12] text-ink"
            : "border-line-dark bg-surface-tint/60 text-ink-muted hover:border-brand-strong/45 hover:text-ink",
        )}
      >
        <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-brand-strong" />
        Concept build
        {/* The affordance hint, not the disclosure — "Concept build" itself is
            visible at every width, and the panel is what discloses. Held back
            to `xl` for room: the desktop bar turns on at `lg`, and between
            1024px and 1280px the five nav groups, Log In and the CTA already
            have the width spoken for. */}
        <span className="hidden font-normal normal-case tracking-normal text-ink-subtle xl:inline">
          {open ? "— close" : "— what's real?"}
        </span>
      </button>

      {/*
        Anchored to the navbar pill, not to the chip.

        The pill is the nearest positioned ancestor, so `left-0` is its left
        edge — which is always on screen. Anchoring to the chip instead would
        start the panel ~130px in from the left on a phone and push a 22rem
        panel off the right edge.
      */}
      {/*
        Near-opaque, not `.glass-panel`.

        That utility is 55% alpha over a backdrop blur, which is right for the
        demo card and the sandbox banner — both sit on quiet, dark surfaces of
        their own. Anchored under the navbar this panel hangs over whatever the
        page opens with, and on /pricing at 390px that is a display-size
        headline: the disclosure and "Compare Marsa accounts and cards" rendered
        on top of each other, and neither could be read.

        A panel whose whole job is to state plainly what is and is not real
        cannot be the one element on the site that is hard to read, so this one
        is solid. At 95% the headline still ghosted through the "Real software"
        and "Not real" headings; there is no amount of translucency worth that,
        and a solid dropdown is what every menu on Stripe and Linear is. The
        rim and `shadow-e3` are what lift it off the page instead.
      */}
      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className="absolute left-0 top-full z-50 mt-3 w-[min(23rem,calc(100vw-2.5rem))] origin-top-left animate-scale-in rounded-card-lg border border-line-dark bg-card p-5 shadow-e3"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Marsa is a concept build</h2>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-1 text-ink-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <IconClose aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          A portfolio piece exploring what a cross-border money product could look like. It is not
          a financial service and holds no money. You can create a real account — it is an email
          address and a password, and it opens a profile page, nothing more.
        </p>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          Real software
        </p>
        <ul className="mt-2 space-y-1.5">
          {REAL.map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-relaxed text-ink-muted">
              <span aria-hidden className="mt-1.5 h-1 w-1 flex-none rounded-full bg-success" />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          Not real
        </p>
        <ul className="mt-2 space-y-1.5">
          {NOT_REAL.map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-relaxed text-ink-muted">
              <span aria-hidden className="mt-1.5 h-1 w-1 flex-none rounded-full bg-ink-subtle" />
              {item}
            </li>
          ))}
        </ul>

        <Link
          href="/demo"
          onClick={() => setOpen(false)}
          className="mt-4 inline-flex text-xs font-medium text-brand-strong underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          See the interactive demo →
        </Link>
      </div>
    </>
  );
}
