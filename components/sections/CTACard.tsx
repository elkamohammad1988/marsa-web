import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
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
    <Section tone="canvas" size="sm">
      <Container>
        {/* The one surface on the page that carries the bright rim. It is the
            last thing before the footer and the only ask on the page, so it is
            where the emphasis earns its keep — a page where every panel is
            edge-lit has nothing left to emphasise. */}
        <Reveal className="gradient-ring-strong isolate overflow-hidden rounded-card-lg bg-surface-deep text-white shadow-e3">
          <div className="relative grid grid-cols-1 items-center gap-6 px-6 py-9 md:grid-cols-[1.2fr_1fr] md:gap-10 md:px-10 md:py-11 lg:px-14">
            <div>
              {eyebrow && (
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                  {eyebrow}
                </span>
              )}
              {/* The panel's own reveal drives this: `.rise` keys off the
                  `.is-visible` the wrapper already carries, so the closing ask
                  uncovers its headline as the panel lands rather than needing a
                  second observer to do it. */}
              <Heading level="h2" className="rise mt-4 text-white">
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
        </Reveal>
      </Container>
    </Section>
  );
}
