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

      {/*
        One panel with hairline-divided cells, not four free-floating boxes.
        Four separately-bordered cards put four competing rectangles on screen
        and made the figures read as unrelated; a single surface with internal
        rules is the shape every bank dashboard uses, because it says "these
        four numbers describe one thing".
      */}
      <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-card bg-card shadow-e1 ring-1 ring-line md:grid-cols-4">
        {[
          { label: "Sessions started", value: String(report.starts), lead: true },
          { label: "Completed", value: String(report.completions), lead: true },
          { label: "Completion rate", value: `${report.completionRate}%`, lead: true },
          {
            label: "Biggest drop-off",
            value: report.biggestDrop ? `${report.biggestDrop.pct}%` : "",
            hint: report.biggestDrop
              ? `${FUNNEL_LABELS[report.biggestDrop.from]} → ${FUNNEL_LABELS[report.biggestDrop.to]}`
              : undefined,
            lead: false,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="border-line p-5 [&:not(:nth-child(-n+2))]:border-t md:[&:not(:first-child)]:border-l md:[&:not(:nth-child(-n+2))]:border-t-0 [&:nth-child(odd)]:border-r md:[&:nth-child(odd)]:border-r-0"
          >
            <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
              {card.label}
            </dt>
            <dd
              className={
                "mt-1.5 font-display text-[28px] font-bold leading-none tabular-nums " +
                (card.lead ? "text-ink" : "text-ink-muted")
              }
            >
              {card.value}
            </dd>
            {card.hint && <p className="mt-1.5 text-[11px] text-ink-subtle">{card.hint}</p>}
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
        /*
          A funnel is one object, so it is drawn as one panel with hairline
          rules — not six bordered cards stacked with gaps, which is what made
          this read as a list of unrelated progress bars rather than a decay.

          Three things carry the "funnel" reading that the flat `bg-brand`
          rectangles did not:

          1. The fill is a left-to-right gradient that *dims* along its own
             length, so a long bar and a short bar are visibly different
             objects rather than the same swatch at two widths.
          2. The remainder of the track is drawn, faintly, as the portion
             lost. A funnel step is a ratio, and only showing the numerator
             hides the thing the chart exists to show.
          3. Drop-off is no longer `text-brand-strong`. The brand accent is
             this site's affirmative colour — it is the CTA, the mark and the
             progress rail — so painting an attrition figure in it told the
             reader that losing 13% of sessions was on-brand good news. It is
             now muted, and only the single worst step is called out, in
             `warning`.
        */
        <div className="mt-6 overflow-hidden rounded-card bg-card shadow-e1 ring-1 ring-line">
          {report.rows.map((row, i) => {
            const isWorstDrop =
              report.biggestDrop != null && report.biggestDrop.to === row.step && row.dropPct > 0;
            /*
              Clamped at both ends, not just the bottom.

              `pctOfStart` can legitimately exceed 100: a session whose `start`
              beacon was lost while its later beacons arrived counts at step two
              and not at step one. The arithmetic is right and the input is
              genuinely skewed, but an unclamped bar overflows its own track and
              the dashboard reads as broken. The *label* still prints the real
              figure — the reader should see `116.7%` and know the data is odd;
              what they should not see is a bar running past the end of the row.
            */
            const width = Math.min(100, Math.max(row.pctOfStart, row.sessions > 0 ? 2 : 0));
            return (
              <div
                key={row.step}
                className={"px-5 py-4" + (i > 0 ? " border-t border-line" : "")}
              >
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="font-medium text-ink">{row.label}</span>
                  <span className="tabular-nums text-ink-muted">
                    <span className="font-semibold text-ink">{row.sessions}</span>
                    <span className="mx-1.5 text-ink-subtle">·</span>
                    {row.pctOfStart}%
                    {row.dropPct > 0 && (
                      <span
                        className={
                          "ml-2.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums " +
                          (isWorstDrop
                            ? "bg-warning/10 text-warning"
                            : "bg-ink/[0.06] text-ink-subtle")
                        }
                      >
                        −{row.dropPct}%
                      </span>
                    )}
                  </span>
                </div>
                <div
                  className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-tint ring-1 ring-inset ring-line/60"
                  aria-hidden
                >
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
