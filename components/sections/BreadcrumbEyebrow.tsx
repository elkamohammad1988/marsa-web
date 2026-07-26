import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = { label: string; href?: string };

type BreadcrumbEyebrowProps = {
  items: BreadcrumbItem[];
  className?: string;
  tone?: "ink" | "white";
  /**
   * Emit the matching `BreadcrumbList`. Disable only where a page already
   * emits its own — `/blog/[slug]` builds one with a full URL for every entry,
   * and two BreadcrumbLists on one page is a conflicting claim rather than a
   * stronger one.
   */
  emitSchema?: boolean;
};

/**
 * The visual breadcrumb, and the structured data that describes it.
 *
 * Eighteen pages rendered a trail and exactly one — `/blog/[slug]`, which does
 * not use this component — emitted `BreadcrumbList`. Rather than hand-write
 * the schema on the other seventeen, it is derived here from the same array
 * that is rendered. The two cannot drift apart, because there is only one of
 * them.
 *
 * The markup is a real `<ol>`. It was a flat run of `<span>`s, which reads to
 * a screen reader as a sentence of disconnected words rather than a position
 * in a hierarchy, and the current page was not announced as current.
 */
export function BreadcrumbEyebrow({
  items,
  className,
  tone = "ink",
  emitSchema = true,
}: BreadcrumbEyebrowProps) {
  return (
    <>
      {emitSchema && (
        <JsonLd data={breadcrumbSchema(items.map((i) => ({ name: i.label, path: i.href })))} />
      )}
      <nav
        aria-label="Breadcrumb"
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.16em]",
          tone === "white" ? "text-white/70" : "text-ink-muted",
          className,
        )}
      >
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, i) => {
            const last = i === items.length - 1;
            return (
              <li key={`${item.label}-${i}`} className="inline-flex items-center gap-2">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="rounded-sm underline-offset-4 hover:text-brand-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined}>{item.label}</span>
                )}
                {!last && <span aria-hidden>›</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
