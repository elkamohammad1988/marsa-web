import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type ScrollRegionProps = Omit<HTMLAttributes<HTMLDivElement>, "role" | "tabIndex"> & {
  /** What the region contains, announced when a keyboard lands on it. */
  label: string;
};

/**
 * A horizontally scrollable panel that a keyboard can actually reach.
 *
 * A bare `overflow-x-auto` div scrolls with a mouse wheel or a finger and is
 * unreachable by keyboard unless something inside it takes focus — which a
 * table of plain text never does. So the content past the right edge exists
 * for pointer users and does not exist for anyone navigating by keyboard.
 * axe reports it as `scrollable-region-focusable`, impact **serious**, and it
 * was live on `/tools/sepa-vs-swift` at 390px where the 640px-wide comparison
 * grid starts to scroll.
 *
 * `tabIndex={0}` puts the container in the tab order so arrow keys can scroll
 * it; `role="region"` plus a name is what makes the stop meaningful rather
 * than an unexplained focus ring on a div. `tests/scroll-regions.test.ts`
 * fails on any bare `overflow-x-auto` in `app/` or `components/`, because the
 * fix that matters is the one the next table gets for free.
 */
export function ScrollRegion({ label, className, ...props }: ScrollRegionProps) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "overflow-x-auto rounded-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        className,
      )}
      {...props}
    />
  );
}
