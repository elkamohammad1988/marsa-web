import Link from "next/link";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const href = (n: number) => (n === 1 ? basePath : `${basePath}?page=${n}`);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <Link
        href={prevDisabled ? "#" : href(currentPage - 1)}
        aria-disabled={prevDisabled}
        className={cn(
          "inline-flex h-9 items-center rounded-full border border-line px-4 text-sm",
          prevDisabled ? "pointer-events-none opacity-50" : "hover:bg-ink/5",
        )}
      >
        Previous
      </Link>
      {pages.map((n) => (
        <Link
          key={n}
          href={href(n)}
          aria-current={n === currentPage ? "page" : undefined}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full text-sm",
            n === currentPage
              ? "bg-brand text-on-brand"
              : "text-ink hover:bg-ink/5",
          )}
        >
          {n}
        </Link>
      ))}
      <Link
        href={nextDisabled ? "#" : href(currentPage + 1)}
        aria-disabled={nextDisabled}
        className={cn(
          "inline-flex h-9 items-center rounded-full border border-line px-4 text-sm",
          nextDisabled ? "pointer-events-none opacity-50" : "hover:bg-ink/5",
        )}
      >
        Next
      </Link>
    </nav>
  );
}
