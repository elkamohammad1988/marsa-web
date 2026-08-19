"use client";

import { useEffect } from "react";

/**
 * Marks the document once React has taken over from the server-rendered HTML.
 *
 * `<html data-hydrated="true">` appears the moment the client bundle has run
 * and effects have fired — which is precisely the moment event handlers are
 * attached and the page stops being a picture of an application and starts
 * being one.
 *
 * ── Why the application states this rather than a test inferring it ────────
 * The browser smoke suite has to know when a page is interactive, and every
 * way of *guessing* is wrong in a way that costs real time:
 *
 *   • A fixed sleep is the flakiness the suite exists to remove. It is either
 *     too short on a loaded CI runner or wasted on every healthy run.
 *   • `networkidle0` never settles on a page that fetches on an interval, and
 *     the converter does.
 *   • Reading React's internal `__reactContainer$…` key off an element is
 *     guessing at a private implementation detail *and at which element owns
 *     it* — Next.js hydrates the whole document, so the key is not where the
 *     obvious guess puts it. That mistake cost a smoke run forty timeouts and
 *     sixteen minutes before it reported anything, which is a worse outcome
 *     than the bug it was looking for.
 *
 * An attribute the application sets itself has none of those problems: it is
 * public, it is ours, it means exactly one thing, and it cannot drift when
 * React changes its internals.
 *
 * ── Why it ships to production rather than being test-only ────────────────
 * Because it is worth having in production. An external uptime check or a
 * synthetic monitor asking "did the page become interactive, or did the bundle
 * fail to load?" has no other signal to read: a broken client bundle still
 * returns 200 with complete HTML, and that is exactly the outage that looks
 * healthy from the outside. This is the difference between "the server
 * answered" and "the application works", and `/api/health` cannot tell anyone
 * which.
 *
 * The cost is one attribute on `<html>` and one effect that runs once. It
 * renders nothing, so it cannot shift layout, and it reads nothing, so it
 * cannot leak anything.
 */
export function HydrationSignal() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
    // Deliberately not cleaned up on unmount. The root layout persists for the
    // lifetime of the document, and removing the attribute during a client-side
    // navigation would make it flicker false on a page that is still perfectly
    // interactive.
  }, []);

  return null;
}
