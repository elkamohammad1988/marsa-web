"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextField, SelectField, CheckboxField, Honeypot } from "./fields";
import { useFormSubmit } from "./useSubmit";
import { validateLead, type AccountType } from "@/lib/validation";
import { countries } from "@/lib/countries";
import { cn } from "@/lib/utils";

type Props = {
  defaultType?: AccountType;
  defaultPlan?: string;
};

export function GetStartedForm({ defaultType = "personal", defaultPlan }: Props) {
  const [accountType, setAccountType] = useState<AccountType>(defaultType);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const { state, errors, message, submit, setErrors } = useFormSubmit("/api/leads");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, email, accountType, company, country, consent, plan: defaultPlan };
    const result = validateLead(payload);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    await submit({ ...payload, hp });
  }

  if (state === "success") {
    return (
      <div className="rounded-card-lg border border-line bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-5 text-2xl font-bold text-ink">Application received</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-muted">
          Thanks, {name.split(" ")[0] || "there"}. Our onboarding team will email{" "}
          <span className="font-medium text-ink">{email}</span> within one business day with your
          next steps and identity-verification link.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="/pricing" variant="outline" size="md">
            Review plans
          </Button>
          <Button href="/tools/currency-converter" variant="primary" size="md">
            Try the converter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative rounded-card-lg border border-line bg-card p-6 shadow-card md:p-8"
    >
      <fieldset className="mb-5">
        <legend className="mb-1.5 block text-sm font-medium text-ink">Account type</legend>
        <div className="inline-flex w-full rounded-xl border border-line p-1 sm:w-auto">
          {(["personal", "business"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAccountType(t)}
              aria-pressed={accountType === t}
              className={cn(
                "flex-1 rounded-lg px-5 py-2 text-sm font-medium capitalize transition-colors sm:flex-none",
                accountType === t ? "bg-brand-blue text-on-brand" : "text-ink hover:bg-ink/5",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
          placeholder="Jordan Rivera"
        />
        <TextField
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
          placeholder="you@company.com"
        />
        {accountType === "business" && (
          <TextField
            label="Company name"
            name="company"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            error={errors.company}
            required
            placeholder="Acme Trading Ltd"
          />
        )}
        <SelectField
          label="Country of residence"
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          error={errors.country}
          required
          className={accountType === "business" ? "" : "sm:col-span-2"}
        >
          <option value="" disabled>
            Select a country…
          </option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-5">
        <CheckboxField
          name="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          error={errors.consent}
          label={
            <>
              I agree to Marsa&apos;s{" "}
              <Link href="/legal/terms" className="font-medium text-brand-strong hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="font-medium text-brand-strong hover:underline">
                Privacy Policy
              </Link>
              .
            </>
          }
        />
      </div>

      <Honeypot value={hp} onChange={setHp} />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-6 w-full"
        disabled={state === "submitting"}
      >
        {state === "submitting" ? "Submitting…" : "Create my account"}
      </Button>

      {message && state === "error" && (
        <p className="mt-3 text-sm font-medium text-danger" role="alert">
          {message}
        </p>
      )}
      <p className="mt-4 text-center text-xs text-ink-subtle">
        Opening an account is free and takes about 5 minutes. No credit check.
      </p>
    </form>
  );
}
