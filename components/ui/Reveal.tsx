"use client";

import type { ElementType, ReactNode } from "react";
import { useInView } from "./useInView";
import { cn } from "@/lib/utils";

/**
 * Which way the element travels in from.
 *
 * `up` is the default and the one to reach for. The other two exist for the
 * case that makes motion read as authored rather than applied: an element whose
 * direction agrees with what it means. On the corridor diagram "Money in"
 * arrives from the left and "Money out" leaves to the right, which is the same
 * statement the arcs between them are making. Used anywhere else they are just
 * a different fade, so they are opt-in.
 */
type RevealVariant = "up" | "left" | "right";

const variants: Record<RevealVariant, string> = {
  up: "",
  left: "reveal-left",
  right: "reveal-right",
};

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger, in milliseconds, applied when the element enters the viewport. */
  delay?: number;
  variant?: RevealVariant;
  /** Element to render. Defaults to a plain div. */
  as?: ElementType;
};

/**
 * Fades content in the first time it scrolls into view.
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
 *   3. `useInView` shows the element at once if `IntersectionObserver` is
 *      missing, and watches the viewport exactly — see the rules there.
 *
 * For a row or grid of siblings, prefer `Stagger`: it gives the group a rhythm
 * and costs one observer instead of one per card.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
  as: Tag = "div",
}: RevealProps) {
  const { ref, visible } = useInView<HTMLElement>();

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal", variants[variant], visible && "is-visible", className)}
    >
      {children}
    </Tag>
  );
}
