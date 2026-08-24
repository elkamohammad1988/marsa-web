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
      {/* The dark hero's own surface, with nothing layered on top of it.
          It used to carry five more layers: a lightfield wash, three blurred
          discs each drifting on its own keyframes, a grid and a film grain.
          None of them said anything. They were there to make the section look
          expensive, which is the only thing they actually communicated. */}
      {tone === "spotlight" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-mesh-deep opacity-55 sm:opacity-100"
        />
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
                  "mb-5 inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isDark
                    ? "border border-white/15 bg-white/[0.04] text-brand-strong backdrop-blur"
                    : "border border-line bg-card text-brand-strong shadow-card",
                )}
              >
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
                  <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-brand" />
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
                    {/* The `dt` above already carries this label, and it is
                        `sr-only` purely so the definition-list pairing reads in
                        the right order. Rendering the same words again visibly
                        made a screen reader announce every statistic as
                        "Currencies in one account, 30+, Currencies in one
                        account". The label is drawn here and named there, so
                        this copy is decoration over a name the reader has. */}
                    <span
                      aria-hidden
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

      </Container>
    </section>
  );
}
