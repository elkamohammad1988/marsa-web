import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Stagger } from "@/components/ui/Stagger";

export type FeatureBullet = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

type FeatureBulletsProps = {
  items: FeatureBullet[];
  tone?: "canvas" | "alt" | "tint";
};

/**
 * The capability list, as rows on rules rather than as a grid of cards.
 *
 * This was three bordered, shadowed, rounded cards side by side, each opening
 * with a filled icon tile. That layout appears on ten pages here, and some
 * version of it appears on essentially every generated marketing page in
 * existence — which is the problem. It is not ugly; it is anonymous, and it
 * was the single most template-like block in the product.
 *
 * What replaced it is the shape the content already had. Each item is a term
 * and its definition, so it is set as a row: a rule above it, the name in the
 * left column, the explanation in the right, and nothing drawn around either.
 * That reads as a specification — the register of documentation written by
 * someone who knows the system — which is exactly the claim this site is
 * making about who built it.
 *
 * Three things went and are worth naming, because each was doing work that the
 * layout now does for free:
 *
 *   - **The card.** A border plus a shadow plus a radius, three times per row,
 *     to group text that a single hairline groups better.
 *   - **The icon tile.** A 48px rounded square with a tinted fill behind a
 *     6px glyph — decoration at the scale of a control. The glyph survives at
 *     its real size, in one colour, in its own narrow column, where it marks
 *     the row instead of announcing it.
 *   - **The equal-width grid.** Three columns forced every description to the
 *     length of the longest, so the copy was written to the box. Rows let a
 *     short answer be short.
 *
 * `Stagger` stays: the reveal is per-row and it is the one piece of motion
 * here, and `tests/animation-visibility.test.ts` holds it to painting without
 * JavaScript.
 */
export function FeatureBullets({ items, tone = "canvas" }: FeatureBulletsProps) {
  return (
    <Section tone={tone} size="md">
      <Container>
        {/* Section landmark heading — visually hidden, keeps the h1→h2→h3
            document outline correct (the rows below are h3). */}
        <h2 className="sr-only">What you get with Marsa</h2>

        <Stagger className="border-t border-line" step={90}>
          {items.map((it) => (
            <div
              key={it.title}
              className="grid grid-cols-1 gap-x-10 gap-y-3 border-b border-line py-8 md:grid-cols-12 md:py-10"
            >
              <div
                aria-hidden
                className="text-brand-strong md:col-span-1 [&_svg]:h-6 [&_svg]:w-6"
              >
                {it.icon}
              </div>
              <h3 className="text-lg font-semibold text-ink md:col-span-4 md:text-xl">
                {it.title}
              </h3>
              <p className="max-w-prose text-ink-muted md:col-span-7">{it.description}</p>
            </div>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
