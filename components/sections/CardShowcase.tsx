import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Badge } from "@/components/ui/Badge";
import { CheckBullet } from "@/components/ui/CheckBullet";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { BrandArt, type ArtName } from "@/components/art/BrandArt";

type CardShowcaseProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  bullets: string[];
  /** Each illustration carries its own description — see `BrandArt`. */
  art: ArtName;
  cta?: { label: string; href: string };
  reverse?: boolean;
};

export function CardShowcase({
  eyebrow,
  title,
  description,
  bullets,
  art,
  cta,
  reverse,
}: CardShowcaseProps) {
  return (
    <Section tone="canvas" size="lg" className="overflow-hidden">
      <Container>
        <div
          className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
            reverse ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          {/* The art and the copy converge on each other from the sides they
              sit on, so the pair reads as one composition assembling rather
              than as two blocks that happen to fade at the same time. Flipped
              with `reverse`, because the direction is only worth anything if it
              matches where the element actually is. */}
          <Reveal
            variant={reverse ? "right" : "left"}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-card-lg bg-surface-tint"
          >
            <BrandArt name={art} />
          </Reveal>
          <Reveal variant={reverse ? "left" : "right"} delay={110}>
            {eyebrow && <Badge tone="brand">{eyebrow}</Badge>}
            <Heading level="h2" className="mt-4">
              {title}
            </Heading>
            {description && (
              <p className="mt-4 text-base text-ink-muted">{description}</p>
            )}
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bullets.map((b) => (
                <CheckBullet key={b} tone="brand">
                  {b}
                </CheckBullet>
              ))}
            </ul>
            {cta && (
              <div className="mt-8">
                <Button href={cta.href} size="lg">
                  {cta.label}
                </Button>
              </div>
            )}
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
