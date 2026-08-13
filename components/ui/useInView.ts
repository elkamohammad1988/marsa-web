"use client";

import { useEffect, useRef, useState } from "react";

/**
 * `false` until the element has been scrolled into view, then `true` forever.
 *
 * **This hook can only ever make content appear sooner, never keep it hidden.**
 * Everything it drives — `Reveal`, `Stagger` — paints by default in CSS and is
 * hidden only inside `@media (scripting: enabled)`, so the hook's job is to
 * shorten a wait, never to grant permission to exist. Two behaviours here
 * enforce the same idea from the JavaScript side:
 *
 *   - **No observer means visible.** If `IntersectionObserver` is missing the
 *     element is shown at once rather than waiting for an event that can never
 *     arrive.
 *   - **The viewport is watched exactly.** `rootMargin: "0px"`, `threshold: 0`.
 *     A negative bottom margin shrinks the observation area, so anything
 *     sitting in that strip on a page already scrolled to its end never
 *     intersects and never reveals — the previous `-12%` could strand the last
 *     element on a short page permanently. Revealing a fraction of a second
 *     earlier is not worth that.
 *
 * It lives in its own module because there are now two components that need
 * it, and an observer whose safety rules are written twice is an observer whose
 * safety rules will eventually differ. `tests/animation-visibility.test.ts`
 * asserts the properties here and that nothing else builds its own.
 */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
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

  return { ref, visible } as const;
}
