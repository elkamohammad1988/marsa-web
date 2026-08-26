import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CheckBullet } from "@/components/ui/CheckBullet";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/pricing";

/**
 * One plan, as a card — which is a shape it has actually earned.
 *
 * A plan is an object: it has a name, a price, a set of things it includes and
 * one action. That is the test a card has to pass here, and this is one of the
 * few blocks on the site that passes it.
 *
 * ## What went, and why
 *
 * **The illustration.** Each card carried a `BrandArt` drawing in a second
 * column — a phone, a fan of cards, or (on two plans) the glowing coin. It was
 * a panel inside a panel, it was the reason the card had to run full-bleed
 * across the page in a `1.4fr / 1fr` split, and it said nothing about the plan:
 * the same phone illustrated "Free" and "€14.99 / month". Removing it is what
 * lets three plans sit side by side, which is the only layout on which a
 * *comparison* page can actually be compared.
 *
 * **The second button.** See the note in `lib/pricing.ts`: all six pointed at
 * `/pricing` from `/pricing`.
 *
 * ## What marks the recommended plan
 *
 * A badge and a border, and only on the plan that has one. This used to be a
 * gradient rim plus a shadow step plus a badge — three treatments competing to
 * say one thing, one of which (the rim) was two mutually exclusive `::before`
 * implementations of itself, so whichever lost the cascade rendered nothing at
 * all. A 1px accent border is legible next to two hairlines and costs nothing.
 */
export function PricingPlanCard({ plan }: { plan: Plan }) {
  const featured = Boolean(plan.badge);

  return (
    <article
      className={cn(
        "flex flex-col rounded-card-lg border bg-card p-6 md:p-7",
        featured ? "border-brand" : "border-line",
      )}
    >
      {plan.badge ? (
        <div className="mb-4 h-6">
          <Badge>{plan.badge}</Badge>
        </div>
      ) : (
        /* Reserved from `md` up and not below it.

           The badge row has to be held open on the un-badged cards or the
           recommended plan is one line taller than its siblings and every
           heading, price and rule below it falls off the grid — which is what
           makes three cards read as three unrelated things. That only matters
           where the cards sit side by side. Stacked on a phone there is nothing
           to align with, so an empty 40px band above "Marsa Classic" is just a
           gap the reader has to scroll past. */
        <div aria-hidden className="hidden h-6 md:mb-4 md:block" />
      )}

      <h2 className="text-xl font-semibold text-ink md:text-2xl">{plan.name}</h2>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="figure font-display text-4xl font-bold tracking-tight text-ink">
          {plan.price}
        </span>
        {plan.priceSuffix && (
          <span className="text-sm text-ink-muted">{plan.priceSuffix}</span>
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-muted">{plan.description}</p>

      <ul className="mt-6 grid grid-cols-1 gap-2.5 border-t border-line pt-6">
        {plan.features.map((f) => (
          <CheckBullet key={f}>
            {f}
          </CheckBullet>
        ))}
      </ul>

      {/* `mt-auto` pins the action to the bottom of whichever card is tallest,
          so the three buttons land on one line rather than wherever each card's
          description happened to end. */}
      <div className="mt-auto pt-7">
        <Button
          href={plan.primaryCta.href}
          variant={featured ? "primary" : "outline"}
          size="lg"
          className="w-full"
        >
          {plan.primaryCta.label}
        </Button>
      </div>
    </article>
  );
}
