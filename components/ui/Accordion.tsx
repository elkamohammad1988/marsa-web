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
                "group flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium transition-colors md:text-lg",
                isDark ? "text-white" : "text-ink hover:text-brand-strong",
              )}
              aria-expanded={open}
              aria-controls={panelId}
            >
              <span>{item.question}</span>
              {/*
                The toggle was a solid `bg-brand` disc on every row. On a
                six-question FAQ that is six filled magenta circles stacked down
                the right edge — the loudest thing in the section, repeated, and
                all of it spent on a control the reader is not looking for.
                Magenta now marks only the row that is actually open, which is
                the one piece of state worth colouring.
              */}
              <span
                className={cn(
                  "inline-flex h-8 w-8 flex-none items-center justify-center rounded-full ring-1 transition-colors duration-200",
                  isDark
                    ? open
                      ? "bg-white/15 text-white ring-white/25"
                      : "bg-white/5 text-white/70 ring-white/15 group-hover:bg-white/10"
                    : open
                      ? "bg-brand/15 text-brand-strong ring-brand/30"
                      : "bg-card text-ink-muted ring-line group-hover:text-brand-strong group-hover:ring-brand-strong/35",
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
            {/*
              Collapsed with a grid row that animates from `0fr` to `1fr`
              rather than with the `hidden` attribute.

              `hidden` is `display: none`, which cannot be transitioned — so
              every answer appeared and vanished instantly, and the section that
              most invites a reader to click was the one place in the product
              with no response to the click. The grid track is the one technique
              that animates to a *content-derived* height without measuring
              anything in JavaScript.

              `inert` does the job `hidden` was doing for accessibility: the
              collapsed panel leaves the tab order and the accessibility tree.
              It stays in the DOM either way, which is what `aria-controls` and
              the `faqSchema` emitted alongside it both require. Where
              `grid-template-rows` cannot be interpolated the panel simply snaps
              — today's behaviour, not a broken one.
            */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              inert={!open}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    "pb-5 pr-12 text-sm transition-opacity duration-200 md:text-base",
                    open ? "opacity-100 delay-100" : "opacity-0",
                    isDark ? "text-white/75" : "text-ink-muted",
                  )}
                >
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
