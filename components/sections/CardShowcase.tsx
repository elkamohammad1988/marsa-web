import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Badge } from "@/components/ui/Badge";
import { CheckBullet } from "@/components/ui/CheckBullet";
import { Button } from "@/components/ui/Button";

type CardShowcaseProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  bullets: string[];
  imageSrc: string;
  imageAlt: string;
  cta?: { label: string; href: string };
  reverse?: boolean;
};

export function CardShowcase({
  eyebrow,
  title,
  description,
  bullets,
  imageSrc,
  imageAlt,
  cta,
  reverse,
}: CardShowcaseProps) {
  return (
    <Section tone="white" size="lg">
      <Container>
        <div
          className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
            reverse ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card-lg bg-surface-blue-tint">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              sizes="(min-width:1024px) 48vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            {eyebrow && <Badge tone="blue">{eyebrow}</Badge>}
            <Heading level="h2" className="mt-4">
              {title}
            </Heading>
            {description && (
              <p className="mt-4 text-base text-ink-muted">{description}</p>
            )}
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bullets.map((b) => (
                <CheckBullet key={b} tone="blue">
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
          </div>
        </div>
      </Container>
    </Section>
  );
}
