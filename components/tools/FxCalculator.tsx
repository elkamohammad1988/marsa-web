"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FX_CURRENCIES, formatCurrency } from "@/lib/fx";

const MARSA_MARKUP = 0.4; // % — matches Marsa's published FX markup above the free tier.

export function FxCalculator() {
  const [amount, setAmount] = useState(5000);
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("USD");
  const [bankMarkup, setBankMarkup] = useState(2.5);

  const [rate, setRate] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/rates?from=${from}&to=${to}`, { signal: controller.signal });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to load exchange rate.");
      }
      const data: { rate: number } = await res.json();
      setRate(data.rate);
      setStatus("ready");
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unable to load exchange rate.");
    }
  }, [from, to]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const calc = useMemo(() => {
    if (rate == null) return null;
    const mid = amount * rate;
    const marsa = mid * (1 - MARSA_MARKUP / 100);
    const bank = mid * (1 - bankMarkup / 100);
    return { mid, marsa, bank, saving: marsa - bank };
  }, [amount, rate, bankMarkup]);

  return (
    <div className="rounded-card-lg border border-line bg-card p-6 shadow-card md:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <label htmlFor="calc-amount" className="mb-1.5 block text-sm font-medium text-ink">
            Amount to convert
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-line px-3">
            <input
              id="calc-amount"
              type="number"
              min={0}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="h-11 w-full bg-transparent text-lg font-semibold text-ink outline-none"
            />
            <label htmlFor="calc-from" className="sr-only">
              From currency
            </label>
            <select
              id="calc-from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg bg-surface-blue-tint-2 px-2 py-1.5 text-sm font-medium"
            >
              {FX_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="hidden pb-3 text-center text-ink-subtle sm:block" aria-hidden>
          →
        </div>

        <div>
          <label htmlFor="calc-to" className="mb-1.5 block text-sm font-medium text-ink">
            Convert to
          </label>
          <select
            id="calc-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm font-medium text-ink"
          >
            {FX_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} — {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <label htmlFor="calc-markup" className="text-sm font-medium text-ink">
            Typical bank FX markup
          </label>
          <span className="text-sm font-semibold text-ink">{bankMarkup.toFixed(1)}%</span>
        </div>
        <input
          id="calc-markup"
          type="range"
          min={0}
          max={5}
          step={0.1}
          value={bankMarkup}
          onChange={(e) => setBankMarkup(Number(e.target.value))}
          className="mt-2 w-full accent-brand-blue"
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Most high-street banks add 2–4% on top of the mid-market rate.
        </p>
      </div>

      <div className="mt-6 border-t border-line pt-6" aria-live="polite">
        {status === "error" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-ink-muted">{errorMsg}</p>
            <button
              type="button"
              onClick={load}
              className="rounded-full bg-brand-blue px-4 py-1.5 text-xs font-medium text-on-brand hover:bg-brand-blue-deep"
            >
              Try again
            </button>
          </div>
        ) : calc == null ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-card bg-surface-blue-tint-2" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Row label="Mid-market rate" detail={`1 ${from} = ${rate?.toFixed(4)} ${to}`} value={formatCurrency(calc.mid, to)} muted />
            <Row
              label={`With Marsa (${MARSA_MARKUP}%)`}
              detail="Interbank rate, free up to your monthly allowance"
              value={formatCurrency(calc.marsa, to)}
              highlight
            />
            <Row
              label={`With a typical bank (${bankMarkup.toFixed(1)}%)`}
              detail="Marked-up rate + hidden spread"
              value={formatCurrency(calc.bank, to)}
            />
            <div className="mt-2 flex items-center justify-between rounded-card bg-success/10 px-4 py-3">
              <span className="text-sm font-semibold text-ink">You save with Marsa</span>
              <span className="text-lg font-bold text-success">{formatCurrency(Math.max(0, calc.saving), to)}</span>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-ink-subtle">
        Estimates use live ECB reference rates. Actual amounts depend on your plan, allowance, and
        the rate at the moment of transfer.
      </p>
    </div>
  );
}

function Row({
  label,
  detail,
  value,
  highlight,
  muted,
}: {
  label: string;
  detail: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-card px-4 py-3 " +
        (highlight ? "border border-brand-blue/30 bg-brand-blue/5" : "bg-surface-blue-tint-2/40")
      }
    >
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="text-xs text-ink-subtle">{detail}</div>
      </div>
      <div className={"text-base font-semibold " + (muted ? "text-ink-muted" : "text-ink")}>{value}</div>
    </div>
  );
}
