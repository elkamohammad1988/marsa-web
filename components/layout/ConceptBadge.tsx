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

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2 print:hidden">
      <div
        id={panelId}
        hidden={!open}
        className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] origin-bottom-left animate-scale-in rounded-card-lg border border-line-dark glass-panel p-5 shadow-e3"
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

      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line-dark glass px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink shadow-e2 transition-colors",
          "hover:border-brand-strong/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        )}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-strong shadow-glow-sm" />
        Concept build
        <span className="font-normal normal-case tracking-normal text-ink-subtle">
          {open ? "— close" : "— what's real?"}
        </span>
      </button>
    </div>
  );
}
