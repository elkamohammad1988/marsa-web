"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MarsaMark } from "@/components/icons/Logo";
import { cn } from "@/lib/utils";
import { hasRejectedNonEssential } from "@/lib/consent";
import {
  DEMO_COUNTRIES,
  DEMO_SCRIPT,
  DEMO_STEPS,
  formatIbanBlocks,
  generateSampleIban,
  advanceFrom,
  money,
  previousStep,
  stepIndex,
  type AccountType,
  type Balances,
  type DemoStepId,
} from "@/lib/demo";
import type { FunnelStep } from "@/lib/analytics";

const ZERO: Balances = { USD: 0, EUR: 0, GBP: 0 };

/** Which demo steps map to a funnel event (fired once per session on enter). */
const STEP_TO_FUNNEL: Partial<Record<DemoStepId, FunnelStep>> = {
  profile: "start",
  identity: "kyc",
  account: "iban",
  receive: "payout",
  convert: "convert",
  done: "done",
};

/** Count a number up to its target, instantly under reduced motion. */
function useAnimatedNumber(value: number): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = fromRef.current;
    const end = value;
    if (reduce || start === end) {
      setDisplay(end);
      fromRef.current = end;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 650;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (end - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return display;
}

type Activity = { id: number; title: string; meta: string; amount: string; kind: "in" | "out" | "fx" };

const ARROW = {
  in: "M12 5v14M12 19l6-6M12 19l-6-6",
  out: "M12 19V5M12 5l6 6M12 5l-6 6",
  fx: "M4 8h13l-3-3M20 16H7l3 3",
};

export function DemoFlow() {
  const [step, setStep] = useState<DemoStepId>("welcome");
  const [accountType, setAccountType] = useState<AccountType>("business");
  const [country, setCountry] = useState(DEMO_COUNTRIES[0].code);
  const [iban] = useState(() => generateSampleIban());
  const [balances, setBalances] = useState<Balances>(ZERO);
  const [activity, setActivity] = useState<Activity[]>([]);
  const activityId = useRef(0);

  // Simulated KYC progress.
  const [kyc, setKyc] = useState(0);

  // Live FX (USD→EUR), fetched once when the convert step is reached.
  const [rate, setRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [rateState, setRateState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const blockedHintId = useId();
  /**
   * Focus moves to the step heading on every step change *except the first*.
   * Doing it on mount pulled focus into the middle of the page on arrival, so
   * a keyboard visitor landed past the skip link and the whole navbar with no
   * idea they had been moved.
   */
  const hasNavigated = useRef(false);

  /**
   * One sentence describing what just happened, for screen readers.
   *
   * This replaces an `aria-live="polite"` wrapped around the entire step panel
   * — which announced the heading, the body copy and every control on each
   * transition, *and* fought the focus move for the same content. A live
   * region should say what changed, and what changes here is a balance.
   */
  const [announcement, setAnnouncement] = useState("");

  /** Currency tiles to highlight briefly after a balance moves. */
  const [flash, setFlash] = useState<ReadonlySet<keyof Balances>>(() => new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlight = useCallback((...codes: (keyof Balances)[]) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(new Set(codes));
    flashTimer.current = setTimeout(() => setFlash(new Set()), 1200);
  }, []);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  // First-party funnel telemetry: a random per-visit id, no cookies, no PII.
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Math.random().toString(36).slice(2)}`,
  );
  const sentRef = useRef<Set<string>>(new Set());

  const idx = stepIndex(step);
  const previous = previousStep(step);

  const animUsd = useAnimatedNumber(balances.USD);
  const animEur = useAnimatedNumber(balances.EUR);
  const animGbp = useAnimatedNumber(balances.GBP);

  const pushActivity = useCallback((a: Omit<Activity, "id">) => {
    activityId.current += 1;
    setActivity((prev) => [{ ...a, id: activityId.current }, ...prev]);
  }, []);

  // Move focus to the step heading so keyboard/screen-reader users follow
  // along — but not on arrival, when nobody asked to be moved anywhere.
  useEffect(() => {
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // Fire a funnel event on entering a tracked step — once per session, and
  // never when the visitor has Do Not Track enabled. Fire-and-forget.
  useEffect(() => {
    const funnelStep = STEP_TO_FUNNEL[step];
    if (!funnelStep || sentRef.current.has(funnelStep) || !sessionId) return;
    sentRef.current.add(funnelStep);
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
    // Honour an explicit refusal. Until now the banner's "Reject
    // non-essential" wrote a decision that nothing read, so a visitor who
    // refused was tracked through the funnel anyway (audit S7).
    if (hasRejectedNonEssential()) return;
    void fetch("/api/demo/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, step: funnelStep }),
      keepalive: true,
    }).catch(() => {});
  }, [step, sessionId]);

  // Drive the fake identity check when the step is shown.
  useEffect(() => {
    if (step !== "identity") return;
    setKyc(0);
    const timers = [
      setTimeout(() => setKyc(34), 400),
      setTimeout(() => setKyc(72), 1000),
      setTimeout(() => setKyc(100), 1700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [step]);

  // Fetch the real interbank rate when reaching the convert step.
  const loadRate = useCallback(async () => {
    setRateState("loading");
    try {
      const res = await fetch("/api/rates?from=USD&to=EUR");
      if (!res.ok) throw new Error("rate unavailable");
      const data = (await res.json()) as { rate: number; date: string };
      setRate(data.rate);
      setRateDate(data.date);
      setRateState("ready");
    } catch {
      setRateState("error");
    }
  }, []);

  useEffect(() => {
    if (step === "convert" && rateState === "idle") loadRate();
  }, [step, rateState, loadRate]);

  function go(next: DemoStepId) {
    setStep(next);
  }

  function reset() {
    setBalances(ZERO);
    setActivity([]);
    setRate(null);
    setRateDate(null);
    setRateState("idle");
    setKyc(0);
    setAnnouncement("");
    setStep("welcome");
  }

  function receivePayout() {
    const next = balances.USD + DEMO_SCRIPT.payoutUsd;
    setBalances((b) => ({ ...b, USD: b.USD + DEMO_SCRIPT.payoutUsd }));
    pushActivity({
      kind: "in",
      title: "Stripe payout",
      meta: "Received · just now",
      amount: `+${money(DEMO_SCRIPT.payoutUsd, "USD")}`,
    });
    highlight("USD");
    setAnnouncement(
      `Received ${money(DEMO_SCRIPT.payoutUsd, "USD")}. USD balance is now ${money(next, "USD")}.`,
    );
  }

  function convert() {
    if (rate == null) return;
    const eur = DEMO_SCRIPT.convertUsd * rate;
    setBalances((b) => ({ ...b, USD: b.USD - DEMO_SCRIPT.convertUsd, EUR: b.EUR + eur }));
    pushActivity({
      kind: "fx",
      title: "USD → EUR",
      meta: `Interbank rate ${rate.toFixed(4)}`,
      amount: money(eur, "EUR"),
    });
    highlight("USD", "EUR");
    setAnnouncement(
      `Converted ${money(DEMO_SCRIPT.convertUsd, "USD")} at ${rate.toFixed(4)}. ` +
        `EUR balance is now ${money(balances.EUR + eur, "EUR")}.`,
    );
  }

  function sendSepa() {
    const next = balances.EUR - DEMO_SCRIPT.sendEur;
    setBalances((b) => ({ ...b, EUR: b.EUR - DEMO_SCRIPT.sendEur }));
    pushActivity({
      kind: "out",
      title: "SEPA to supplier",
      meta: "Sent · just now",
      amount: `−${money(DEMO_SCRIPT.sendEur, "EUR")}`,
    });
    highlight("EUR");
    setAnnouncement(
      `Sent ${money(DEMO_SCRIPT.sendEur, "EUR")} over SEPA. EUR balance is now ${money(next, "EUR")}.`,
    );
  }

  const advance = advanceFrom(step, {
    kycComplete: kyc >= 100,
    usd: balances.USD,
    eur: balances.EUR,
    hasSentSepa: activity.some((a) => a.kind === "out"),
    rateReady: rateState === "ready",
  });

  const accountLive = idx >= stepIndex("account");
  const rateAsOf =
    rateDate &&
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${rateDate}T00:00:00Z`));

  return (
    <div className="mx-auto max-w-5xl">
      {/* Sandbox disclosure — honesty first: nothing here is a real account,
          and we say plainly what anonymous telemetry we collect. */}
      <p className="glass-panel mb-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-line-dark px-4 py-2.5 text-center text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-strong shadow-glow-sm" /> Interactive
          sandbox
        </span>
        Sample data, no real money — the exchange rate is live from the ECB. We log
        anonymous step progress (no cookies, no personal data) to improve the demo.
      </p>

      {/* Progress rail — completed segments glow; the active one gently pulses. */}
      <ol className="mb-6 flex items-center gap-1.5" aria-label="Demo progress">
        {DEMO_STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.id} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-full rounded-full transition-colors",
                  done && "rail-done bg-brand-blue",
                  active && "animate-rail-pulse bg-brand-blue",
                  !done && !active && "bg-line",
                )}
                aria-hidden
              />
              {/*
                `sr-only sm:not-sr-only`, not `hidden sm:block`: below 640px
                the labels were `display: none`, so the progress rail told a
                screen-reader user on a phone nothing at all — eight unnamed
                bars and an `aria-current` pointing at one of them.
              */}
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "sr-only text-[11px] font-medium transition-colors sm:not-sr-only",
                  active ? "text-brand-strong" : "text-ink-subtle",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.05fr]">
        {/* Live account panel */}
        <div
          className={cn(
            "gradient-ring relative overflow-hidden rounded-card-lg border border-line bg-card p-5 shadow-e2 transition-opacity sm:p-6",
            accountLive ? "opacity-100" : "opacity-60",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="logo-tile grid h-8 w-8 place-items-center rounded-[10px] text-white">
                <MarsaMark className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-ink">
                  {accountType === "business" ? "Business account" : "Personal account"}
                </p>
                <p className="font-mono text-[11px] text-ink-subtle">
                  {accountLive ? formatIbanBlocks(iban) : "IBAN pending…"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                accountLive
                  ? "border-line bg-canvas/60 text-ink-muted"
                  : "border-line bg-canvas/60 text-ink-subtle",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", accountLive ? "bg-success" : "bg-ink-subtle")} />
              {accountLive ? "Active" : "Setup"}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-subtle">
              Balances
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["EUR", "USD", "GBP"] as const).map((ccy) => {
                const val = ccy === "USD" ? animUsd : ccy === "EUR" ? animEur : animGbp;
                return (
                  <div
                    key={ccy}
                    className={cn(
                      // The number already counts up; this says *which* number
                      // moved, which a counting animation on its own does not.
                      // A colour change rather than motion, so it still reads
                      // under `prefers-reduced-motion`.
                      "rounded-xl border bg-canvas/50 px-3 py-2.5 transition-colors duration-500",
                      flash.has(ccy)
                        ? "border-brand-strong/50 bg-brand-blue/[0.07]"
                        : "border-line/70",
                    )}
                  >
                    <p className="text-[11px] font-semibold tracking-wide text-ink-subtle">{ccy}</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
                      {money(val, ccy)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-subtle">Activity</p>
            {activity.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-subtle">
                No activity yet — money you receive and send will appear here.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line/70">
                {activity.map((a) => (
                  // Keyed, so only a newly prepended row plays the animation —
                  // the rows already on screen keep their DOM node and stay put.
                  <li key={a.id} className="flex animate-row-in items-center gap-3 py-3">
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                        a.kind === "in"
                          ? "bg-success/[0.12] text-success"
                          : a.kind === "out"
                            ? "bg-ink/[0.06] text-ink-muted"
                            : "bg-brand-blue/[0.12] text-brand-strong",
                      )}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                        <path
                          d={ARROW[a.kind]}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                      <span className="block text-[11px] text-ink-subtle">{a.meta}</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        a.kind === "in" ? "text-success num-glow" : "text-ink",
                      )}
                    >
                      {a.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Step content */}
        <div className="gradient-ring rounded-card-lg border border-line bg-card p-6 shadow-e2 sm:p-8">
          {/*
            One targeted live region, announcing what actually changed. The
            panel below used to be wrapped in `aria-live="polite"`, so every
            transition read out the heading, the body copy and each control —
            while the focus move was announcing the same heading again.
          */}
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>

          {/* `key` restarts the entrance on each step; 320px reserves the
              height so the controls below do not jump between steps. */}
          <div key={step} className="min-h-[320px] animate-step-in">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-semibold text-ink outline-none md:text-2xl"
            >
              {step === "welcome" && "See Marsa work, end to end"}
              {step === "profile" && "Open your account"}
              {step === "identity" && "Verify your identity"}
              {step === "account" && "Your account is live"}
              {step === "receive" && "Get paid from abroad"}
              {step === "convert" && "Convert at the interbank rate"}
              {step === "send" && "Pay out over SEPA"}
              {step === "done" && "That's the whole loop"}
            </h2>

            <div className="mt-4 text-sm leading-relaxed text-ink-muted">
              {step === "welcome" && (
                <p>
                  Walk through the real Marsa journey in about a minute: open an account, get a
                  European IBAN, receive a payout from abroad, convert it at the live interbank
                  rate, and send it out over SEPA — the exact loop a cross-border seller runs every
                  week.
                </p>
              )}

              {step === "profile" && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 font-medium text-ink">Account type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["business", "personal"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAccountType(t)}
                          aria-pressed={accountType === t}
                          className={cn(
                            "rounded-xl border px-4 py-3 text-left text-sm capitalize transition-colors",
                            accountType === t
                              ? "border-brand-blue bg-brand-blue/[0.06] text-ink"
                              : "border-line text-ink-muted hover:border-brand-blue/40",
                          )}
                        >
                          <span className="block font-semibold text-ink">{t}</span>
                          <span className="text-xs text-ink-subtle">
                            {t === "business" ? "Company or sole trader" : "Individual"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="demo-country" className="mb-2 block font-medium text-ink">
                      Where are you based?
                    </label>
                    <select
                      id="demo-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="h-11 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
                    >
                      {DEMO_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-ink-subtle">
                      Marsa onboards from 180+ countries — this list is just a sample.
                    </p>
                  </div>
                </div>
              )}

              {step === "identity" && (
                <div className="space-y-4">
                  <p>
                    In the real product this is a secure digital KYC check — ID document plus a
                    liveness selfie, run through our verification partner. Here it is simulated.
                  </p>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-brand-strong transition-[width] duration-500 ease-out"
                        style={{ width: `${kyc}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-ink-subtle" aria-live="polite">
                      {kyc < 100 ? "Checking document and sanctions lists…" : "Identity verified ✓"}
                    </p>
                  </div>
                </div>
              )}

              {step === "account" && (
                <div className="space-y-4">
                  <p>
                    Done. You now hold a European multi-currency IBAN in your own name, ready to
                    receive in 30+ currencies.
                  </p>
                  <div className="rounded-xl border border-line bg-surface-blue-tint-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                      Your IBAN
                    </p>
                    <p className="mt-1 font-mono text-base font-semibold tracking-wide text-ink">
                      {formatIbanBlocks(iban)}
                    </p>
                    <p className="mt-1 text-xs text-ink-subtle">
                      Sample IBAN — structurally valid, not a live account.
                    </p>
                  </div>
                </div>
              )}

              {step === "receive" && (
                <div className="space-y-4">
                  <p>
                    A client abroad pays a {money(DEMO_SCRIPT.payoutUsd, "USD")} invoice into your
                    USD balance — no intermediary bank, no lost days. Tap to receive it.
                  </p>
                  <Button type="button" onClick={receivePayout} disabled={balances.USD > 0}>
                    {balances.USD > 0 ? "Payout received ✓" : `Receive ${money(DEMO_SCRIPT.payoutUsd, "USD")}`}
                  </Button>
                </div>
              )}

              {step === "convert" && (
                <div className="space-y-4">
                  <p>
                    Move {money(DEMO_SCRIPT.convertUsd, "USD")} into euros at the real mid-market
                    rate — the same number banks quote each other, with no hidden spread.
                  </p>
                  <div className="rounded-xl border border-line bg-surface-blue-tint-2 p-4 text-sm">
                    {rateState === "loading" && <span className="text-ink-subtle">Loading live rate…</span>}
                    {rateState === "error" && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-ink-subtle">Couldn&apos;t reach the live rate.</span>
                        <button
                          type="button"
                          onClick={loadRate}
                          className="rounded-full bg-brand-blue px-3 py-1 text-xs font-medium text-on-brand"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {rateState === "ready" && rate != null && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-ink-muted">
                          1 USD ={" "}
                          <span className="num-glow font-semibold tabular-nums text-ink">
                            {rate.toFixed(4)}
                          </span>{" "}
                          EUR
                        </span>
                        <span className="text-xs text-ink-subtle">ECB · {rateAsOf}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={convert}
                    disabled={rateState !== "ready" || balances.EUR > 0 || balances.USD < DEMO_SCRIPT.convertUsd}
                  >
                    {balances.EUR > 0
                      ? "Converted ✓"
                      : `Convert ${money(DEMO_SCRIPT.convertUsd, "USD")} → EUR`}
                  </Button>
                </div>
              )}

              {step === "send" && (
                <div className="space-y-4">
                  <p>
                    Pay a supplier {money(DEMO_SCRIPT.sendEur, "EUR")} over SEPA — free, and it
                    lands the same day across 36 countries.
                  </p>
                  <Button
                    type="button"
                    onClick={sendSepa}
                    disabled={balances.EUR < DEMO_SCRIPT.sendEur}
                  >
                    {activity.some((a) => a.kind === "out")
                      ? "Transfer sent ✓"
                      : `Send ${money(DEMO_SCRIPT.sendEur, "EUR")} SEPA`}
                  </Button>
                </div>
              )}

              {step === "done" && (
                <div className="space-y-4">
                  <p>
                    You just received from abroad, converted at the interbank rate, and paid out
                    over SEPA — all from one European account. That is the entire cross-border loop
                    Marsa replaces three banking apps for.
                  </p>
                  <ul className="space-y-1.5 text-sm text-ink-muted">
                    <li>✓ European multi-currency IBAN in your name</li>
                    <li>✓ Real interbank FX — the rate you saw was live</li>
                    <li>✓ Free SEPA out, same day</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 border-t border-line pt-5">
            <div className="flex flex-wrap items-center gap-3">
              {previous && (
                <Button type="button" variant="outline" onClick={() => go(previous)}>
                  ← Back
                </Button>
              )}

              {advance && (
                <Button
                  type="button"
                  onClick={() => go(advance.next)}
                  disabled={Boolean(advance.blockedBy)}
                  aria-describedby={advance.blockedBy ? blockedHintId : undefined}
                >
                  {step === "welcome" ? "Start the demo" : "Continue"}
                </Button>
              )}

              {step === "done" && (
                <>
                  <Button href="/get-started">Open a real account</Button>
                  <Button href="/pricing" variant="outline">
                    See pricing
                  </Button>
                </>
              )}

              {step !== "welcome" && (
                <button
                  type="button"
                  onClick={reset}
                  className="ml-auto rounded-sm text-sm font-medium text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  Restart
                </button>
              )}
            </div>

            {/*
              A disabled button with no explanation is a dead end: the reader
              can see there is a next step and not why they cannot take it.
              Every gate in this flow is one action away from opening, so the
              hint names that action.
            */}
            {advance?.blockedBy && (
              <p id={blockedHintId} className="mt-3 text-xs text-ink-subtle">
                {advance.blockedBy}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
