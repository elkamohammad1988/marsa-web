import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Stagger } from "@/components/ui/Stagger";

export type ProcessStep = {
  number: string;
  title: string;
  description: string;
};

type ProcessStepsProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  steps: ProcessStep[];
};

/**
 * The three steps, set as a sequence rather than as three boxes.
 *
 * What was here: three bordered panels in a row, each with a 48px gold badge
 * straddling its top edge, the badge lifting on hover. Two separate decorative
 * ideas — the panel and the floating chip — competing to mark the same thing,
 * which is that these are steps and they are in an order.
 *
 * A number already says that. So the numeral is now the largest element in the
 * row, set in the display face at the weight it deserves, and the panels are
 * gone: each step is a column under one rule, and the reader's eye runs 01 →
 * 02 → 03 across the top without any border telling it to. The hairline is the
 * only thing drawn, and it groups the three better than three separate borders
 * did, because one line reads as one sequence and three boxes read as three
 * things.
 *
 * The heading block also stops being centred. Every section on this page was
 * centre-aligned copy over a three-column grid, which is the rhythm that makes
 * a long marketing page feel machine-assembled; left-aligning the ones with a
 * left-aligned body gives the page somewhere to breathe and something to vary.
 */
export function ProcessSteps({ eyebrow, title, description, steps }: ProcessStepsProps) {
  return (
    <Section tone="deep" size="lg" className="relative isolate border-t border-line">
      <Container>
        <Stagger className="max-w-2xl" step={90}>
          {eyebrow && (
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
              {eyebrow}
            </span>
          )}
          <Heading level="h2" className="rise mt-3 text-white">
            {title}
          </Heading>
          {description && <p className="mt-4 text-white/70 md:text-lg">{description}</p>}
        </Stagger>

        <Stagger
          className="mt-14 grid grid-cols-1 gap-x-10 gap-y-10 border-t border-white/12 pt-10 md:mt-16 md:grid-cols-3"
          step={110}
        >
          {steps.map((s) => (
            <div key={s.number}>
              <span
                aria-hidden
                className="block font-display text-4xl font-bold tabular-nums tracking-tight text-brand-strong"
              >
                {s.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 max-w-prose text-sm text-white/65">{s.description}</p>
            </div>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
