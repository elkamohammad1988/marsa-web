import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";

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
    <Section tone="navy" size="lg" className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-radial-glow" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50" />
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow && (
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
              {eyebrow}
            </span>
          )}
          <Heading level="h2" className="mt-3 text-white">
            {title}
          </Heading>
          {description && (
            <p className="mt-4 text-white/70 md:text-lg">{description}</p>
          )}
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.number}
              className="group relative rounded-card-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-colors hover:border-brand-soft/40"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue text-lg font-bold text-on-brand shadow-glow-sm">
                {s.number}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-white/65">{s.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
