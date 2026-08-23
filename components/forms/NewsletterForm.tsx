"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Honeypot } from "./fields";
import { useDemoSubmit } from "./useDemoSubmit";
import { validateSubscribe } from "@/lib/validation";

/**
 * Footer newsletter capture.
 *
 * Previously a single inline row — the words "Subscribe to our Newsletter"
 * jammed against the field, submitted by the only pure-white button in the
 * product. It sat inside a near-black pill, so the least consequential action
 * on the page carried the highest contrast on it.
 *
 * The `text-white` colours here were also load-bearing on that pill's dark
 * background. The pill is gone, so they are tokens now; left as they were they
 * would have been white text on `--surface-tint-2`, which is not far off white
 * on white.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const { state, errors, submit, setErrors } = useDemoSubmit(validateSubscribe);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hp.trim() !== "") return;
    submit({ email });
  }

  /**
   * The footer has no room for the full notice panel, so this says the same
   * thing in one line. "You're subscribed" would have been a lie in the one
   * component that renders on every page of the site.
   */
  if (state === "accepted") {
    return (
      <div
        className="flex w-full items-start gap-2.5 rounded-card border border-line bg-card p-4 text-sm text-ink-muted"
        role="status"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="mt-0.5 flex-none text-success"
        >
          <path
            d="M4 12l5 5L20 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          <span className="font-medium text-ink">Checked, and discarded.</span> There is no
          mailing list. This is a concept build, so nothing was stored and no address was
          captured.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
        Newsletter
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Occasional notes on cross-border payments and FX. No mailing list exists. Addresses are
        validated and discarded.
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <Input
            id="newsletter-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({});
            }}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "newsletter-error" : undefined}
          />
        </div>
        <Honeypot value={hp} onChange={setHp} />
        <Button type="submit" variant="outline" size="md" className="shrink-0">
          Subscribe
        </Button>
      </div>
      {errors.email && (
        <p id="newsletter-error" className="mt-2 text-sm font-medium text-danger" role="alert">
          {errors.email}
        </p>
      )}
    </form>
  );
}
