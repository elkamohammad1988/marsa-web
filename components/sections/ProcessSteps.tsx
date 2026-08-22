import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { PointerGlow } from "@/components/ui/PointerGlow";
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

export function ProcessSteps({ eyebrow, title, description, steps }: ProcessStepsProps) {
  return (
    <Section tone="deep" size="lg" className="seam-top relative isolate overflow-hidden">
      <Container>
        <Stagger className="mx-auto max-w-3xl text-center" step={90}>
          {eyebrow && (
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
              {eyebrow}
            </span>
          )}
          <Heading level="h2" className="rise mt-3 text-white">
            {title}
          </Heading>
          {description && (
            <p className="mt-4 text-white/70 md:text-lg">{description}</p>
          )}
        </Stagger>

        <PointerGlow>
          <Stagger
            className="mt-16 grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-3"
            step={110}
          >
            {steps.map((s) => (
              <div
                key={s.number}
                data-glow
                className="spotlight group relative rounded-card-lg border border-white/10 bg-white/[0.04] px-6 pb-6 pt-10 backdrop-blur transition-colors duration-300 hover:border-brand-soft/50"
              >
                {/* The numeral straddles the top edge, so the sequence reads
                    along one line above the panels rather than being buried
                    inside three separate boxes. */}
                <span className="absolute -top-6 left-6 z-10 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cta-gradient text-lg font-bold text-on-brand shadow-cta ring-1 ring-inset ring-white/20 transition-transform duration-300 group-hover:-translate-y-0.5">
                  {s.number}
                </span>

                <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-white/65">{s.description}</p>
              </div>
            ))}
          </Stagger>
        </PointerGlow>
      </Container>
    </Section>
  );
}
