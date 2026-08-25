import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Reveal } from "@/components/ui/Reveal";
import { Stagger } from "@/components/ui/Stagger";

export type ComparisonRow = {
  label: string;
  marsa: string;
  traditional: string;
};

type ComparisonTableProps = {
  eyebrow?: string;
  title: string;
  rows: ComparisonRow[];
};

export function ComparisonTable({ eyebrow, title, rows }: ComparisonTableProps) {
  return (
    <Section tone="canvas" size="lg">
      <Container>
        <Stagger className="mx-auto max-w-3xl text-center" step={90}>
          {eyebrow && (
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
              {eyebrow}
            </span>
          )}
          <Heading level="h2" className="rise mt-3">
            {title}
          </Heading>
        </Stagger>

        <Reveal className="relative mt-10 overflow-hidden rounded-card-lg border border-line shadow-e2">
          {/*
            The Marsa column, lit as one continuous band from the header to the
            last row rather than as a tint repeated per cell. Two flat columns
            of equal weight made the reader do the comparison the section exists
            to make for them — and a per-cell background would have been broken
            by the zebra striping into six disconnected rectangles.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/3 z-10 w-1/3 bg-brand/[0.07] ring-1 ring-inset ring-brand-strong/25"
          />

          <div className="relative grid grid-cols-3 bg-surface-deep text-xs font-semibold text-white sm:text-sm">
            <div className="px-3 py-3 sm:px-5 sm:py-4">Feature</div>
            <div className="relative z-20 px-3 py-3 text-center sm:px-5 sm:py-4">
              Marsa
            </div>
            <div className="px-3 py-3 text-center text-white/70 sm:px-5 sm:py-4">Traditional</div>
          </div>

          {/*
            The rows arrive one after another rather than as a block, so the
            table reads down the way it is meant to be read. A shorter step
            than the card rows elsewhere on the page: six rows at 70ms would
            still be landing most of a second after the reader reached them,
            which stops being a rhythm and becomes a wait.
          */}
          <Stagger step={45}>
            {rows.map((r, i) => (
              <div
                key={r.label}
                className={`group relative grid grid-cols-3 text-xs transition-colors duration-200 sm:text-sm ${
                  i % 2 === 0 ? "bg-card" : "bg-surface-tint-2"
                } hover:bg-surface-tint`}
              >
                <div className="px-3 py-3 font-medium text-ink sm:px-5 sm:py-4">{r.label}</div>
                <div className="relative z-20 px-3 py-3 text-center font-semibold text-ink sm:px-5 sm:py-4">
                  {r.marsa}
                </div>
                <div className="px-3 py-3 text-center text-ink-muted sm:px-5 sm:py-4">
                  {r.traditional}
                </div>
              </div>
            ))}
          </Stagger>
        </Reveal>
      </Container>
    </Section>
  );
}
