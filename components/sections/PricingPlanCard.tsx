import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CheckBullet } from "@/components/ui/CheckBullet";
import { BrandArt, type ArtName } from "@/components/art/BrandArt";
import type { Plan } from "@/lib/pricing";

/**
 * One illustration per plan. The old map pointed six plans at three PNGs, two
 * of which were the same photograph — so "Classic" and "Business Growth"
 * rendered an identical picture labelled `alt="Classic card render"` and
 * `alt="Business Growth card render"`.
 */
const planArt: Record<string, ArtName> = {
  classic: "card-and-phone",
  plus: "card-stack",
  premium: "coin",
  "biz-starter": "phone-accounts",
  "biz-growth": "phone-home",
  "biz-enterprise": "coin-warm",
};

export function PricingPlanCard({ plan }: { plan: Plan }) {
  return (
    <article className="grid grid-cols-1 items-center gap-6 rounded-card-lg bg-card p-6 shadow-card md:p-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
      <div>
        {plan.badge && <Badge tone="ink">{plan.badge}</Badge>}
        <h2 className="mt-4 text-3xl font-bold text-ink md:text-4xl">{plan.name}</h2>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-ink">{plan.price}</span>
          {plan.priceSuffix && (
            <span className="text-base text-ink-muted">{plan.priceSuffix}</span>
          )}
        </div>
        <p className="mt-4 max-w-xl text-sm text-ink-muted md:text-base">{plan.description}</p>

        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {plan.features.map((f) => (
            <CheckBullet key={f} tone="brand">
              {f}
            </CheckBullet>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button href={plan.primaryCta.href} variant="primary" size="lg">
            {plan.primaryCta.label}
          </Button>
          <Button href={plan.secondaryCta.href} variant="outline" size="lg">
            {plan.secondaryCta.label}
          </Button>
        </div>
      </div>

      <div className="relative mx-auto aspect-[5/4] w-full max-w-md overflow-hidden rounded-card">
        <BrandArt name={planArt[plan.id] ?? "card-and-phone"} />
      </div>
    </article>
  );
}
