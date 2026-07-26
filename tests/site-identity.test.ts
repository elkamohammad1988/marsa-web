import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { resolveSiteUrl, siteConfig } from "@/lib/site";

/**
 * The site must never assert an identity nobody holds.
 *
 * Three separate defaults used to do exactly that, all of them defensible in
 * isolation and none of them true: a canonical origin of
 * `https://www.marsa.money`, `support@`/`sales@`/`press@` at that same domain
 * rendered as live `mailto:` links, and `x.com/marsamoney` and friends emitted
 * in `Organization.sameAs` — which is a machine-readable claim to own those
 * accounts. The domain is not registered. Every one of those was a statement
 * about the world made by a fallback expression.
 *
 * The rule this file enforces is that the absence of configuration produces
 * *silence*, not a guess. It is a source-level guard as well as a behavioural
 * one, because the failure mode is a `?? "plausible-looking-string"` added back
 * later by someone who reasonably thinks a default is helpful.
 */

const ROOT = process.cwd();

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = path.join(dir, entry);
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.tsx?$/.test(entry)) out.push(rel);
  }
  return out;
}

/** Source with block and line comments removed — these files now *discuss* the
 *  strings they no longer emit, and a naive scan would count the explanation as
 *  the offence. */
function code(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("resolveSiteUrl", () => {
  it("prefers the explicitly configured origin", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://www.example.com" })).toBe(
      "https://www.example.com",
    );
  });

  it("strips trailing slashes, so absoluteUrl never doubles them", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://www.example.com///" })).toBe(
      "https://www.example.com",
    );
  });

  it("treats a whitespace-only value as unset", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "   " })).toBe("http://localhost:3000");
  });

  it("falls back to the Vercel deployment host, with a scheme added", () => {
    expect(resolveSiteUrl({ VERCEL_URL: "marsa-web-abc123.vercel.app" })).toBe(
      "https://marsa-web-abc123.vercel.app",
    );
  });

  it("prefers the browser-visible half of the Vercel pair", () => {
    // Client components only ever see NEXT_PUBLIC_-prefixed values, so if the
    // two ever disagree the one the browser can read has to win — otherwise a
    // client-rendered canonical and a server-rendered one differ.
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_VERCEL_URL: "preview.vercel.app",
        VERCEL_URL: "internal.vercel.app",
      }),
    ).toBe("https://preview.vercel.app");
  });

  it("falls back to the dev server, not to a domain nobody owns", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });

  it("is what siteConfig.url is built from", () => {
    expect(siteConfig.url).toBe(resolveSiteUrl());
  });
});

describe("no identity is asserted by default", () => {
  it("leaves every contact address and social profile empty when unconfigured", () => {
    // These are read at module load from an environment the test suite does not
    // set, so this asserts the shipped default rather than a mock of it.
    expect(Object.values(siteConfig.email)).toEqual(["", "", ""]);
    expect(Object.values(siteConfig.social)).toEqual(["", "", ""]);
    expect(Object.values(siteConfig.regulator)).toEqual(["", ""]);
  });

  const files = [...sourceFiles("app"), ...sourceFiles("lib"), ...sourceFiles("components")];

  it("hard-codes the unregistered domain nowhere in app, lib or components", () => {
    const offenders = files.filter((f) => /marsa\.money/i.test(code(f)));
    expect(offenders).toEqual([]);
  });

  it("gives no public-identity fallback a plausible-looking URL or address", () => {
    // Catches `process.env.NEXT_PUBLIC_WHATEVER ?? "https://…"` and the `||`
    // form. An empty string, a relative path (`/get-started`) or another
    // variable is fine — none of them claims to be a place that exists.
    //
    // Scoped to `NEXT_PUBLIC_` on purpose. That prefix is exactly the set of
    // values that describe *this site* to a visitor or a crawler, which is the
    // class that can lie. A server-side default naming a third party the code
    // genuinely calls — `FX_API_BASE ?? "https://api.frankfurter.dev/v1"` in
    // `lib/fx.ts` — is a dependency, not a claim about who we are.
    const pattern =
      /process\.env\.NEXT_PUBLIC_[A-Z0-9_]+\s*(?:\?\?|\|\|)\s*["'`](?:https?:\/\/|[^"'`\s]+@)/g;
    const offenders = files.flatMap((f) =>
      [...code(f).matchAll(pattern)].map((m) => `${f}: ${m[0]}`),
    );
    expect(offenders).toEqual([]);
  });
});
