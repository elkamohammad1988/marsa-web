import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { BreadcrumbEyebrow } from "./BreadcrumbEyebrow";
import { cn } from "@/lib/utils";

export type HeroChip = { label: string; value?: string };
export type HeroStat = { value: string; label: string };

type HeroTone = "white" | "cream" | "navy" | "spotlight";

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
  imageSrc?: string;
  imageAlt?: string;
  /** Custom visual, used instead of `imageSrc` when provided. */
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
  imageSrc,
  imageAlt,
  visual,
  stats,
  tone = "cream",
  className,
}: HeroProps) {
  const isDark = tone === "navy" || tone === "spotlight";
  const toneClasses =
    tone === "spotlight"
      ? "bg-surface-navy text-white"
      : tone === "navy"
        ? "bg-surface-navy text-white"
        : tone === "cream"
          ? "bg-surface-cream text-ink"
          : "bg-canvas text-ink";

  const hasVisual = Boolean(visual || imageSrc);

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden pb-14 pt-12 md:pb-20 md:pt-16",
        toneClasses,
        className,
      )}
    >
      {/* Ambient decoration. Two slow-drifting light sources plus grain: enough
          depth to feel designed, cheap enough to stay on the main thread. */}
      {tone === "spotlight" && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh-deep" />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-32 h-[30rem] w-[30rem] animate-aurora-a rounded-full bg-brand-soft/25 blur-[110px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 top-10 h-[26rem] w-[26rem] animate-aurora-b rounded-full bg-accent/15 blur-[120px]"
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
                  "mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                  isDark
                    ? "border border-white/15 bg-white/[0.04] text-brand-strong"
                    : "border border-line bg-card text-brand-strong shadow-card",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-strong shadow-glow-sm" />
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
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium",
                      isDark
                        ? "border border-white/10 bg-white/[0.06] text-white backdrop-blur"
                        : "bg-card text-ink shadow-card ring-1 ring-line",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-soft" />
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
            <div className="animate-scale-in [animation-delay:120ms]">{visual}</div>
          ) : (
            imageSrc && (
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
                      : "border border-line bg-surface-blue-tint",
                  )}
                >
                  <Image
                    src={imageSrc}
                    alt={imageAlt ?? ""}
                    fill
                    priority
                    sizes="(min-width:1024px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>

                {/* Truthful live-data badge (the tools use real ECB rates). */}
                <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-full border border-line glass px-3.5 py-2 text-xs font-medium text-ink shadow-elevated md:left-6">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-glow-pulse rounded-full bg-brand-soft opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-blue" />
                  </span>
                  Live ECB rates
                </div>
              </div>
            )
          )}
        </div>

        {stats && stats.length > 0 && (
          <dl
            className={cn(
              "mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-card-lg border md:mt-16 md:grid-cols-4",
              isDark ? "border-white/10 bg-white/10" : "border-line bg-line",
            )}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className={cn("px-5 py-6 text-center", isDark ? "bg-surface-navy" : "bg-canvas")}
              >
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span
                    className={cn(
                      "num-glow block font-display text-3xl font-bold tabular-nums tracking-tight md:text-4xl",
                      isDark ? "text-white" : "text-ink",
                    )}
                  >
                    {s.value}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-xs",
                      isDark ? "text-white/55" : "text-ink-subtle",
                    )}
                  >
                    {s.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Container>
    </section>
  );
}
