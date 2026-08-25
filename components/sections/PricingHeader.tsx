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
    <section className="relative isolate overflow-hidden bg-surface-alt pb-12 pt-10 md:pb-16 md:pt-14">
      <Container>
        <div className="flex flex-col items-center gap-6 text-center">
          {/*
            One switch, not two buttons that happen to look like one. The fill
            is a single element that slides between the halves, so the control
            reads as a state changing rather than as two colours swapping —
            and because both halves are the same width, its travel is exactly
            100% of its own width and needs no measuring.
          */}
          <div className="relative inline-flex items-center rounded-full border border-line bg-card p-1 shadow-e2">
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-brand shadow-cta transition-transform duration-300 ease-out",
                audience === "business" && "translate-x-full",
              )}
            />
            {(["personal", "business"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setAudience(k)}
                className={cn(
                  "relative z-10 w-28 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  audience === k ? "text-on-brand" : "text-ink-muted hover:text-ink",
                )}
                aria-pressed={audience === k}
              >
                {k}
              </button>
            ))}
          </div>

          <Heading level="display" className="max-w-3xl">
            Compare Marsa accounts and cards
          </Heading>
          <p className="text-base text-ink-muted md:text-lg">Find the one that fits you</p>
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
