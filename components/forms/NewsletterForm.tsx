"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Honeypot } from "./fields";
import { useDemoSubmit } from "./useDemoSubmit";
import { validateSubscribe } from "@/lib/validation";

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
        className="flex w-full items-start gap-2.5 text-sm text-white md:max-w-2xl"
        role="status"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="mt-0.5 flex-none">
          <path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>
          <span className="font-medium">Checked, and discarded.</span> There is no mailing list —
          this is a concept build, so nothing was stored and no address was captured.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center md:max-w-2xl"
    >
      <span className="whitespace-nowrap text-sm font-medium">Subscribe to our Newsletter</span>
      <div className="flex-1">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <Input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors({});
          }}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "newsletter-error" : undefined}
          className="border-transparent"
        />
      </div>
      <Honeypot value={hp} onChange={setHp} />
      <Button type="submit" variant="white" size="md">
        Subscribe
      </Button>
      {errors.email && (
        <p id="newsletter-error" className="text-sm font-medium text-white sm:basis-full" role="alert">
          {errors.email}
        </p>
      )}
    </form>
  );
}
