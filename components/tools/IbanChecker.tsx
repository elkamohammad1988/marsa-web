"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { validateIban, formatIban, type IbanResult } from "@/lib/iban";
import { cn } from "@/lib/utils";

const EXAMPLES = ["GB82 WEST 1234 5698 7654 32", "DE89 3704 0044 0532 0130 00", "NL91 ABNA 0417 1643 00"];

export function IbanChecker() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<IbanResult | null>(null);

  function check(raw: string) {
    const trimmed = raw.trim();
    setResult(trimmed ? validateIban(trimmed) : null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    check(value);
  }

  return (
    <div className="rounded-card-lg border border-line bg-card p-6 shadow-e1 md:p-8">
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="iban-input" className="mb-1.5 block text-sm font-medium text-ink">
          Enter an IBAN
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="iban-input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (result) setResult(null);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="GB82 WEST 1234 5698 7654 32"
            className="h-12 w-full rounded-lg border border-line bg-canvas px-4 font-mono text-sm uppercase tracking-wide text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-strong/30"
            aria-describedby={result ? "iban-result" : undefined}
          />
          <Button type="submit" variant="primary" size="lg" className="sm:w-auto">
            Check IBAN
          </Button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-subtle">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setValue(ex);
              check(ex);
            }}
            className="rounded-full bg-surface-tint px-3 py-1 font-mono text-xs text-brand-strong hover:bg-surface-tint/70"
          >
            {ex}
          </button>
        ))}
      </div>

      {result && (
        <div
          id="iban-result"
          role="status"
          aria-live="polite"
          className={cn(
            "mt-6 rounded-card border p-5",
            result.valid ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/[0.06]",
          )}
        >
          {result.valid ? (
            <>
              <div className="flex items-center gap-2 text-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-semibold">Valid IBAN</span>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-ink-subtle">Country</dt>
                  <dd className="font-medium text-ink">
                    {result.countryName} ({result.countryCode})
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-subtle">Check digits</dt>
                  <dd className="font-medium text-ink">{result.checkDigits}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-ink-subtle">Formatted</dt>
                  <dd className="font-mono font-medium tracking-wide text-ink">{result.formatted}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-ink-muted">
                This confirms the IBAN&apos;s structure and check digits are correct. It does not
                verify that the account exists or is active.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-danger">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="font-semibold">Invalid IBAN</span>
              </div>
              <p className="mt-2 text-sm text-danger">{result.reason}</p>
              {value.trim() && (
                <p className="mt-3 font-mono text-xs text-ink-subtle">{formatIban(value)}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
