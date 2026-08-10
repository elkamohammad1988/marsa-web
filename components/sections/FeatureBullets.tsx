import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { Container } from "@/components/ui/Container";
import { PointerGlow } from "@/components/ui/PointerGlow";
import { Section } from "@/components/ui/Section";

export type FeatureBullet = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

type FeatureBulletsProps = {
  items: FeatureBullet[];
  tone?: "canvas" | "alt" | "tint";
};

export function FeatureBullets({ items, tone = "canvas" }: FeatureBulletsProps) {
  return (
    <Section tone={tone} size="md">
      <Container>
        {/* Section landmark heading — visually hidden, keeps the h1→h2→h3
            document outline correct (the cards below are h3). */}
        <h2 className="sr-only">What you get with Marsa</h2>
        {/*
          There used to be a 72px card index here — `1`, `2`, `3` set in the
          top-right corner at 4% ink, hung off the edge with `-right-2 -top-4`.

          It was meant to give the row a rhythm and the card a second focal
          point. What it actually produced was a grey smudge: 4% of near-white
          on `--card` is below the contrast at which an eye resolves a shape as
          a glyph, and `overflow-hidden` on the card cropped the half that hung
          outside — so what rendered was neither a numeral nor nothing, just an
          unexplained lighter patch in the corner of two of the three cards.

          A large ghosted numeral behind a card is also one of the most worn
          decorative tics in contemporary UI, and this row does not need it: the
          icon is already the second focal point, and three of them across the
          row are already the rhythm.
        */}
        <PointerGlow className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              data-glow
              className="spotlight card-hover gradient-ring group relative overflow-hidden rounded-card border border-line bg-card p-6 shadow-e1"
            >
              <FeatureIcon tone="brand">{it.icon}</FeatureIcon>
              <h3 className="mt-4 text-lg font-semibold text-ink">{it.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{it.description}</p>
            </div>
          ))}
        </PointerGlow>
      </Container>
    </Section>
  );
}
