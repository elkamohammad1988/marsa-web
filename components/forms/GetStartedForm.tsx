"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextField, SelectField, CheckboxField, Honeypot } from "./fields";
import { useDemoSubmit } from "./useDemoSubmit";
import { DemoSubmissionNotice } from "./DemoSubmissionNotice";
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
  const { state, errors, submit, setErrors } = useDemoSubmit(validateLead);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The honeypot is still read, so a bot filling it is silently ignored
    // exactly as the server would — the rule is demonstrated, not simulated.
    if (hp.trim() !== "") return;
    submit({ name, email, accountType, company, country, consent, plan: defaultPlan });
  }

  if (state === "accepted") {
    return (
      <DemoSubmissionNotice
        title="That would have opened an application"
        endpoint="POST /api/leads"
        steps={[
          {
            label: "Re-validate on the server",
            detail: "The same rules that just ran in your browser, as the source of truth.",
          },
          {
            label: "Rate-limit and screen for bots",
            detail: "A shared, cross-instance window plus a honeypot field.",
          },
          {
            label: "Store durably, then notify",
            detail: "Written to Postgres before anyone is emailed — never the other way round.",
          },
          {
            label: "Begin identity verification",
            detail: "A KYC provider would take it from here, in the real product.",
          },
        ]}
        primary={{ label: "Try the interactive demo", href: "/demo" }}
        secondary={{ label: "Review plans", href: "/pricing" }}
      />
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
                accountType === t ? "bg-brand text-on-brand" : "text-ink hover:bg-ink/5",
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

      <Button type="submit" variant="primary" size="lg" className="mt-6 w-full">
        Create my account
      </Button>

      <p className="mt-4 text-center text-xs text-ink-subtle">
        Opening an account is free and takes about 5 minutes. No credit check.
      </p>
    </form>
  );
}
