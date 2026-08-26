import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

type CTACardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  footnote?: string;
};

/**
 * The closing ask. Type, space and one change of surface — nothing else.
 *
 * ## What the art was, and why it went
 *
 * This panel used to carry a `coin` illustration in a second column: the Marsa
 * mark struck as a disc, sitting inside a blurred gold orb at 40% opacity,
 * ringed by two concentric hairlines, lit by a white-to-black overlay and
 * seated on a `shadow-glow`. It rendered on **thirteen pages** — every closing
 * CTA on the site plus two pricing plans — and it was the single most
 * recognisable generated-landing-page object left in the product: a glowing
 * sphere with halo rings floating in a dark box.
 *
 * The test that decided it is the one that decides every effect here: what does
 * a reader learn from it? A logo drawn as a coin says nothing about a
 * multi-currency account that the sentence beside it has not already said, and
 * it is the *last* thing before the footer — the position where a page should
 * be asking for one action, not showing an ornament. So the column is gone
 * rather than redrawn, because a flatter ornament in the same slot would still
 * be an ornament.
 *
 * ## What replaced it
 *
 * The space it occupied. The ask now runs the full width of the panel: the
 * headline gets the measure it was competing for, and the buttons move to their
 * own column on wide screens so the primary action sits on the right-hand
 * terminal of the sentence rather than under it. Below `lg` the column stacks
 * and the buttons return under the copy, which is the reading order anyway.
 *
 * The eyebrow is a label, not a pill. It was a `rounded-full` chip with a
 * border and a translucent fill — a control's chrome around three words that
 * cannot be clicked, on the one panel where exactly two things *are* clickable
 * and need to be found. Set as small caps it reads as what it is.
 */
export function CTACard({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  footnote,
}: CTACardProps) {
  return (
    <Section tone="canvas" size="sm">
      <Container>
        {/* The only panel still drawn on a marketing page, and the only band on
            a canvas page that goes darker. That change of surface is what marks
            the close; it used to be marked by a gradient rim as well, and one
            of the two was redundant. */}
        <Reveal className="rounded-card-lg bg-surface-deep text-white shadow-e3">
          <div className="grid grid-cols-1 gap-8 px-6 py-10 md:px-10 md:py-12 lg:grid-cols-[1.5fr_auto] lg:items-end lg:gap-16 lg:px-14">
            <div>
              {eyebrow && (
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-strong">
                  {eyebrow}
                </span>
              )}
              {/* `.rise` keys off the `.is-visible` the wrapper already carries,
                  so the closing headline uncovers as the panel lands rather
                  than needing a second observer to do it. */}
              <Heading level="h2" className="rise mt-4 max-w-2xl text-white">
                {title}
              </Heading>
              {description && (
                <p className="mt-4 max-w-xl text-base text-white/70">{description}</p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
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

          {footnote && (
            <div className="border-t border-white/10 px-6 py-3 text-xs text-white/55 md:px-10 lg:px-14">
              {footnote}
            </div>
          )}
        </Reveal>
      </Container>
    </Section>
  );
}
