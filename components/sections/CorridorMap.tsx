import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Reveal } from "@/components/ui/Reveal";
import { Stagger } from "@/components/ui/Stagger";

/**
 * The corridor: money arriving from marketplaces and clients abroad, landing in
 * one European IBAN, then leaving on local rails.
 *
 * ## What this was
 *
 * A centred heading over a centred paragraph over a three-column diagram: six
 * bordered cards, a gold tile in the middle, and twelve dashed SVG arcs on an
 * infinite `dash-flow` animation crawling between them.
 *
 * Four things were wrong with it, and they are worth separating because only
 * one of them is a matter of taste:
 *
 * 1. **The arcs were painted in the previous palette.** `stop-color` was
 *    hardcoded `rgb(216 167 177)` and `rgb(185 137 92)` — dusty pink and brown,
 *    left behind by the rose-black identity this site replaced with gold. No
 *    token could reach them, so they had quietly been off-brand since the
 *    rebrand: the one section claiming to draw the product's central idea was
 *    drawing it in the wrong colour.
 * 2. **The motion never stopped.** An infinite animation is a permanent claim
 *    on peripheral attention, and this one ran on a section a reader passes
 *    through on the way to the converter.
 * 3. **The cards were not objects.** Each held a name and a two-word note.
 *    That is a row.
 * 4. **The rhythm.** Centred head, centred paragraph, symmetrical grid — the
 *    third section on the page to take that shape.
 *
 * ## What it is now
 *
 * The same statement, made by the layout instead of by decoration. The heading
 * block goes left, where the rest of the page's copy sits. The three columns
 * survive because the content genuinely has three parts — in, the account, out
 * — but they are ruled lists under labels, and the middle column says in words
 * what the arcs were miming. The direction is carried by the reveal variants,
 * which is where it was always doing the most work.
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

function Flow({ items }: { items: { label: string; meta: string }[] }) {
  return (
    <Stagger as="ul" className="mt-4 border-t border-white/12" step={70}>
      {items.map((n) => (
        <li key={n.label} className="flex flex-col border-b border-white/12 py-3.5">
          <span className="text-sm font-semibold text-white">{n.label}</span>
          <span className="mt-0.5 text-xs text-white/55">{n.meta}</span>
        </li>
      ))}
    </Stagger>
  );
}

function ColumnLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
      {children}
    </h3>
  );
}

export function CorridorMap() {
  return (
    /*
      `overflow-hidden` is load-bearing, not tidiness.

      The two outer columns enter with `reveal-left` / `reveal-right`, which is
      a `translate3d(∓32px, 0, 0)` held until the observer fires. Below `md`
      those columns are full-viewport width, so during the hidden state the
      right-hand one starts 32px past the right edge of the document — and an
      untransformed 12px of that survived, which is a horizontal scrollbar on
      the home page at 390px.

      This section carried `overflow-hidden` before the rewrite and losing it
      was the regression; `tests/smoke/public-site.smoke.ts` caught it at 390px
      on the next run. Any section whose children enter along the x-axis has to
      clip, because the transform is what the document measures.
    */
    <section className="overflow-hidden bg-surface-deep py-14 md:py-20 lg:py-24">
      <Container>
        <Reveal className="max-w-2xl">
          <Heading level="eyebrow" className="text-brand-strong">
            One account, both directions
          </Heading>
          <Heading level="h2" className="rise mt-3 text-white">
            Get paid from anywhere. Pay out locally.
          </Heading>
          <p className="mt-4 text-white/70 md:text-lg">
            Money from marketplaces, platforms and clients abroad lands in your own European IBAN.
            From there you convert at interbank rates and pay out on local rails, without a second
            bank in the middle.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 md:mt-16 md:grid-cols-3">
          {/* Each column enters along the axis its own money travels: inbound
              from the left, outbound to the right, converging on the account in
              the middle. It is the one place on the site where the direction of
              a reveal says the same thing as the content it reveals — which is
              the difference between motion applied to a page and motion
              designed for one. */}
          <Reveal variant="left" as="section">
            <ColumnLabel>Money in</ColumnLabel>
            <Flow items={INBOUND} />
          </Reveal>

          <Reveal delay={120} as="section">
            <ColumnLabel>In one account</ColumnLabel>
            <div className="mt-4 border-t border-white/12 pt-3.5">
              <p className="text-sm font-semibold text-white">One European IBAN</p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                Every payment above settles into the same account, in the currency it arrived in.
                Nothing is converted until you choose to convert it, and the rate you get is the
                one the European Central Bank published.
              </p>
            </div>
          </Reveal>

          <Reveal variant="right" delay={200} as="section">
            <ColumnLabel>Money out</ColumnLabel>
            <Flow items={OUTBOUND} />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
