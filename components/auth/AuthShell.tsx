import type { ReactNode } from "react";
import { Heading } from "@/components/ui/Heading";

/**
 * The card every authentication page sits in.
 *
 * One `<h1>` per page, supplied here, so the five pages cannot drift into
 * different heading levels — a document that starts at `h2` or repeats `h1` is
 * the most common way a well-styled page becomes hard to navigate with a
 * screen reader's heading list.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-card-lg border border-line bg-card p-6 shadow-card sm:p-8">
        <Heading level="h1" className="text-2xl md:text-3xl">
          {title}
        </Heading>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-ink-muted">{footer}</div>}
    </div>
  );
}
