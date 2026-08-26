import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { BrandArt, type ArtName } from "@/components/art/BrandArt";
import { BreadcrumbEyebrow } from "./BreadcrumbEyebrow";
import { cn } from "@/lib/utils";

export type HeroChip = { label: string; value?: string };
export type HeroStat = { value: string; label: string };

type HeroTone = "canvas" | "alt" | "deep" | "spotlight";

type HeroProps = {
  breadcrumb?: { label: string; href?: string }[];
  eyebrow?: string;
  title: string;
  /** Optional trailing clause, joined to the title as one sentence. */
  titleAccent?: string;
  description?: string;
  chips?: HeroChip[];
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Small reassurance line under the buttons (pricing, commitment, timing). */
  footnote?: string;
  /**
   * Which illustration fills the visual slot. Each one carries its own
   * description (see `components/art/BrandArt.tsx`) — there is deliberately no
   * per-page alt string, because that pairing is exactly what drifted: pages
   * described photographs they were not showing.
   */
  art?: ArtName;
  /** Custom visual, used instead of `art` when provided. */
  visual?: ReactNode;
  /** Optional headline figures rendered below the fold line. */
  stats?: HeroStat[];
  tone?: HeroTone;
  className?: string;
};

export function Hero({
  breadcrumb,
  eyebrow,
  title,
  titleAccent,
  description,
  chips,
  primaryCta,
  secondaryCta,
  footnote,
  art,
  visual,
  stats,
  tone = "alt",
  className,
}: HeroProps) {
  // `spotlight` and `deep` now paint exactly the same surface and nothing
  // else. The distinction survives only because pages name it, and it is worth
  // keeping as a seam: `spotlight` marks "this hero is the page's stage", which
  // is where a future difference would belong. Today there is none, and the
  // flat deep surface is the design rather than a base for layers.
  const isDark = tone === "deep" || tone === "spotlight";
  const toneClasses = isDark
    ? "bg-surface-deep text-white"
    : tone === "alt"
      ? "bg-surface-alt text-ink"
      : "bg-canvas text-ink";

  const hasVisual = Boolean(visual || art);

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden pb-14 pt-12 md:pb-20 md:pt-16",
        toneClasses,
        className,
      )}
    >
      {/* Nothing is layered on the hero surface any more.

          It carried five decorative layers once — a lightfield wash, three
          blurred discs drifting on their own keyframes, a grid and a film
          grain — and a later pass cut them to one three-stop mesh gradient.
          This removes that too. A radial gradient behind a headline is the
          cheapest way to make a section look considered and the fastest way to
          make it look generated, and the deep surface was already doing the
          work: `--surface-deep` sits a full rung below `--canvas`, so the band
          reads without help. What is left is a flat, near-black stage for the
          product panel, which is the thing worth looking at. */}

      <Container className="relative">
        {breadcrumb && (
          <BreadcrumbEyebrow
            items={breadcrumb}
            tone={isDark ? "white" : "ink"}
            className="mb-6"
          />
        )}

        <div
          className={cn(
            "grid grid-cols-1 items-center gap-10",
            hasVisual && "lg:grid-cols-[1.05fr_1fr] lg:gap-14",
          )}
        >
          <div className="animate-fade-up">
            {/* A label, not a badge. This was a bordered, blurred, shadowed
                pill — a control's worth of chrome around four words that are
                not clickable. Set as small caps on the accent it reads as what
                it is: the line above the headline. */}
            {eyebrow && (
              <span className="mb-5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-strong">
                {eyebrow}
              </span>
            )}

            {/*
              One colour. The headline used to be `text-gradient-hero` — white
              at the cap line descending into gold at the baseline, clipped to
              the glyphs.

              It was the best-argued effect on the site and it is still the
              first thing that reads as generated, because a gradient headline
              is *the* signature of the genre regardless of how carefully the
              stops were chosen. It also spent the palette's one loud colour on
              the element that needed it least: the headline is already the
              largest thing on the page. Gold now means "act here" or "read this
              number", and the sentence at the top of the page is neither.
            */}
            <Heading level="display" className={isDark ? "text-white" : undefined}>
              {titleAccent ? `${title} ${titleAccent}` : title}
            </Heading>

            {description && (
              <p
                className={cn(
                  "mt-5 max-w-xl text-base md:text-lg",
                  isDark ? "text-white/70" : "text-ink-muted",
                )}
              >
                {description}
              </p>
            )}

            {/* Static text, so the chips no longer lift and glow on hover as
                though they were controls. Nothing here is clickable. */}
            {chips && chips.length > 0 && (
              <ul className="mt-7 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <li
                    key={c.label}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
                      isDark
                        ? "border-white/12 text-white/80"
                        : "border-line text-ink-muted",
                    )}
                  >
                    {c.label}
                    {c.value && (
                      <span className={isDark ? "text-white/60" : "text-ink-muted"}>{c.value}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {(primaryCta || secondaryCta) && (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {primaryCta && (
                  <Button href={primaryCta.href} size="lg">
                    {primaryCta.label}
                  </Button>
                )}
                {secondaryCta && (
                  <Button
                    href={secondaryCta.href}
                    variant={isDark ? "outline-light" : "outline"}
                    size="lg"
                  >
                    {secondaryCta.label}
                  </Button>
                )}
              </div>
            )}

            {footnote && (
              <p className={cn("mt-4 text-xs", isDark ? "text-white/50" : "text-ink-subtle")}>
                {footnote}
              </p>
            )}
          </div>

          {visual ? (
            <div className="relative animate-scale-in [animation-delay:120ms]">{visual}</div>
          ) : (
            art && (
              <div className="relative animate-scale-in [animation-delay:120ms]">
                <div
                  className={cn(
                    "relative aspect-[4/3] w-full overflow-hidden rounded-card-lg",
                    isDark
                      ? "border border-white/10 bg-white/[0.03]"
                      : "border border-line bg-surface-tint",
                  )}
                >
                  <BrandArt name={art} />
                </div>

                {/*
                  The "Live ECB rates" badge is gone, and not only because it
                  was a shadowed pill floating half outside the frame it
                  belonged to — the shape the brief names as a floating badge.

                  It was also attached to the wrong thing. It rendered on every
                  hero that takes an `art` prop, so a *drawing* of a phone was
                  captioned as live data on ten pages. The rates really are
                  live, in the two places that read them: the converter and the
                  ticker, both of which stamp their own source and time. A claim
                  belongs on the thing making it.
                */}
              </div>
            )
          )}
        </div>

        {/*
          The figures sit on a rule, not in a box.

          They were a bordered, shadowed, four-cell grid built from `gap-px`
          over a background — the trick that fakes hairlines between cells. It
          worked, and it made the most quotable content on the page look like a
          widget bolted under the hero. The numbers are the point; the frame
          around them was not carrying anything the alignment does not.

          One rule above, generous space, left-aligned under the copy it
          belongs to. Gold stays on the figures — this is the strip where
          "gold means read this number" is actually cashed in — and the label
          drops to the muted step so the pair reads figure-first.
        */}
        {stats && stats.length > 0 && (
          <div>
            <dl
              className={cn(
                "mt-14 grid grid-cols-2 gap-x-8 gap-y-9 border-t pt-9 md:mt-20 md:grid-cols-4 md:gap-x-10",
                isDark ? "border-white/12" : "border-line",
              )}
            >
              {/*
                One label element per statistic, and it is the visible one.

                This carried the label twice: an `sr-only` `<dt>` for the
                definition-list pairing, and an `aria-hidden` `<span>` drawn
                under the figure. The first version of that shipped without the
                `aria-hidden` and a screen reader announced every statistic as
                "Currencies in one account, 30+, Currencies in one account" —
                so the fix at the time was to hide the visible copy from the
                accessibility tree, which stopped the double announcement and
                left two elements saying the same words.

                A statistic has one name. `flex-col-reverse` lets the `<dt>` be
                that name and still be drawn *below* its `<dd>`: the DOM keeps
                the term-then-definition order the element requires, and the
                reversed axis paints the figure first. Nothing is hidden from
                anyone, and there is no second copy to drift.

                `CountUp` keeps its own `sr-only` span — that one is the *value*,
                not a duplicate label. Its visible sibling animates through
                intermediate frames and is `aria-hidden` so those are never
                announced; assistive technology gets the authored figure once.
              */}
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col-reverse">
                  <dt
                    className={cn(
                      "mt-2 text-sm",
                      isDark ? "text-white/55" : "text-ink-subtle",
                    )}
                  >
                    {s.label}
                  </dt>
                  <dd>
                    <CountUp
                      value={s.value}
                      className="figure block font-display text-3xl font-bold tabular-nums tracking-tight text-brand-strong md:text-4xl"
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

      </Container>
    </section>
  );
}
