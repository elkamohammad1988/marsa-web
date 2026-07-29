import { Container } from "@/components/ui/Container";
import { BreadcrumbEyebrow } from "./BreadcrumbEyebrow";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalDocProps = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  crumb: string;
};

export function LegalDoc({ title, updated, intro, sections, crumb }: LegalDocProps) {
  return (
    <>
      <section className="bg-surface-alt pb-8 pt-10 md:pt-14">
        <Container>
          <BreadcrumbEyebrow
            items={[{ label: "Home", href: "/" }, { label: "Legal" }, { label: crumb }]}
            className="mb-6"
          />
          <h1 className="text-display-sm font-bold text-ink">{title}</h1>
          <p className="mt-3 text-sm text-ink-subtle">Last updated: {updated}</p>
          <p className="mt-5 max-w-3xl text-base text-ink-muted">{intro}</p>
        </Container>
      </section>

      <section className="bg-canvas py-12 md:py-16">
        <Container>
          <article className="mx-auto max-w-3xl">
            {sections.map((s, i) => (
              <section key={i} className="mt-10 first:mt-0" aria-labelledby={`sec-${i}`}>
                <h2 id={`sec-${i}`} className="text-xl font-semibold text-ink md:text-2xl">
                  {i + 1}. {s.heading}
                </h2>
                {s.paragraphs?.map((p, j) => (
                  <p key={j} className="mt-4 text-base leading-relaxed text-ink-muted">
                    {p}
                  </p>
                ))}
                {s.bullets && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-muted">
                    {s.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </article>
        </Container>
      </section>
    </>
  );
}
