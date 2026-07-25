import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // DENY, to agree with `frame-ancestors 'none'` below. Modern browsers
          // honour the stricter CSP directive and ignore this header entirely,
          // so the previous SAMEORIGIN was not a live weakness — but a header
          // pair that contradicts itself is a trap for the next reader.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            /*
             * Content-Security-Policy (audit S3).
             *
             * Previously this carried four directives and no resource controls
             * at all, so an injected script could load and talk to anything.
             *
             * `connect-src 'self'` is the directive that earns this change: it
             * is what stops an injected script exfiltrating form data from the
             * pages that collect PII. Every fetch the app makes is same-origin
             * (`/api/rates`, `/api/rates/history`, `/api/demo/events`, the three
             * form endpoints) — the FX provider is called server-side, never
             * from the browser — so 'self' costs nothing.
             *
             * `script-src` keeps 'unsafe-inline', deliberately. The audit
             * proposed `script-src 'self' 'sha256-<theme-script>'`, but the
             * theme script is not the only inline script on the page: the App
             * Router streams its RSC payload as inline
             * `self.__next_f.push([...])` blocks — 47 of them on the homepage
             * alone — whose contents differ per page and per build and so
             * cannot be hashed. A hash-only policy would block every one and
             * leave the site rendered but dead.
             *
             * The only way to a strict script-src here is a per-request nonce
             * set in middleware, which opts all 49 statically generated pages
             * into dynamic rendering. That is a real trade and it is the
             * maintainer's call, not one to make silently inside a security
             * batch. Recorded in PROJECT-PLAN.md.
             *
             * Note the footgun this avoids: a hash or nonce in script-src makes
             * browsers *ignore* 'unsafe-inline'. Adding the theme-script hash
             * "for completeness" would therefore break the site, not harden it.
             *
             * 'unsafe-eval' is absent, so eval and new Function stay blocked.
             */
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "frame-src 'none'",
            ].join("; "),
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
