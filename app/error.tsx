"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { captureException } from "@/lib/observability";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // `digest` is the hash Next.js puts in the server log for this same error,
    // and it is already shown to the visitor below — capturing it is what
    // joins the two together.
    captureException(error, { event: "app.render", digest: error.digest });
  }, [error]);

  return (
    <section className="bg-surface-cream py-20 md:py-28">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">
            Something went wrong
          </p>
          <h1 className="mt-4 text-display-sm font-bold text-ink">We hit an unexpected error</h1>
          <p className="mt-4 text-base text-ink-muted">
            Sorry about that. You can try again, or head back to the homepage. If the problem
            persists, please contact our support team.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" variant="primary" size="lg" onClick={reset}>
              Try again
            </Button>
            <Button href="/" variant="outline" size="lg">
              Back to home
            </Button>
          </div>
          {error.digest && (
            <p className="mt-6 text-xs text-ink-subtle">Reference: {error.digest}</p>
          )}
        </div>
      </Container>
    </section>
  );
}
