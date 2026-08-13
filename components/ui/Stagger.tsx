"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { useInView } from "./useInView";
import { cn } from "@/lib/utils";

type StaggerProps = {
  children: ReactNode;
  className?: string;
  /**
   * Gap between one child arriving and the next, in milliseconds. Default 70.
   *
   * Long rows want a smaller step than short ones: six table rows at 70ms each
   * would still be arriving four hundred milliseconds after the reader started
   * looking at them, which stops being a rhythm and becomes a wait.
   */
  step?: number;
  /** Element to render. Defaults to a plain div. */
  as?: ElementType;
};

/**
 * Brings a row, grid or list in one child at a time.
 *
 * The reason to have this rather than wrapping each card in its own `Reveal`
 * is not only the observer count — though a three-card row costs one
 * subscription here instead of three. It is that a group revealed by
 * per-element observers arrives in *scroll* order, so on a wide screen where
 * the whole row crosses the viewport edge together, the cards fire at
 * indistinguishable moments and the row simply fades. The rhythm has to come
 * from the group deciding it, which means one observer and a delay per index.
 *
 * The delays are CSS (`.stagger > *:nth-child(n)` in globals.css), not inline
 * styles, so this composes with children it does not render and never clones an
 * element to reach it.
 *
 * The same three guarantees as `Reveal` apply, for the same reason: children
 * are visible by default, hidden only under `@media (scripting: enabled)`, and
 * carry a four-second CSS fallback. See `useInView` for the observer's rules.
 *
 * One deliberate detail in the CSS: the hidden state moves children with the
 * `translate` property rather than with `transform`. Almost everything this
 * wraps is a card that lifts on hover, and a `transform` here would be the same
 * property that hover wants to write — so the two would fight, and whichever
 * rule happened to be later in the file would win. Independent transform
 * properties compose instead of colliding, so the lift keeps working during and
 * after the reveal.
 */
export function Stagger({ children, className, step, as: Tag = "div" }: StaggerProps) {
  const { ref, visible } = useInView<HTMLElement>();

  return (
    <Tag
      ref={ref}
      style={step ? ({ "--stagger-step": `${step}ms` } as CSSProperties) : undefined}
      className={cn("stagger", visible && "is-visible", className)}
    >
      {children}
    </Tag>
  );
}
