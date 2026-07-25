import Link from "next/link";
import { cn } from "@/lib/utils";

type BreadcrumbEyebrowProps = {
  items: { label: string; href?: string }[];
  className?: string;
  tone?: "ink" | "white";
};

export function BreadcrumbEyebrow({ items, className, tone = "ink" }: BreadcrumbEyebrowProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]",
        tone === "white" ? "text-white/70" : "text-ink-muted",
        className,
      )}
    >
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {item.href ? (
            <Link href={item.href} className="hover:text-brand-strong">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {i < items.length - 1 && <span aria-hidden>›</span>}
        </span>
      ))}
    </nav>
  );
}
