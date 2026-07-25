"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Honeypot } from "./fields";
import { useFormSubmit } from "./useSubmit";
import { validateSubscribe } from "@/lib/validation";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const { state, errors, message, submit, setErrors } = useFormSubmit("/api/subscribe");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateSubscribe({ email });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    const ok = await submit({ email, hp });
    if (ok) setEmail("");
  }

  if (state === "success") {
    return (
      <div
        className="flex w-full items-center gap-2 text-sm font-medium text-white md:max-w-2xl"
        role="status"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Thanks — you&apos;re subscribed. Watch your inbox for the next Marsa update.
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
          disabled={state === "submitting"}
        />
      </div>
      <Honeypot value={hp} onChange={setHp} />
      <Button type="submit" variant="white" size="md" disabled={state === "submitting"}>
        {state === "submitting" ? "Subscribing…" : "Subscribe"}
      </Button>
      <p aria-live="polite" className="sr-only">
        {state === "submitting" ? "Submitting" : ""}
      </p>
      {(errors.email || message) && (
        <p id="newsletter-error" className="text-sm font-medium text-white sm:basis-full" role="alert">
          {errors.email ?? message}
        </p>
      )}
    </form>
  );
}
