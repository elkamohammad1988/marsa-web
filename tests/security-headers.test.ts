import { describe, it, expect } from "vitest";
import nextConfig from "../next.config";

/**
 * Audit finding S3: the Content-Security-Policy carried four directives and no
 * resource controls, so an injected script could load from anywhere and talk
 * to anywhere.
 *
 * These assert the policy's contract rather than its exact text, so the header
 * can be reworded without breaking the suite — but the properties an attacker
 * would have to defeat cannot be dropped by accident.
 */

async function headerMap(): Promise<Map<string, string>> {
  const groups = await nextConfig.headers!();
  const entries = groups.flatMap((g) => g.headers.map((h) => [h.key, h.value] as const));
  return new Map(entries);
}

async function csp(): Promise<Map<string, string>> {
  const value = (await headerMap()).get("Content-Security-Policy");
  if (!value) throw new Error("no Content-Security-Policy header configured");
  const directives = value.split(";").map((d) => d.trim()).filter(Boolean);
  return new Map(
    directives.map((d) => {
      const [name, ...rest] = d.split(/\s+/);
      return [name, rest.join(" ")] as const;
    }),
  );
}

describe("Content-Security-Policy", () => {
  it("sets a default-src, so an unlisted resource type is denied rather than allowed", async () => {
    expect((await csp()).get("default-src")).toBe("'self'");
  });

  it("confines network calls to our own origin", async () => {
    // The directive that stops an injected script posting form data to a
    // third party. Every fetch the app makes is same-origin; the FX provider
    // is called server-side.
    expect((await csp()).get("connect-src")).toBe("'self'");
  });

  it("blocks plugins and framing entirely", async () => {
    const directives = await csp();
    expect(directives.get("object-src")).toBe("'none'");
    expect(directives.get("frame-ancestors")).toBe("'none'");
    expect(directives.get("frame-src")).toBe("'none'");
  });

  it("pins base-uri and form-action to our own origin", async () => {
    const directives = await csp();
    expect(directives.get("base-uri")).toBe("'self'");
    expect(directives.get("form-action")).toBe("'self'");
  });

  it("restricts images and fonts to our own origin", async () => {
    const directives = await csp();
    expect(directives.get("img-src")).toBe("'self' data:");
    expect(directives.get("font-src")).toBe("'self'");
  });

  it("never permits eval", async () => {
    const value = [...(await csp()).values()].join(" ");
    expect(value).not.toContain("unsafe-eval");
  });

  it("does not combine a hash or nonce with 'unsafe-inline' in script-src", async () => {
    // The footgun this guards: a browser IGNORES 'unsafe-inline' as soon as a
    // hash or nonce is present. Since the App Router streams its RSC payload
    // as inline self.__next_f.push blocks that cannot be hashed, adding a hash
    // "for completeness" would block every one of them and leave the site
    // rendered but dead. Either the policy keeps 'unsafe-inline' alone, or it
    // moves wholesale to a nonce — never both.
    const scriptSrc = (await csp()).get("script-src") ?? "";
    const hasInline = scriptSrc.includes("'unsafe-inline'");
    const hasHashOrNonce = /'(sha(256|384|512)-|nonce-)/.test(scriptSrc);
    expect(hasInline && hasHashOrNonce).toBe(false);
  });

  it("allows scripts only from our own origin, whatever else it permits", async () => {
    const scriptSrc = (await csp()).get("script-src") ?? "";
    expect(scriptSrc).toContain("'self'");
    // No third-party script host may creep in.
    expect(scriptSrc).not.toMatch(/https?:/);
  });
});

describe("framing headers agree with each other", () => {
  it("sets X-Frame-Options to DENY to match frame-ancestors 'none'", async () => {
    // SAMEORIGIN alongside frame-ancestors 'none' was not a live weakness —
    // browsers honour the stricter CSP directive — but a self-contradicting
    // header pair misleads the next reader.
    expect((await headerMap()).get("X-Frame-Options")).toBe("DENY");
  });
});

describe("the other security headers survive", () => {
  it("keeps nosniff, HSTS, referrer policy and permissions policy", async () => {
    const headers = await headerMap();
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
