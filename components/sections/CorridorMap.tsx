import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { MarsaMark } from "@/components/icons/Logo";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The corridor diagram: money arriving from marketplaces and clients abroad,
 * landing in one Marsa account, then leaving on local rails.
 *
 * The arcs are a single SVG layer stretched behind a three-column grid, so the
 * diagram reflows on mobile (columns stack, arcs fade out) without any JS.
 */

const INBOUND = [
  { label: "Amazon payouts", meta: "USD · EUR · GBP" },
  { label: "Stripe & PayPal", meta: "Card settlements" },
  { label: "Agency clients", meta: "SEPA & SWIFT in" },
];

const OUTBOUND = [
  { label: "Supplier payments", meta: "SEPA · same day" },
  { label: "Team & contractors", meta: "Bulk payouts" },
  { label: "Card spending", meta: "Interbank FX" },
];

function Node({ label, meta, align }: { label: string; meta: string; align: "left" | "right" }) {
  return (
    <li
      className={`flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm ${
        align === "right" ? "lg:items-end lg:text-right" : ""
      }`}
    >
      <span className="text-sm font-semibold text-white">{label}</span>
      <span className="text-xs text-white/55">{meta}</span>
    </li>
  );
}

export function CorridorMap() {
  return (
    <section className="relative isolate overflow-hidden bg-surface-deep py-14 md:py-20 lg:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh-deep opacity-90" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-noise" />

      <Container className="relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Heading level="eyebrow" className="text-brand-soft">
            One account, both directions
          </Heading>
          <Heading level="h2" className="rise mt-3 text-white">
            Get paid from anywhere. Pay out locally.
          </Heading>
          <p className="mt-4 text-white/70">
            Money from marketplaces, platforms and clients abroad lands in your own European IBAN.
            From there you convert at interbank rates and pay out on local rails — without a second
            bank in the middle.
          </p>
        </Reveal>

        <div className="relative mt-12">
          {/* Connecting arcs — decorative, hidden on stacked layouts. */}
          <svg
            aria-hidden
            viewBox="0 0 1000 320"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          >
            <defs>
              <linearGradient id="corridor-in" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(216 167 177)" stopOpacity="0" />
                <stop offset="100%" stopColor="rgb(216 167 177)" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="corridor-out" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(185 137 92)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="rgb(185 137 92)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[60, 160, 260].map((y, i) => (
              <path
                key={`in-${y}`}
                d={`M250 ${y} C 360 ${y}, 400 160, 490 160`}
                fill="none"
                stroke="url(#corridor-in)"
                strokeWidth="2"
                strokeDasharray="10 14"
                className="animate-dash-flow"
                style={{ animationDelay: `${i * 0.45}s` }}
              />
            ))}
            {[60, 160, 260].map((y, i) => (
              <path
                key={`out-${y}`}
                d={`M510 160 C 600 160, 640 ${y}, 750 ${y}`}
                fill="none"
                stroke="url(#corridor-out)"
                strokeWidth="2"
                strokeDasharray="10 14"
                className="animate-dash-flow"
                style={{ animationDelay: `${i * 0.45 + 0.2}s` }}
              />
            ))}
          </svg>

          <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
            {/* Each column enters along the axis its own arcs travel: inbound
                from the left, outbound to the right, converging on the mark in
                the middle. It is the one place on the site where the direction
                of a reveal is saying the same thing as the diagram it is
                revealing — which is the difference between motion applied to a
                page and motion designed for one. */}
            <Reveal variant="left">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Money in
              </p>
              <ul className="flex flex-col gap-3">
                {INBOUND.map((n) => (
                  <Node key={n.label} {...n} align="left" />
                ))}
              </ul>
            </Reveal>

            <Reveal delay={120} className="flex justify-center">
              <div className="relative grid h-32 w-32 place-items-center">
                <span
                  aria-hidden
                  className="absolute inset-0 animate-glow-pulse rounded-full bg-brand-soft/25 blur-2xl"
                />
                <span className="logo-tile relative grid h-20 w-20 place-items-center rounded-[26px] text-white shadow-glow ring-1 ring-inset ring-white/20">
                  <MarsaMark className="h-11 w-11" />
                </span>
              </div>
            </Reveal>

            <Reveal variant="right" delay={200}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/45 lg:text-right">
                Money out
              </p>
              <ul className="flex flex-col gap-3">
                {OUTBOUND.map((n) => (
                  <Node key={n.label} {...n} align="right" />
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
