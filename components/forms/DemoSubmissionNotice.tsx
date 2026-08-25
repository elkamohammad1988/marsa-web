import { Button } from "@/components/ui/Button";

type Step = { label: string; detail: string };

type DemoSubmissionNoticeProps = {
  /** What the reader just did, in their words. */
  title: string;
  /** The API route a real submission would post to. */
  endpoint: string;
  /** What the real pipeline would do, in order. */
  steps: Step[];
  /** Where to send them next. */
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
};

/**
 * What a visitor sees instead of a success screen.
 *
 * The old screen said "Application received — our onboarding team will email
 * you within one business day with your next steps and identity-verification
 * link." Nobody was going to email anybody. This says what actually happened
 * and what the real pipeline would have done, and it is designed rather than
 * apologised for: a fintech reader who sees a build that refuses to collect
 * personal data it cannot look after is being shown judgement, not a
 * limitation.
 */
export function DemoSubmissionNotice({
  title,
  endpoint,
  steps,
  primary,
  secondary,
}: DemoSubmissionNoticeProps) {
  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-card-lg border border-line bg-card p-6 shadow-e2 md:p-8"
    >
      <div className="relative">
        <span className="inline-flex items-center rounded-full border border-line bg-canvas/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-strong">
          Concept build
        </span>

        <h2 className="mt-5 text-2xl font-bold text-ink">{title}</h2>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
          Your details were checked in the browser and then{" "}
          <span className="font-medium text-ink">discarded</span>. Nothing was sent, nothing was
          stored, and nobody will contact you. This is a portfolio piece, not a financial service.
        </p>

        <div className="mt-6 rounded-card border border-line bg-canvas/50 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-subtle">
            In the real product, this would
          </p>
          <ol className="mt-4 space-y-3">
            {steps.map((step, i) => (
              <li key={step.label} className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-brand/[0.12] text-[10px] font-semibold tabular-nums text-brand-strong">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{step.label}</span>
                  <span className="block text-xs text-ink-subtle">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-3 text-xs text-ink-subtle">
            That pipeline is real code in this repository at{" "}
            <span className="font-mono text-[11px] text-ink-muted">{endpoint}</span>, with
            server-side re-validation, rate limiting, a durable write contract and unit tests. It
            is simply not wired to this form.
          </p>
        </div>

        {(primary || secondary) && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {primary && (
              <Button href={primary.href} size="md">
                {primary.label}
              </Button>
            )}
            {secondary && (
              <Button href={secondary.href} variant="outline" size="md">
                {secondary.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
