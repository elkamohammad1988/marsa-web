import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CheckBullet } from "@/components/ui/CheckBullet";
import type { Plan } from "@/lib/pricing";

const planImageMap: Record<string, string> = {
  classic: "/images/card-phone.png",
  plus: "/images/cards-stack.png",
  premium: "/images/coin-blue.png",
  "biz-starter": "/images/cards-stack.png",
  "biz-growth": "/images/card-phone.png",
  "biz-enterprise": "/images/coin-gold.png",
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
            <CheckBullet key={f} tone="blue">
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

      <div className="relative mx-auto aspect-[5/4] w-full max-w-md">
        <Image
          src={planImageMap[plan.id] ?? "/images/card-phone.png"}
          alt={`${plan.name} card render`}
          fill
          sizes="(min-width:1024px) 35vw, 90vw"
          className="object-contain"
        />
      </div>
    </article>
  );
}
