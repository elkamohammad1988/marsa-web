import { MarsaMark } from "@/components/icons/Logo";
import { ART_CAPTIONS, type ArtName } from "./captions";
import { cn } from "@/lib/utils";

export type { ArtName };

/**
 * The site's product illustrations, drawn in the browser from design tokens.
 *
 * What was here before: seventeen PNGs in `public/images/` with **six unique
 * hashes between them** — unreplaced Figma-export placeholders. `card-phone.png`
 * was rendered on the homepage as `alt="Marsa Mastercard and mobile app"` and
 * was, in fact, byte-identical to the cover of blog post 6. `coin-blue.png` was
 * `alt="Marsa coin"` and was blog post 1. Two posts shared a cover. That is a
 * WCAG 1.1.1 failure before it is a content problem: a screen-reader user was
 * told something untrue about the image, and a sighted visitor who noticed the
 * "Mastercard shot" was also a blog photo drew exactly the wrong conclusion
 * about a fintech product.
 *
 * Three things made replacement-in-kind the wrong fix:
 *
 * 1. **Provenance.** Nobody can vouch for where those files came from, which is
 *    the same class of problem as the invented addresses and the asserted
 *    licence. Art that ships in a public repository has to be art the
 *    repository owns.
 * 2. **The trademark.** The card shot carried a Mastercard mark on a product
 *    with no card, no issuer and no scheme agreement. The card drawn here is
 *    deliberately **scheme-neutral** — no network mark, real or invented — and
 *    where a scheme logo would sit it says `CONCEPT`, because that is the one
 *    true thing there is to print on it.
 * 3. **The alt text could drift again.** Every caption below is attached to the
 *    drawing, not to the call site, so a page cannot describe a picture it is
 *    not showing. `role="img"` also makes the whole subtree presentational, so
 *    the decorative internals never reach the accessibility tree as stray text.
 *
 * The idiom is `components/sections/AccountPreview.tsx`: tokenised markup
 * rather than raster, so the art follows the palette, stays sharp at any
 * density, and costs a few hundred bytes of HTML instead of 2.2 MB of PNG.
 */

/* ------------------------------------------------------------------ parts */

/**
 * A payment card, ISO 7810 ID-1 proportions (85.60 × 53.98 mm), carrying no
 * scheme mark. The PAN is masked to four digits that are obviously an example,
 * because an unmasked number — even a fake one — is a shape people recognise
 * as real.
 */
function PaymentCard({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[1.586/1] overflow-hidden rounded-[6.5%] bg-surface-deep ring-1 ring-inset ring-white/[0.14]",
        className,
      )}
    >
      {/* Face: mesh light, then a diagonal sheen so the plastic reads as a
          physical object rather than a flat swatch. */}
      <div className="absolute inset-0 bg-mesh-deep opacity-95" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.13] via-transparent to-black/25" />
      <div className="absolute -left-1/4 top-0 h-[200%] w-1/2 -rotate-[24deg] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      <div className="relative flex h-full flex-col justify-between p-[7%]">
        <div className="flex items-start justify-between">
          <span className="flex items-center gap-1.5">
            <span className="logo-tile grid aspect-square w-[13%] min-w-[18px] place-items-center rounded-[22%] text-white">
              <MarsaMark className="h-[62%] w-[62%]" />
            </span>
            <span className="font-display text-[0.7em] font-bold leading-none tracking-[-0.03em] text-white">
              marsa
            </span>
          </span>

          {/* Contactless. Four arcs, the standard glyph — it is a function
              indicator, not anybody's trademark. */}
          <svg viewBox="0 0 24 24" className="w-[11%] min-w-[14px] text-white/55" fill="none">
            {[5, 9, 13, 17].map((r, i) => (
              <path
                key={r}
                d={`M${9 - i * 2.6} ${12 - r * 0.62}a${r} ${r} 0 0 1 0 ${r * 1.24}`}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity={1 - i * 0.16}
              />
            ))}
          </svg>
        </div>

        {/* Chip. Gold because a contact plate is gold; the tone is the palette's
            own `--warning` amber rather than an imported swatch. */}
        <div className="relative w-[17%] min-w-[24px] overflow-hidden rounded-[14%] bg-gradient-to-br from-warning to-warning/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
          <div className="aspect-[4/3]" />
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-px opacity-30">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="bg-black/45" />
            ))}
          </div>
        </div>

        {!compact ? (
          <div>
            <p className="font-mono text-[0.62em] leading-none tracking-[0.12em] text-white/85">
              •••• •••• •••• 4291
            </p>
            <div className="mt-[3%] flex items-end justify-between">
              <span className="font-mono text-[0.44em] leading-none tracking-[0.1em] text-white/45">
                VALID THRU 09/29
              </span>
              {/* Where a scheme mark would sit. */}
              <span className="text-[0.42em] font-semibold uppercase leading-none tracking-[0.24em] text-brand-strong">
                Concept
              </span>
            </div>
          </div>
        ) : (
          <span className="text-[0.42em] font-semibold uppercase leading-none tracking-[0.24em] text-brand-strong">
            Concept
          </span>
        )}
      </div>
    </div>
  );
}

/** A phone body. The screen is whatever is passed in. */
function Phone({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[9/18.5] overflow-hidden rounded-[13%/6.5%] bg-surface-deep p-[3.5%] shadow-e3 ring-1 ring-inset ring-white/[0.14]",
        className,
      )}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[11%/5.5%] bg-canvas">
        <div className="absolute inset-x-0 top-0 h-1/3 bg-radial-glow" />
        {/* Notch */}
        <span className="absolute left-1/2 top-[2%] h-[1.6%] w-[26%] -translate-x-1/2 rounded-full bg-white/15" />
        <div className="relative flex h-full flex-col px-[8%] pb-[7%] pt-[9%]">{children}</div>
      </div>
    </div>
  );
}

const BALANCES = [
  { code: "EUR", amount: "€8,120.40", share: 64 },
  { code: "USD", amount: "$3,940.00", share: 27 },
  { code: "GBP", amount: "£420.15", share: 9 },
];

/** Phone screen: the account home — one balance and the two things you do. */
function HomeScreen() {
  return (
    <>
      <p className="text-[0.5em] font-medium uppercase tracking-[0.18em] text-ink-subtle">
        Total balance
      </p>
      <p className="num-glow mt-[3%] font-display text-[1.5em] font-bold leading-none tabular-nums tracking-tight text-ink">
        €12,480
        <span className="text-ink-subtle">.55</span>
      </p>

      <div className="mt-[7%] flex gap-[4%]">
        {["Send", "Convert"].map((label, i) => (
          <span
            key={label}
            className={cn(
              "flex-1 rounded-full py-[5%] text-center text-[0.5em] font-semibold leading-none",
              i === 0
                ? "bg-cta-gradient text-on-brand shadow-cta"
                : "border border-line bg-card text-ink",
            )}
          >
            {label}
          </span>
        ))}
      </div>

      {/* A 30-day balance line. Decorative shape, not plotted data — so it is
          drawn as one path rather than dressed up with axes it does not have. */}
      <div className="mt-[8%] rounded-[8%] border border-line bg-card p-[6%]">
        <svg viewBox="0 0 100 34" className="w-full" fill="none" preserveAspectRatio="none">
          <path
            d="M0 27 L14 22 L27 25 L41 14 L55 18 L69 9 L82 12 L100 3"
            stroke="rgb(var(--brand-strong))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M0 27 L14 22 L27 25 L41 14 L55 18 L69 9 L82 12 L100 3 V34 H0 Z"
            fill="rgb(var(--brand) / 0.16)"
          />
        </svg>
      </div>

      <ul className="mt-auto flex items-center justify-between pt-[6%]">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            className={cn(
              "h-[3px] rounded-full",
              i === 0 ? "w-[22%] bg-brand-strong" : "w-[12%] bg-line-dark",
            )}
          />
        ))}
      </ul>
    </>
  );
}

/** Phone screen: the currency list — what "multi-currency" actually looks like. */
function AccountsScreen() {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <p className="text-[0.62em] font-semibold leading-none text-ink">Accounts</p>
        <span className="text-[0.46em] leading-none text-ink-subtle">3 of 30+</span>
      </div>

      <ul className="mt-[7%] flex flex-col gap-[4%]">
        {BALANCES.map((b) => (
          <li key={b.code} className="rounded-[9%] border border-line bg-card px-[7%] py-[6%]">
            <div className="flex items-center justify-between">
              <span className="text-[0.5em] font-semibold leading-none tracking-wide text-ink-subtle">
                {b.code}
              </span>
              <span className="text-[0.52em] font-semibold leading-none tabular-nums text-ink">
                {b.amount}
              </span>
            </div>
            <div className="mt-[6%] h-[3px] overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-brand"
                style={{ width: `${b.share}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center gap-[4%] rounded-[9%] border border-dashed border-line-dark px-[7%] py-[5%]">
        <span className="grid aspect-square w-[12%] place-items-center rounded-full bg-brand/[0.14] text-[0.6em] font-bold leading-none text-brand-strong">
          +
        </span>
        <span className="text-[0.48em] leading-none text-ink-muted">Open another currency</span>
      </div>
    </>
  );
}

/**
 * The Marsa mark as a struck disc, with the ripples it lands in.
 *
 * Everything is inset *inwards* from one square box rather than bleeding
 * outwards from the disc: the ripples are the widest part of the drawing, so if
 * they were negative insets they would be the first thing clipped by a slot
 * shorter than it is wide — which is every slot on this site.
 */
function Coin({ tone }: { tone: "brand" | "warm" }) {
  return (
    <div className="relative aspect-square h-full max-h-full">
      <span className="absolute inset-0 rounded-full border border-white/[0.05]" />
      <span className="absolute inset-[9%] rounded-full border border-white/[0.09]" />

      <span
        className={cn(
          "absolute inset-[20%] rounded-full opacity-40 blur-2xl",
          tone === "warm" ? "bg-warning" : "bg-brand",
        )}
      />

      <span
        className={cn(
          "absolute inset-[20%] grid place-items-center overflow-hidden rounded-full text-white ring-1 ring-inset ring-white/25",
          tone === "warm"
            ? "bg-[linear-gradient(135deg,rgb(var(--warning))_0%,rgb(var(--brand-deep))_100%)] shadow-e3"
            : "bg-brand-gradient shadow-glow",
        )}
      >
        {/* Rim light along the top edge, the way a struck disc catches it. */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 via-transparent to-black/25" />
        <MarsaMark className="relative h-[52%] w-[52%]" />
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- scenes */

/**
 * One drawing per name. The sentence describing each lives beside it in
 * `captions.ts`, keyed off the same union — so a slot cannot exist without a
 * description, and a description cannot outlive the slot it describes.
 */
/**
 * Sizing rule, and the reason it is worth stating: **every slot on this site is
 * landscape** — 4:3 in the hero and the showcase, 5:4 in the CTA and the
 * pricing card. So anything taller than it is wide is sized from the container
 * *height* (`h-full` plus an aspect ratio, letting width follow), and anything
 * wider than it is tall is sized from the width. Get that backwards and the
 * drawing is clipped in the narrowest slot only — which is exactly the kind of
 * bug that ships, because it looks right in the place you were testing.
 */
const SCENES: Record<ArtName, () => React.ReactNode> = {
  // Width follows the phone, so the card can overhang it in percentage terms
  // without knowing the slot's dimensions.
  "card-and-phone": () => (
    <div className="relative h-full w-fit">
      <Phone className="h-full">
        <HomeScreen />
      </Phone>
      <PaymentCard className="absolute bottom-[7%] left-[42%] w-[168%] rotate-[-7deg] shadow-e3" />
    </div>
  ),

  // Wider than tall (1.35:1) against slots at 1.33:1 and 1.25:1 — width-driven.
  "card-stack": () => (
    <div className="relative aspect-[1.35/1] w-full max-w-[26rem]">
      <PaymentCard
        compact
        className="absolute left-[16%] top-0 w-[72%] rotate-[-9deg] opacity-70"
      />
      <PaymentCard
        compact
        className="absolute left-[8%] top-[13%] w-[76%] rotate-[-3deg] opacity-85 shadow-e2"
      />
      <PaymentCard className="absolute left-0 top-[28%] w-[84%] rotate-[3deg] shadow-e3" />
    </div>
  ),

  coin: () => <Coin tone="brand" />,

  "coin-warm": () => <Coin tone="warm" />,

  "phone-accounts": () => (
    <Phone className="h-full shadow-e3">
      <AccountsScreen />
    </Phone>
  ),

  "phone-home": () => (
    <Phone className="h-full shadow-e3">
      <HomeScreen />
    </Phone>
  ),
};

/* -------------------------------------------------------------- component */

type BrandArtProps = {
  name: ArtName;
  /**
   * `filled` paints the slot's own backdrop — for the wide panels that used to
   * hold a photograph. `bare` draws on whatever is behind it, for slots that
   * already sit inside a dark card of their own.
   */
  surface?: "filled" | "bare";
  className?: string;
};

export function BrandArt({ name, surface = "filled", className }: BrandArtProps) {
  const Scene = SCENES[name];

  return (
    <div
      // `role="img"` + the caption for this exact drawing: the description
      // travels with the art, and the decorative internals stay out of the
      // accessibility tree entirely.
      role="img"
      aria-label={ART_CAPTIONS[name]}
      // `container-type: size` makes the `cqh` below resolve against this box
      // rather than the viewport, so the type inside a drawing scales with the
      // drawing. A viewport-relative size would render the same 17px label on a
      // 560px hero illustration and a 300px pricing thumbnail.
      className={cn(
        "relative grid h-full w-full place-items-center overflow-hidden p-[6%] [container-type:size]",
        surface === "filled" && "bg-surface-deep",
        className,
      )}
    >
      {surface === "filled" && (
        <>
          <span className="pointer-events-none absolute inset-0 bg-mesh-deep opacity-90" />
          <span className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
          <span className="pointer-events-none absolute inset-0 bg-noise" />
        </>
      )}
      <div className="relative flex h-full w-full items-center justify-center text-[clamp(7px,4.4cqh,20px)]">
        <Scene />
      </div>
    </div>
  );
}
