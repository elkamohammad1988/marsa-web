"use client";

import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lights every `[data-glow]` surface inside it from wherever the cursor is.
 *
 * The effect itself is CSS — `.spotlight` in globals.css paints a radial
 * highlight at `var(--mx) var(--my)`. All this does is keep those two numbers
 * current, and it is built to be the cheapest possible way to do that:
 *
 *   - **One listener for a whole grid.** The handler sits on the wrapper and
 *     finds the card under the pointer with `closest("[data-glow]")`, rather
 *     than each card carrying its own listener and its own React state. A
 *     three-card row costs one subscription, not three.
 *   - **One write per frame.** Pointer events fire far faster than the screen
 *     refreshes, so the coordinates are stashed and flushed inside a single
 *     `requestAnimationFrame`. Writing a style property per event is how this
 *     kind of effect ends up costing layout work on every mousemove.
 *   - **No React state at all.** The vars are set on the DOM node directly.
 *     Routing them through `useState` would re-render the card subtree sixty
 *     times a second to move a gradient.
 *
 * Mouse pointers only. A touch `pointermove` would light a card the reader is
 * mid-scroll over and leave it lit, and a finger is on top of the thing it
 * would be illuminating anyway. Without a mouse — and with no script at all —
 * `.spotlight` falls back to a fixed light at the top centre, which is a
 * deliberate resting design rather than an absence.
 */
export function PointerGlow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const frame = useRef<number | null>(null);
  const pending = useRef<{ el: HTMLElement; x: number; y: number } | null>(null);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const handleMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;

    const target = event.target as HTMLElement | null;
    const surface = target?.closest?.("[data-glow]") as HTMLElement | null;
    if (!surface) return;

    const rect = surface.getBoundingClientRect();
    pending.current = {
      el: surface,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const next = pending.current;
      if (!next) return;
      next.el.style.setProperty("--mx", `${next.x}px`);
      next.el.style.setProperty("--my", `${next.y}px`);
    });
  }, []);

  return (
    <div className={cn(className)} onPointerMove={handleMove}>
      {children}
    </div>
  );
}
