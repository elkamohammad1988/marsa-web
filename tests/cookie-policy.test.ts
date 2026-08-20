import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { ADMIN_COOKIE } from "@/lib/admin-session";
import { SESSION_COOKIE } from "@/lib/auth-session";

/**
 * The cookie policy has to describe *this* site.
 *
 * It did not. It told every reader that "our cookie banner lets you accept or
 * reject non-essential cookies" and that they could "change your choice at any
 * time using the 'Cookie settings' link in the footer" — and there was no
 * banner, no footer link, and nothing anywhere that wrote a consent decision.
 * `lib/consent.ts` reads one, and `DemoFlow` honours it, but the component that
 * used to record it was removed and the reader was still being sent to it.
 *
 * That is worse than ordinary stale copy for two reasons. A visitor who wants
 * to exercise the control is sent to look for something that is not there, and
 * a cookie policy is a legal document: describing a consent mechanism that does
 * not exist is a false statement about how personal data is handled, not a
 * marketing overstatement.
 *
 * So these assertions derive what is true from the code rather than restating
 * it. A policy claim only passes if the thing it names can be found.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = path.join(dir, entry);
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.tsx?$/.test(entry)) out.push(rel);
  }
  return out;
}

const POLICY_PATH = path.join("app", "legal", "cookies", "page.tsx");
const policy = read(POLICY_PATH);

/** Everything the site renders, minus the policy that describes it. */
const renderedSource = [...sourceFiles("app"), ...sourceFiles("components")]
  .filter((f) => f !== POLICY_PATH)
  .map(read)
  .join("\n");

/**
 * The same, plus `lib/`. Cookies are written by `lib/auth-session.ts` as well
 * as by the admin routes, so a scan of the UI alone would miss one and let the
 * "only two cookies" assertion pass for the wrong reason.
 */
const allSource = [renderedSource, ...sourceFiles("lib").map(read)].join("\n");

describe("the cookie policy promises no control that does not exist", () => {
  it("claims a consent banner only if something renders one", () => {
    // A banner is a component with a name, so its absence is checkable. The
    // check runs on the rendered source rather than on a hard-coded verdict, so
    // adding a real banner later makes the claim legal again automatically.
    const bannerExists = /CookieBanner|ConsentBanner/i.test(renderedSource);
    if (!bannerExists) {
      // Only an affirmative claim is an offence. "There is no cookie banner on
      // this site" names the same words and is the correction, not the fault —
      // so match the possessive and the promise, not the noun.
      expect(policy, "policy describes a cookie banner that nothing renders").not.toMatch(
        /(our|the|a) cookie banner (lets|allows|will|appears|gives)/i,
      );
      expect(policy).not.toMatch(/when you first visit[^"]*banner/i);
    }
  });

  it("points at a cookie-settings control only if one exists", () => {
    const controlExists = /cookie settings/i.test(renderedSource);
    if (!controlExists) {
      expect(policy, "policy sends the reader to a control that is not there").not.toMatch(
        /cookie settings/i,
      );
    }
  });

  it("claims a stored consent decision only if something records one", () => {
    // `lib/consent.ts` can read a decision; nothing writes one. A policy that
    // says consent is remembered is describing the half that was deleted.
    const recordsConsent = /localStorage[\s\S]{0,80}setItem|setConsent|writeConsent/.test(
      renderedSource,
    );
    if (!recordsConsent) {
      expect(policy, "policy claims consent is stored, but nothing stores it").not.toMatch(
        /after you have given consent|remembering your cookie choices/i,
      );
    }
  });
});

describe("the cookie policy describes the cookies that are actually set", () => {
  /** Every distinct cookie name the application writes. */
  const cookieNames = new Set(
    [...allSource.matchAll(/cookies\.set\(\s*([A-Za-z_$][\w$]*|"[^"]*")/g)]
      .map((m) => m[1])
      .map((token) =>
        token === "ADMIN_COOKIE"
          ? ADMIN_COOKIE
          : token === "SESSION_COOKIE"
            ? SESSION_COOKIE
            : token.replace(/"/g, ""),
      ),
  );

  it("finds the cookies to describe", () => {
    // If this ever empties, the assertions below would pass vacuously.
    expect(cookieNames.size).toBeGreaterThan(0);
  });

  it("sets only the two session cookies", () => {
    // Both are strictly necessary, which is the whole reason the policy can say
    // there is nothing to consent to. A third cookie would change that answer,
    // and this is what makes someone revisit the policy when one is added.
    expect([...cookieNames].sort()).toEqual([ADMIN_COOKIE, SESSION_COOKIE].sort());
  });

  it("claims no analytics or marketing cookie category", () => {
    // Neither exists. Listing them as categories "set only with your consent"
    // implies a consent mechanism, which is how the banner claim survived.
    expect(policy).not.toMatch(/^\s*"(Analytics|Marketing) —/m);
  });
});

describe("the demo telemetry is described as what it is", () => {
  const demo = read(path.join("components", "demo", "DemoFlow.tsx"));

  it("mints its identifier in memory, with no cookie and no storage", () => {
    // The policy says the identifier is "created fresh each time the page loads,
    // and gone when the tab closes". That is only true while it comes from
    // component state — a move to localStorage or a cookie would make the
    // policy wrong without touching the policy.
    expect(demo).toMatch(/useState\(\s*\(\)\s*=>[\s\S]{0,120}randomUUID\(\)/);
    expect(demo).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });

  it("still honours Do Not Track, as the policy says it does", () => {
    expect(demo).toMatch(/navigator\.doNotTrack/);
    expect(policy).toMatch(/Do Not Track/i);
  });
});
