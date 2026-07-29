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
    <section className="bg-surface-alt py-20 md:py-28">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">
            Something went wrong
          </p>
          <h1 className="mt-4 text-display-sm font-bold text-ink">We hit an unexpected error</h1>
          {/* No "contact our support team": there is no team, and the contact
              form reaches nobody. The same correction was made to the CTAs on
              /company/compliance and /company/about in #26.

              The second sentence used to read "Nothing you were doing has been
              lost, because nothing here is stored." That stopped being true
              when customer accounts landed: this is the root error boundary, so
              it also renders over /account, where a profile edit is a real
              write to Postgres. A blanket reassurance is exactly the kind of
              claim this project exists to not make — so it says what it can
              actually promise, which is that the failure was in rendering. */}
          <p className="mt-4 text-base text-ink-muted">
            Sorry about that — the page failed to render. Trying again usually resolves it,
            and nothing you had already saved is affected.
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
