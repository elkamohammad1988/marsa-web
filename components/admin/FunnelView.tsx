import { Button } from "@/components/ui/Button";
import { FUNNEL_LABELS, type FunnelReport } from "@/lib/analytics";

/**
 * Renders the demo funnel (stat cards + per-step bars). Shared by the admin
 * dashboard (/admin/funnel) so the
 * visualisation lives in exactly one place.
 */
export function FunnelView({ report, provider }: { report: FunnelReport; provider: string }) {
  return (
    <>
      <p className="mt-1 text-sm text-ink-muted">
        First-party, anonymous. Unique sessions per step · storage:{" "}
        <span className="font-medium text-ink">{provider}</span>
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Sessions started", value: String(report.starts) },
          { label: "Completed", value: String(report.completions) },
          { label: "Completion rate", value: `${report.completionRate}%` },
          {
            label: "Biggest drop-off",
            value: report.biggestDrop ? `${report.biggestDrop.pct}%` : "—",
            hint: report.biggestDrop
              ? `${FUNNEL_LABELS[report.biggestDrop.from]} → ${FUNNEL_LABELS[report.biggestDrop.to]}`
              : undefined,
          },
        ].map((card) => (
          <div key={card.label} className="rounded-card border border-line bg-card p-4">
            <dt className="text-xs uppercase tracking-wide text-ink-subtle">{card.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-ink">{card.value}</dd>
            {card.hint && <p className="mt-0.5 text-[11px] text-ink-subtle">{card.hint}</p>}
          </div>
        ))}
      </dl>

      {report.starts === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line-dark bg-card p-10 text-center">
          <p className="font-medium text-ink">No demo sessions yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Once visitors start the interactive demo, their step-by-step funnel and drop-off
            will appear here.
          </p>
          <Button href="/demo" size="sm" className="mt-4">
            Open the demo
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {report.rows.map((row) => (
            <div key={row.step} className="rounded-card border border-line bg-card p-4">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium text-ink">{row.label}</span>
                <span className="tabular-nums text-ink-muted">
                  {row.sessions} · {row.pctOfStart}% of start
                  {row.dropPct > 0 && <span className="ml-2 text-brand-strong">−{row.dropPct}%</span>}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-tint">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.max(row.pctOfStart, row.sessions > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
