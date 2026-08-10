import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";

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
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow && (
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
              {eyebrow}
            </span>
          )}
          <Heading level="h2" className="mt-3">
            {title}
          </Heading>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-card-lg border border-line shadow-e2">
          {/*
            The Marsa column, lit as one continuous band from the header to the
            last row rather than as a tint repeated per cell. Two flat columns
            of equal weight made the reader do the comparison the section exists
            to make for them — and a per-cell background would have been broken
            by the zebra striping into six disconnected rectangles.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/3 z-10 w-1/3 bg-gradient-to-b from-brand/[0.16] to-brand/[0.05] ring-1 ring-inset ring-brand-strong/25"
          />

          <div className="relative grid grid-cols-3 bg-surface-deep text-xs font-semibold text-white sm:text-sm">
            <div className="px-3 py-3 sm:px-5 sm:py-4">Feature</div>
            <div className="relative z-20 px-3 py-3 text-center sm:px-5 sm:py-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-strong shadow-glow-sm" />
                Marsa
              </span>
            </div>
            <div className="px-3 py-3 text-center text-white/70 sm:px-5 sm:py-4">Traditional</div>
          </div>

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
        </div>
      </Container>
    </Section>
  );
}
