import { MarsaMark } from "@/components/icons/Logo";
import { cn } from "@/lib/utils";

/**
 * The hero's product visual: a stylised view of a Marsa account.
 *
 * It is an illustration, not live data — so it is marked `aria-hidden` with a
 * screen-reader caption alongside, and the figures are round, plausible
 * examples rather than anything implying real balances.
 */

const BALANCES = [
  { code: "EUR", symbol: "€", amount: "8,120.40", share: 64 },
  { code: "USD", symbol: "$", amount: "3,940.00", share: 27 },
  { code: "GBP", symbol: "£", amount: "420.15", share: 9 },
];

const ACTIVITY = [
  {
    kind: "in" as const,
    title: "Stripe payout",
    meta: "Received · today",
    amount: "+$4,820.00",
  },
  {
    kind: "fx" as const,
    title: "USD → EUR",
    meta: "Interbank rate · today",
    amount: "€4,441.60",
  },
  {
    kind: "out" as const,
    title: "SEPA to supplier",
    meta: "Sent · yesterday",
    amount: "−€1,150.00",
  },
];

const arrow = {
  in: "M12 5v14M12 19l6-6M12 19l-6-6",
  out: "M12 19V5M12 5l6 6M12 5l-6 6",
  fx: "M4 8h13l-3-3M20 16H7l3 3",
};

export function AccountPreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <span className="sr-only">
        Illustration of a Marsa account holding euro, dollar and pound balances, with a recent
        payout, currency conversion and outgoing SEPA transfer.
      </span>

      <div
        aria-hidden
        className="relative overflow-hidden rounded-card-lg border border-line/60 bg-card p-5 shadow-e3 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="logo-tile grid h-8 w-8 place-items-center rounded-card">
              <MarsaMark className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-ink">Business account</p>
              <p className="font-mono text-[11px] text-ink-subtle">NL•• •••• •••• 4417</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas/60 px-2.5 py-1 text-[11px] font-medium text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Active
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-subtle">
            Total balance
          </p>
          <p className="figure mt-1 font-display text-[40px] font-bold leading-none tabular-nums tracking-tight text-ink">
            €12,480<span className="text-ink-subtle">.55</span>
          </p>
        </div>

        {/* Allocation bar */}
        <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-ink/5">
          {BALANCES.map((b, i) => (
            <span
              key={b.code}
              style={{ width: `${b.share}%` }}
              className={
                i === 0
                  ? "bg-brand"
                  : i === 1
                    ? "bg-brand/55"
                    : "bg-accent/70"
              }
            />
          ))}
        </div>

        <ul className="mt-4 grid grid-cols-3 gap-2">
          {BALANCES.map((b) => (
            <li
              key={b.code}
              className="rounded-card border border-line/70 bg-canvas/50 px-3 py-2.5"
            >
              <p className="text-[11px] font-semibold tracking-wide text-ink-subtle">{b.code}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">
                {b.symbol}
                {b.amount}
              </p>
            </li>
          ))}
        </ul>

        <ul className="mt-5 divide-y divide-line/70 border-t border-line/70">
          {ACTIVITY.map((a) => (
            <li key={a.title} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                  a.kind === "in"
                    ? "bg-success/[0.12] text-success"
                    : a.kind === "out"
                      ? "bg-ink/[0.06] text-ink-muted"
                      : "bg-brand/[0.12] text-brand-strong",
                )}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path
                    d={arrow[a.kind]}
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
                  a.kind === "in" ? "text-success" : "text-ink",
                )}
              >
                {a.amount}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
