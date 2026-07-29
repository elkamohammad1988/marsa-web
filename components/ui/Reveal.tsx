"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger, in milliseconds, applied when the element enters the viewport. */
  delay?: number;
  /** Element to render. Defaults to a plain div. */
  as?: ElementType;
};

/**
 * Fades content up the first time it scrolls into view.
 *
 * **This component can only ever make content appear sooner, never keep it
 * hidden.** Three separate things guarantee that, because a decorative
 * animation must not be able to cost a reader the page:
 *
 *   1. `.reveal` in globals.css is *visible* by default. The hidden start is
 *      scoped to `@media (scripting: enabled)`, so with JavaScript off the
 *      content is simply painted.
 *   2. A CSS-only fallback animation reveals the element after four seconds,
 *      so a bundle that is slow or never arrives costs a delay rather than the
 *      content.
 *   3. If `IntersectionObserver` is missing, this shows the element at once.
 *
 * The observer watches the viewport exactly — no negative root margin, and a
 * threshold of zero. A negative bottom margin shrinks the observation area, so
 * anything sitting in that strip on a page already scrolled to its end never
 * intersects and never reveals: the previous `-12%` bottom margin could strand
 * the last element on a short page permanently. Revealing a fraction of a
 * second earlier is not a cost worth that.
 */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal", visible && "is-visible", className)}
    >
      {children}
    </Tag>
  );
}
