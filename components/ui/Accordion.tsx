"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export type AccordionEntry = {
  question: string;
  answer: string;
};

type AccordionProps = {
  items: AccordionEntry[];
  tone?: "light" | "dark";
  className?: string;
};

/**
 * Every panel is rendered and collapsed with the `hidden` attribute, rather
 * than conditionally mounted.
 *
 * Two things depended on that (audit F6). `FAQ.tsx` emits `faqSchema(items)`
 * containing every answer, but with `{open && …}` only the first answer
 * existed in the HTML — markup asserting content the page does not contain
 * risks the rich result being dropped. And because the panel did not exist
 * when collapsed, the trigger had `aria-expanded` with no `aria-controls`
 * target to point at, so a screen reader announced a control that referred to
 * nothing.
 */
export function Accordion({ items, tone = "light", className }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  // Stable across server and client render, and unique per instance so two
  // accordions on one page cannot collide.
  const baseId = useId();

  const isDark = tone === "dark";
  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${baseId}-panel-${i}`;
        const triggerId = `${baseId}-trigger-${i}`;
        return (
          <div
            key={i}
            className={cn(
              "border-b",
              isDark ? "border-line-dark" : "border-line",
              i === 0 && (isDark ? "border-t border-line-dark" : "border-t border-line"),
            )}
          >
            <button
              type="button"
              id={triggerId}
              onClick={() => setOpenIndex(open ? null : i)}
              className={cn(
                "flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium md:text-lg",
                isDark ? "text-white" : "text-ink",
              )}
              aria-expanded={open}
              aria-controls={panelId}
            >
              <span>{item.question}</span>
              <span
                className={cn(
                  "inline-flex h-8 w-8 flex-none items-center justify-center rounded-full",
                  isDark ? "bg-white/10 text-white" : "bg-brand-blue text-on-brand",
                )}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className={cn("transition-transform duration-200", open && "rotate-45")}
                >
                  <path
                    d="M7 1.5V12.5M1.5 7H12.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!open}
              className={cn(
                "pb-5 pr-12 text-sm md:text-base",
                isDark ? "text-white/75" : "text-ink-muted",
              )}
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
