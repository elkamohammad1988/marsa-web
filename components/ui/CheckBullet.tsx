import { cn } from "@/lib/utils";

/**
 * One item in an "included" list.
 *
 * ## One treatment, and the disc is gone
 *
 * The tick used to sit inside a filled 20px disc, and the component carried
 * three tones to colour it — `success` (a green wash), `brand` (a solid gold
 * fill) and `white`. Two of the three had no callers; all three call sites
 * asked for `brand`, so what actually shipped was a solid gold circle, six per
 * plan, three plans abreast: **eighteen filled gold discs** on the pricing page,
 * competing with the one gold fill that matters there, which is the button that
 * buys the plan.
 *
 * This palette spends gold on two things — the action to take and the number to
 * read. A list of things you get is neither, so the tick is now the glyph
 * itself, in the accent, with no container. It still marks the row and it no
 * longer shouts.
 *
 * The glyph keeps a fixed 1.25rem column so the labels align whether they run
 * to one line or two, and stays `aria-hidden`: "included" is what the list *is*,
 * and a screen reader announcing "tick" before every item is noise.
 */
export function CheckBullet({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("grid grid-cols-[1.25rem_1fr] items-start gap-x-3 text-sm", className)}>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        fill="none"
        className="mt-[0.28rem] h-3.5 w-3.5 text-brand-strong"
      >
        <path
          d="M2 6.2L4.6 8.8L10 3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}
