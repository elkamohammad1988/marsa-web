import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * A small piece of metadata attached to an object.
 *
 * There is exactly one caller left — the "Most popular" mark on a pricing plan
 * — and that is the point rather than an accident. This used to render five
 * tones on eyebrows, section labels and category names all over the site, which
 * is how a badge stops meaning anything: a filled capsule above a headline is a
 * button that does nothing when pressed, and the reader learns to ignore the
 * shape. Every one of those is now set as a small-caps label in the accent.
 *
 * What is left is the case a badge is actually for: a short fact about the
 * thing it sits on, that the thing's own copy does not already state. Four
 * tones went with the call sites that used them (`deep`, `alt`, `card`, `ink`);
 * `ink` in particular was a near-white pill, the only white fill on its page.
 *
 * `rounded-md`, not `rounded-full`. A capsule is the shape of a control on this
 * site — see the radius note in `tailwind.config.ts` — and a badge is a label.
 */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-brand px-2.5 py-1 text-xs font-medium tracking-wide text-on-brand",
        className,
      )}
      {...props}
    />
  );
}
