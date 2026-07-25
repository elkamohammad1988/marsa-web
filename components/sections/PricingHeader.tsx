"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/utils";
import { PricingPlanCard } from "./PricingPlanCard";
import { plans, businessPlans } from "@/lib/pricing";

export function PricingHeader() {
  const [audience, setAudience] = useState<"personal" | "business">("personal");
  const current = audience === "personal" ? plans : businessPlans;

  return (
    <section className="bg-surface-cream pb-12 pt-10 md:pb-16 md:pt-14">
      <Container>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-card p-1 shadow-card">
            {(["personal", "business"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setAudience(k)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  audience === k
                    ? "bg-brand-blue text-on-brand"
                    : "text-ink hover:bg-ink/5",
                )}
                aria-pressed={audience === k}
              >
                {k}
              </button>
            ))}
          </div>

          <Heading level="display" className="max-w-3xl">
            Compare Marsa Accounts And Cards
          </Heading>
          <p className="text-base text-ink-muted md:text-lg">Find The One That Fits You</p>
        </div>

        <div className="mt-12 flex flex-col gap-6 lg:gap-8">
          {current.map((plan) => (
            <PricingPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </Container>
    </section>
  );
}
