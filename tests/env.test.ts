import { describe, it, expect, vi, afterEach } from "vitest";
import { validateEnvironment, assertEnvironment, EnvironmentError } from "@/lib/env";

/**
 * Audit finding B8: every configuration read is a presence check with a silent
 * fallback, so a production deploy can be misconfigured several different ways
 * and still boot, serve traffic and look healthy.
 *
 * The cases below are the ones a presence check cannot catch — a value that is
 * present but wrong.
 */

const VALID = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "a-service-role-key",
  RESEND_API_KEY: "re_key",
  RESEND_FROM: "Marsa <noreply@marsa.money>",
  NEXT_PUBLIC_SITE_URL: "https://www.marsa.money",
};

/** The variables reported as problematic. */
function problems(env: Record<string, string | undefined>): string[] {
  return validateEnvironment(env).map((i) => i.variable).sort();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a consistent environment is accepted", () => {
  it("accepts a fully configured production environment", () => {
    expect(validateEnvironment(VALID)).toEqual([]);
  });

  it("accepts an entirely empty environment", () => {
    // Zero-configuration local development is a supported mode, not an error.
    expect(validateEnvironment({})).toEqual([]);
  });

  it("accepts a bare sender address as well as the display form", () => {
    expect(problems({ ...VALID, RESEND_FROM: "noreply@marsa.money" })).toEqual([]);
  });
});

describe("database configuration", () => {
  it("rejects a URL that is not absolute http(s)", () => {
    for (const SUPABASE_URL of ["htps://typo.supabase.co", "project.supabase.co", "/rest/v1"]) {
      expect(problems({ ...VALID, SUPABASE_URL }), SUPABASE_URL).toContain("SUPABASE_URL");
    }
  });

  it("rejects the placeholder left in .env.example", () => {
    const env = { ...VALID, SUPABASE_URL: "https://xxxxxxxxxxxx.supabase.co" };
    expect(validateEnvironment(env)[0].problem).toMatch(/placeholder/);
  });

  it("rejects half the pair, in either direction", () => {
    // Half the pair silently downgrades storage to the non-durable file store,
    // which is how leads went missing (B1).
    const { SUPABASE_SERVICE_ROLE_KEY: _key, ...urlOnly } = VALID;
    expect(problems(urlOnly)).toContain("SUPABASE_SERVICE_ROLE_KEY");

    const { SUPABASE_URL: _url, ...keyOnly } = VALID;
    expect(problems(keyOnly)).toContain("SUPABASE_URL");
  });

  it("refuses a service-role key exposed to the browser", () => {
    const env = { ...VALID, NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "leaked" };
    const issue = validateEnvironment(env).find(
      (i) => i.variable === "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    );
    expect(issue?.problem).toMatch(/must not exist/);
    expect(issue?.problem).toMatch(/row-level security/);
  });

  it("treats a whitespace-only value as unset rather than as configured", () => {
    expect(problems({ SUPABASE_URL: "   ", SUPABASE_SERVICE_ROLE_KEY: "   " })).toEqual([]);
  });
});

describe("email configuration", () => {
  it("rejects an API key with no sender, which sends nothing and says nothing", () => {
    const { RESEND_FROM: _from, ...noFrom } = VALID;
    expect(problems(noFrom)).toContain("RESEND_FROM");
  });

  it("rejects a sender with no API key", () => {
    const { RESEND_API_KEY: _key, ...noKey } = VALID;
    expect(problems(noKey)).toContain("RESEND_API_KEY");
  });

  it("rejects a sender that is not an address", () => {
    for (const RESEND_FROM of ["noreply", "Marsa <not-an-email>", "Marsa noreply@marsa.money"]) {
      expect(problems({ ...VALID, RESEND_FROM }), RESEND_FROM).toContain("RESEND_FROM");
    }
  });

  it("rejects a malformed recipient", () => {
    expect(problems({ ...VALID, RESEND_TO: "team" })).toContain("RESEND_TO");
  });
});

describe("site configuration", () => {
  it("rejects a site URL that is not absolute", () => {
    expect(problems({ NEXT_PUBLIC_SITE_URL: "www.marsa.money" })).toContain(
      "NEXT_PUBLIC_SITE_URL",
    );
  });

  it("accepts a localhost origin for local development", () => {
    expect(problems({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" })).toEqual([]);
  });
});

describe("every problem is reported at once", () => {
  it("does not stop at the first failure", () => {
    // One redeploy per misconfiguration is the failure mode this avoids.
    const env = {
      SUPABASE_URL: "not-a-url",
      RESEND_API_KEY: "re_key",
      NEXT_PUBLIC_SITE_URL: "also-not-a-url",
    };
    expect(problems(env)).toEqual([
      "NEXT_PUBLIC_SITE_URL",
      "RESEND_FROM",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
    ]);
  });

  it("names the variable and the problem in every message", () => {
    for (const issue of validateEnvironment({ SUPABASE_URL: "not-a-url" })) {
      expect(issue.variable).toMatch(/^[A-Z0-9_]+$/);
      expect(issue.problem.length).toBeGreaterThan(10);
    }
  });
});

describe("assertEnvironment", () => {
  it("throws in production, listing every problem", () => {
    const env = { ...VALID, NODE_ENV: "production", SUPABASE_URL: "not-a-url" };
    expect(() => assertEnvironment(env)).toThrow(EnvironmentError);
    expect(() => assertEnvironment(env)).toThrow(/SUPABASE_URL/);
  });

  it("warns rather than throwing outside production", () => {
    // Zero-configuration development must keep working.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = { NODE_ENV: "development", SUPABASE_URL: "not-a-url" };

    expect(() => assertEnvironment(env)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain("SUPABASE_URL");
  });

  it("is silent when the environment is consistent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => assertEnvironment({ ...VALID, NODE_ENV: "production" })).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it("accepts an empty production environment, leaving storage to enforce its own rule", () => {
    // createStore() already refuses a non-durable store in production (B1).
    // Duplicating that here would report the same fault twice with different
    // wording.
    expect(() => assertEnvironment({ NODE_ENV: "production" })).not.toThrow();
  });
});
