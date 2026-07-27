import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A message about a form as a whole.
 *
 * The distinction that matters is not the colour. `role="alert"` interrupts a
 * screen reader immediately, which is right for "that did not work" and wrong
 * for confirming something the reader just asked for — an interruption on
 * every success is how people learn to ignore the announcements. So a failure
 * is an alert and a success is a status, and the two tones exist so that is
 * decided once rather than at each call site.
 */
export function FormAlert({
  tone,
  children,
  className,
}: {
  tone: "error" | "success";
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-danger/40 bg-danger/[0.08] text-danger"
          : "border-success/40 bg-success/[0.08] text-success",
        className,
      )}
    >
      {children}
    </p>
  );
}
