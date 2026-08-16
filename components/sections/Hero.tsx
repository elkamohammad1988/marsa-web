import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { PointerGlow } from "@/components/ui/PointerGlow";
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
  /** Optional trailing clause rendered in the brand gradient. */
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
  // `spotlight` and `deep` paint the same surface — the difference between
  // them is the mesh and glow layered on top further down, not the background.
  // They used to be two arms of the same ternary returning the identical
  // string, which read as a distinction that did not exist.
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
      {/* Ambient decoration, in depth order: mesh furthest back, then the three
          drifting lights, then the grid, then grain over everything. `halo` is
          the water — cool, low, and behind the warm pair, which is what stops
          the backdrop reading as one flat gold wash. */}
      {/*
        Every light below is sized in absolute units chosen against a 1440px
        canvas, where they read as the depth the comment above describes. On a
        390px phone the first orb alone is 480px across — wider than the
        screen — so all three plus `mesh-deep` and `lightfield` overlap across
        the entire viewport and resolve to exactly the one flat wash the halo
        exists to prevent. It was the strongest "cheap gradient" signal left in
        the product, on the viewport most visitors will actually use.

        Each light is therefore scaled and dimmed below `sm` only; from `sm`
        upward the geometry is byte-for-byte what it was, so the desktop
        composition these were tuned for is untouched.

        What did change with the palette is the *balance* between the three.
        The warm pair used to lead (`brand-soft/25` + `accent/15`) because
        magenta at those alphas was still a dark light. Gold is not: the second
        orb at `accent/15` is a 26rem disc of bright gold, and at that size it
        stops being a light and becomes the background colour. So the gold
        halved and the water doubled — which is the correct order for a hero
        that is supposed to depict the second one containing the first.

        No `.gold-veil` here on purpose. Three of these already drift on
        `aurora-a`/`aurora-b`/`drift`; a fourth moving layer would not add
        depth, it would add traffic.
      */}
      {tone === "spotlight" && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-mesh-deep opacity-55 sm:opacity-100"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 lightfield opacity-70 sm:opacity-100"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-32 h-[16rem] w-[16rem] animate-aurora-a rounded-full bg-brand/[0.09] blur-[110px] sm:h-[30rem] sm:w-[30rem]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 top-10 h-[14rem] w-[14rem] animate-aurora-b rounded-full bg-brand/[0.08] blur-[120px] sm:h-[26rem] sm:w-[26rem]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 left-1/3 h-[13rem] w-[18rem] animate-drift rounded-full bg-halo/30 blur-[130px] sm:h-[24rem] sm:w-[34rem]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-noise" />
        </>
      )}

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
            {eyebrow && (
              <span
                className={cn(
                  "sheen relative mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isDark
                    ? "border border-white/15 bg-white/[0.04] text-brand-strong backdrop-blur"
                    : "border border-line bg-card text-brand-strong shadow-card",
                )}
              >
                {/* A dot with a ring pulsing out of it, rather than a dot that
                    dims and brightens in place. */}
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-glow-pulse rounded-full bg-brand-strong opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-strong shadow-glow-sm" />
                </span>
                {eyebrow}
              </span>
            )}

            <Heading level="display" className="text-gradient-hero">
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

            {chips && chips.length > 0 && (
              <ul className="mt-7 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <li
                    key={c.label}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-px",
                      isDark
                        ? "border border-white/10 bg-white/[0.06] text-white backdrop-blur hover:border-brand-strong/40 hover:bg-white/[0.1]"
                        : "bg-card text-ink shadow-card ring-1 ring-line hover:ring-brand-strong/40",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient shadow-glow-sm" />
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
            <div className="relative animate-scale-in [animation-delay:120ms]">
              {/* Two lights revolving behind the panel, one warm and one cool,
                  half a turn apart. Slow enough (26s) that it registers as the
                  panel being lit rather than as something moving. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 grid place-items-center"
              >
                <div className="relative h-[108%] w-[108%] animate-orbit rounded-full">
                  <span className="absolute left-1/2 top-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/45 blur-3xl" />
                  <span className="absolute bottom-0 left-1/2 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full bg-halo/40 blur-3xl" />
                </div>
              </div>
              {visual}
            </div>
          ) : (
            art && (
              <div className="relative animate-scale-in [animation-delay:120ms]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-6 rounded-[40px] bg-radial-glow blur-2xl"
                />
                <div
                  className={cn(
                    "relative aspect-[4/3] w-full overflow-hidden rounded-[28px] shadow-elevated",
                    isDark
                      ? "border border-white/10 bg-white/[0.03]"
                      : "border border-line bg-surface-tint",
                  )}
                >
                  <BrandArt name={art} />
                </div>

                {/* Truthful live-data badge (the tools use real ECB rates). */}
                <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-full border border-line glass px-3.5 py-2 text-xs font-medium text-ink shadow-elevated md:left-6">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-glow-pulse rounded-full bg-brand-soft opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                  </span>
                  Live ECB rates
                </div>
              </div>
            )
          )}
        </div>

        {stats && stats.length > 0 && (
          <PointerGlow>
            <dl
              className={cn(
                "mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-card-lg border shadow-e2 md:mt-16 md:grid-cols-4",
                isDark ? "border-white/10 bg-white/10" : "border-line bg-line",
              )}
            >
              {stats.map((s) => (
                <div
                  key={s.label}
                  data-glow
                  className={cn(
                    "spotlight relative px-5 py-7 text-center transition-colors duration-300",
                    isDark ? "bg-surface-deep" : "bg-canvas",
                  )}
                >
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <CountUp
                      value={s.value}
                      className={cn(
                        // The KPI strip is where "gold means important" is
                        // cashed in: four numbers, once per page, on their own
                        // band. 12.3:1 on the dark tone and 11.6:1 on canvas —
                        // brighter than the white it replaces was on either.
                        "figure block font-display text-3xl font-bold tabular-nums tracking-tight text-brand-strong md:text-4xl",
                      )}
                    />
                    <span
                      className={cn(
                        "mt-1.5 block text-xs",
                        isDark ? "text-white/55" : "text-ink-subtle",
                      )}
                    >
                      {s.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </PointerGlow>
        )}

        {/* Only where the page continues into a long scroll, and only as a
            hint: the track is drawn unconditionally, and the dot inside it is
            the only part that moves. */}
        {tone === "spotlight" && (
          <div aria-hidden className="mt-10 flex justify-center md:mt-12">
            <span className="flex h-9 w-[22px] items-start justify-center rounded-full border border-white/20 pt-1.5">
              <span className="h-1.5 w-1.5 animate-scroll-hint rounded-full bg-brand-strong" />
            </span>
          </div>
        )}
      </Container>
    </section>
  );
}
