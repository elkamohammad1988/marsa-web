import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { BrandArt, type ArtName } from "@/components/art/BrandArt";

type CTACardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Each illustration carries its own description — see `BrandArt`. */
  art: ArtName;
  footnote?: string;
};

export function CTACard({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  art,
  footnote,
}: CTACardProps) {
  return (
    <Section tone="white" size="sm">
      <Container>
        <div className="relative isolate overflow-hidden rounded-card-lg bg-surface-navy text-white shadow-elevated">
          {/* Ambient green glow + grid */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-radial-glow" />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-brand-soft/20 blur-[110px]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-60" />

          <div className="relative grid grid-cols-1 items-center gap-6 px-6 py-9 md:grid-cols-[1.2fr_1fr] md:gap-10 md:px-10 md:py-11 lg:px-14">
            <div>
              {eyebrow && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-soft shadow-glow-sm" />
                  {eyebrow}
                </span>
              )}
              <Heading level="h2" className="mt-4 text-white">
                {title}
              </Heading>
              {description && (
                <p className="mt-4 max-w-xl text-base text-white/70">{description}</p>
              )}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button href={primaryCta.href} variant="primary" size="lg">
                  {primaryCta.label}
                </Button>
                {secondaryCta && (
                  <Button href={secondaryCta.href} variant="outline-light" size="lg">
                    {secondaryCta.label}
                  </Button>
                )}
              </div>
            </div>

            <div className="relative mx-auto aspect-[5/4] w-full max-w-sm">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-6 rounded-full bg-radial-glow blur-2xl"
              />
              {/* `bare`: this slot already sits inside the CTA's own dark panel,
                  so the art must not paint a second backdrop over it. */}
              <BrandArt name={art} surface="bare" className="relative" />
            </div>
          </div>

          {footnote && (
            <div className="relative border-t border-white/10 px-6 py-3 text-center text-xs text-white/55 md:px-10">
              {footnote}
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
