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
        {/*
          Heading first, switch second.

          The switch used to sit *above* the title, which put a control before
          the page had said what it was for — the reader met "Personal /
          Business" with nothing yet to apply it to. It filters the cards below
          it, so it belongs directly above them, and the page now reads title →
          promise → filter → plans.
        */}
        <div className="max-w-2xl">
          <Heading level="display">Compare Marsa accounts and cards</Heading>
          <p className="mt-4 text-base text-ink-muted md:text-lg">
            Every plan opens the same European multi-currency IBAN. What changes is the card, the
            limits and the level of support.
          </p>
        </div>

        <div className="mt-9 flex flex-col gap-6 border-t border-line pt-8">
          {/*
            One switch, not two buttons that happen to look like one. The fill
            is a single element that slides between the halves, so the control
            reads as a state changing rather than as two colours swapping —
            and because both halves are the same width, its travel is exactly
            100% of its own width and needs no measuring.

            ## Shape

            `rounded-xl` outside, `rounded-lg` inside, and those two numbers are
            related rather than chosen: the segments are `rounded-lg` because
            every control on this site is (`Button`, `Input`, `Select`), and 4px
            of padding around an 8px corner needs a 12px corner to stay
            concentric. Both used to be `rounded-full`.

            The reason that mattered is not the pill itself — it is that
            `GetStartedForm` renders the *same control*, Personal against
            Business, and already drew it this way. One control with two
            silhouettes on two pages is the kind of drift a reader cannot name
            and does read as carelessness. `shadow-e2` also went: a segmented
            switch is inset in its surface, not floating above it.
          */}
          <div className="relative inline-flex w-full items-center self-start rounded-xl border border-line bg-card p-1 sm:w-auto">
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-brand transition-transform duration-300 ease-out",
                audience === "business" && "translate-x-full",
              )}
            />
            {(["personal", "business"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setAudience(k)}
                className={cn(
                  "relative z-10 flex-1 rounded-lg px-5 py-2 text-sm font-medium capitalize transition-colors duration-200 sm:w-28 sm:flex-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  audience === k ? "text-on-brand" : "text-ink-muted hover:text-ink",
                )}
                aria-pressed={audience === k}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Three abreast, so the page can be read across as well as down —
              which is what "compare" means. Each card used to run the full
              width of the container with an illustration beside it, and three
              of those stacked is a list of plans rather than a comparison of
              them. */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {current.map((plan) => (
              <PricingPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
