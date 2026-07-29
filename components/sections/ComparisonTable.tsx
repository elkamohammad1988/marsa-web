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

        <div className="mt-10 overflow-hidden rounded-card-lg border border-line">
          <div className="grid grid-cols-3 bg-surface-deep text-xs font-semibold text-white sm:text-sm">
            <div className="px-3 py-3 sm:px-5 sm:py-4">Feature</div>
            <div className="px-3 py-3 text-center sm:px-5 sm:py-4">Marsa</div>
            <div className="px-3 py-3 text-center sm:px-5 sm:py-4">Traditional</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={`grid grid-cols-3 text-xs sm:text-sm ${
                i % 2 === 0 ? "bg-card" : "bg-surface-tint-2"
              }`}
            >
              <div className="px-3 py-3 font-medium text-ink sm:px-5 sm:py-4">{r.label}</div>
              <div className="px-3 py-3 text-center text-ink sm:px-5 sm:py-4">{r.marsa}</div>
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
