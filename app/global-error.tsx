"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/observability";

/**
 * The boundary for errors `app/error.tsx` cannot catch.
 *
 * `error.tsx` renders *inside* the root layout, so it is useless for the one
 * class of failure that matters most: an error thrown by the root layout
 * itself, or by anything it renders before `children` — the fonts, the
 * navbar, the JSON-LD, `siteConfig`. When that happens Next.js has no shell to
 * put a boundary in, and without this file the visitor gets the browser's
 * default error page: unstyled, unbranded, and with no way back.
 *
 * Two consequences shape everything below.
 *
 * **It must supply its own `<html>` and `<body>`.** It replaces the root
 * layout rather than nesting inside it, so the document shell is this file's
 * job. Missing that is the usual way this file ships broken.
 *
 * **It must not depend on anything that might be what broke.** No `Container`,
 * no `Button`, no design tokens, no `next/font` — the palette lives in a
 * stylesheet imported by the layout that just failed, so `bg-canvas` would be
 * an unstyled white page at exactly the wrong moment. The colours below are
 * therefore literal hex copies of `--canvas`, `--ink`, `--ink-muted` and
 * `--brand`, written inline. They are the one place in this repository where a
 * hard-coded colour is correct, and the trade is deliberate: a page that
 * cannot go out of date is worth less than a page that cannot fail to render.
 *
 * `style-src` in the CSP already allows `'unsafe-inline'`, so the inline
 * `style` attributes need no policy change.
 */

const canvas = "#0b1216";
const ink = "#e9f1f4";
const inkMuted = "#9bb0b8";
const inkSubtle = "#a8bdc4";
const brand = "#d4af37";
/* The label that rides on `brand`. Gold is a light fill, so this is the
   near-black `--on-brand` rather than white — white on #d4af37 is 2.1:1. */
const onBrand = "#0c1114";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Same seam as `app/error.tsx`, tagged differently: an error caught here
    // means the shell itself failed, which is a materially worse signal than a
    // page failing inside a working shell.
    captureException(error, { event: "app.render.root", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          backgroundColor: canvas,
          color: ink,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: brand,
            }}
          >
            Something went wrong
          </p>

          <h1
            style={{
              margin: "1rem 0 0",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              fontWeight: 700,
            }}
          >
            This page could not be loaded
          </h1>

          <p style={{ margin: "1rem 0 0", fontSize: "1rem", lineHeight: 1.6, color: inkMuted }}>
            The error happened before the page could be built, so reloading is the
            best first thing to try.
          </p>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                appearance: "none",
                border: 0,
                cursor: "pointer",
                borderRadius: "999px",
                padding: "0.75rem 1.5rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: onBrand,
                backgroundColor: brand,
              }}
            >
              Try again
            </button>
            {/*
              A real anchor, not `next/link`, and the lint rule is disabled
              rather than obeyed. `Link` does a client-side transition through
              the same router and the same root layout that just threw — the
              most likely outcome is landing straight back in this boundary. A
              hard navigation is the only "back to home" that can actually
              escape a broken shell, which is the entire situation this file
              exists to handle.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                borderRadius: "999px",
                padding: "0.75rem 1.5rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: ink,
                textDecoration: "none",
                border: `1px solid ${inkSubtle}`,
              }}
            >
              Back to home
            </a>
          </div>

          {error.digest && (
            <p style={{ margin: "1.5rem 0 0", fontSize: "0.75rem", color: inkSubtle }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
