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
      {/* Face: one diagonal light, corner to corner.
          It used to be three stacked layers — a two-light mesh gradient, this
          diagonal, and a rotated band of `white/[0.07]` sweeping across the
          middle to read as a reflection. The reflection is the one to name: a
          moving highlight on a still object is the shape the brief calls a fake
          reflection, and it was doing the same job as the diagonal underneath
          it. A card is a physical thing under a light, so it keeps the light;
          it does not keep the studio. */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.13] via-transparent to-black/25" />

      <div className="relative flex h-full flex-col justify-between p-[7%]">
        <div className="flex items-start justify-between">
          <span className="flex items-center gap-1.5">
            <span className="logo-tile grid aspect-square w-[13%] min-w-[18px] place-items-center rounded-[22%]">
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
      {/* No wash behind the screen. A `bg-radial-glow` used to sit over the top
          third of it — a gold radial fading down, which is what a phone screen
          does not do. The canvas fill is the screen. */}
      <div className="relative flex h-full flex-col overflow-hidden rounded-[11%/5.5%] bg-canvas">
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
      <p className="figure mt-[3%] font-display text-[1.5em] font-bold leading-none tabular-nums tracking-tight text-ink">
        €12,480
        <span className="text-ink-subtle">.55</span>
      </p>

      <div className="mt-[7%] flex gap-[4%]">
        {["Send", "Convert"].map((label, i) => (
          <span
            key={label}
            className={cn(
              // `rounded-lg`, flat `bg-brand`: the drawing depicts the button
              // this product actually ships. It used to be a `rounded-full`
              // pill filled with `bg-cta-gradient` — the metallic CTA the real
              // `Button` gave up — so the illustration of the app was showing a
              // control the app no longer has.
              "flex-1 rounded-lg py-[5%] text-center text-[0.5em] font-semibold leading-none",
              i === 0
                ? "bg-brand text-on-brand"
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

/*
 * `Coin` used to live here: the Marsa mark drawn as a struck disc inside a
 * blurred gold orb (`opacity-40 blur-2xl`), ringed by two concentric hairlines
 * standing in for ripples, lit by a white-to-black rim gradient and seated on
 * `shadow-glow`.
 *
 * It rendered in thirteen slots — every closing CTA on the site, plus two
 * pricing plans — and it is the object this pass exists to remove. A glowing
 * sphere with halo rings floating in a dark box is the single most legible
 * signature of a generated page, and unlike the phone and the card it depicted
 * nothing: a logo is not a product screen, so a reader learned no more from it
 * than from the wordmark in the navbar. The `warm` variant was the same drawing
 * in amber.
 *
 * It is not redrawn flatter, because a flatter ornament in the same slot is
 * still an ornament. `CTACard` now spends the space on the ask instead.
 */

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
  /**
   * Height-driven, with the frame declaring its own ratio rather than hugging
   * the phone.
   *
   * `w-fit` was the obvious way to write this — let the box be as wide as the
   * phone, then overhang the card in percentages of it — but fit-content has
   * to compute a max-content width, and the phone has no intrinsic width to
   * offer: its width comes from an aspect ratio against a height. So the
   * wrapper fell back to sizing on the phone's *text*, and the whole drawing
   * inflated with it.
   *
   * 11/10 is the ratio of the pair, not of the phone: the phone is 9/18.5, so
   * at full height it is 0.442 of this frame's width, and the card's 74%/19%
   * are that same 168%/42% of the phone re-expressed against the frame. The
   * -7° tilt is inside the remaining margin, so nothing touches the edges.
   */
  "card-and-phone": () => (
    <div className="relative mx-auto aspect-[11/10] h-full">
      <Phone className="absolute left-0 top-0 h-full">
        <HomeScreen />
      </Phone>
      <PaymentCard className="absolute bottom-[7%] left-[19%] w-[74%] rotate-[-7deg] shadow-e3" />
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
      // A block, not a grid, and that is the whole sizing contract.
      //
      // This was `grid place-items-center`. A grid's `auto` track grows to its
      // item's max-content, so the stage below could not be held to the slot:
      // its `h-full` was a percentage against a track that the stage's own
      // contents were sizing, which resolves to `auto`. Every drawing then
      // measured itself from its own text rather than from the slot it sits
      // in, and `overflow-hidden` cropped the difference in silence.
      // `card-and-phone` laid out at 676×1390 inside a 429×343 box — what
      // rendered was not a phone beside a card, it was a corner of the phone.
      // `card-stack` showed one and a half of the three cards its caption
      // promises, which makes it a WCAG 1.1.1 problem as well as an ugly one.
      //
      // A block gives `h-full` a definite height to resolve against, and
      // content overflows it instead of growing it. The centring the grid was
      // doing is done by the flex stage below, where it costs nothing.
      className={cn(
        "relative h-full w-full overflow-hidden p-[6%] [container-type:size]",
        surface === "filled" && "bg-surface-deep",
        className,
      )}
    >
      {/* `filled` is now a flat deep panel and nothing else.
          Three layers used to sit on it: a two-light mesh gradient, a dotted
          grid masked to a soft ellipse, and a film grain at 18% in `overlay`
          blend. Together they are the atmospheric backdrop the hero already
          gave up — the same argument applies here, and it applies harder,
          because this panel exists to frame a *drawing*. Anything painted
          behind the drawing is competing with it. The surface ladder puts
          `--surface-deep` a full rung below `--canvas`, so the frame reads
          without help. */}
      <div className="relative flex h-full w-full items-center justify-center text-[clamp(7px,4.4cqh,20px)]">
        <Scene />
      </div>
    </div>
  );
}
