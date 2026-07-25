import { cn } from "@/lib/utils";

/**
 * Loading placeholder. Uses the `.skeleton` shimmer from globals.css, which
 * disables its animation under `prefers-reduced-motion`. Always give it an
 * explicit size via `className`.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("skeleton block rounded-md", className)} />;
}
