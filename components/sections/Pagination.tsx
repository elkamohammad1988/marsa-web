import Link from "next/link";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

/**
 * Shared styling for the two end controls, so the disabled and enabled forms
 * are the same object to a reader and differ only where they must.
 */
/*
 * `rounded-lg`, not `rounded-full`: a pagination step is a control, and every
 * control on this site takes the 8px corner — see the radius note in
 * `tailwind.config.ts`. The page numbers below take the same, rather than being
 * the only round controls in the product.
 */
const STEP_CLASS = "inline-flex h-9 items-center rounded-lg border border-line px-4 text-sm";

/**
 * A Previous/Next control that has nowhere to go.
 *
 * Rendered as a `<span>`, not as a link, and that is the whole point. It was
 * previously `<Link href="#" aria-disabled className="pointer-events-none">`,
 * which is disabled for exactly one input device. `pointer-events-none` stops
 * the mouse; `aria-disabled` is an announcement and removes nothing. An anchor
 * with an `href` is still in the tab order, so a keyboard reader on page 1
 * tabbed to "Previous", pressed Enter, and navigated to `#` — which on this
 * page means losing their scroll position and their place in the list, with no
 * indication anything happened. Driving the blog with a keyboard is how this
 * surfaced; no test asserted it.
 *
 * `aria-hidden` is deliberately *not* used: the control is still meaningful as
 * text — it says which end of the range you are at — it simply is not
 * actionable. Removing the `href` takes it out of the tab order and out of a
 * screen reader's link list in one change, which is what "disabled" should
 * have meant here.
 *
 * The alternative, not rendering it at all, is what `/admin` does. Either is
 * correct; a stable layout is worth more on a paginated index a reader steps
 * through, and this keeps the row from reflowing between page 1 and page 2.
 */
function DisabledStep({ children }: { children: React.ReactNode }) {
  /*
   * An explicit colour, not `opacity-50`.
   *
   * Opacity is a blend against whatever happens to be behind the control, so
   * the contrast of the label is a property of the page rather than of the
   * component: `text-ink` at 50% measured **4.82:1** on the canvas and 4.77:1
   * on the alternating surface — one surface change away from failing, on a
   * value nobody chose. It also dimmed the border, so "inactive" was being said
   * twice and neither time on purpose.
   *
   * `text-ink-muted` is 8.36:1 on the canvas and 7.96:1 on the alternating
   * surface, and it is still a clear step down from the `text-ink` its live
   * sibling carries. That step is what marks the state; the legibility is not
   * the thing being spent to mark it.
   */
  return <span className={cn(STEP_CLASS, "text-ink-muted")}>{children}</span>;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const href = (n: number) => (n === 1 ? basePath : `${basePath}?page=${n}`);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      {prevDisabled ? (
        <DisabledStep>Previous</DisabledStep>
      ) : (
        <Link href={href(currentPage - 1)} rel="prev" className={cn(STEP_CLASS, "hover:bg-ink/5")}>
          Previous
        </Link>
      )}

      {pages.map((n) => (
        <Link
          key={n}
          href={href(n)}
          aria-current={n === currentPage ? "page" : undefined}
          aria-label={`Page ${n}`}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm",
            n === currentPage ? "bg-brand text-on-brand" : "text-ink hover:bg-ink/5",
          )}
        >
          {n}
        </Link>
      ))}

      {nextDisabled ? (
        <DisabledStep>Next</DisabledStep>
      ) : (
        <Link href={href(currentPage + 1)} rel="next" className={cn(STEP_CLASS, "hover:bg-ink/5")}>
          Next
        </Link>
      )}
    </nav>
  );
}
