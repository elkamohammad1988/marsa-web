"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "marsa-cookie-consent";

/** Fired so analytics/marketing scripts can react to a consent decision. */
function broadcast(value: "accepted" | "rejected") {
  try {
    window.dispatchEvent(new CustomEvent("marsa:cookie-consent", { detail: value }));
  } catch {
    /* no-op */
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* storage unavailable — don't block the page */
    }
  }, []);

  function decide(value: "accepted" | "rejected") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    broadcast(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-container flex-col gap-4 rounded-card-lg border border-line bg-card p-5 shadow-nav md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-ink-muted">
          We use cookies to run this site and, with your consent, to improve it. See our{" "}
          <Link href="/legal/cookies" className="font-medium text-brand-strong hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex flex-none gap-3">
          <Button type="button" variant="outline" size="md" onClick={() => decide("rejected")}>
            Reject non-essential
          </Button>
          <Button type="button" variant="primary" size="md" onClick={() => decide("accepted")}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
