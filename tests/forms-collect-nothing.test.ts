import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The public forms validate and transmit nothing.
 *
 * The old success screen said "Application received — our onboarding team will
 * email you within one business day with your next steps and
 * identity-verification link." Nobody was going to email anybody:
 * `RESEND_API_KEY` is unset, so `notifySubmission` returned `{sent:false}`
 * silently. Meanwhile the visitor's name, email, country and company were
 * written to Postgres.
 *
 * That is a false statement of fact made to a real person on a public URL, and
 * it created a live data-protection obligation for a project with no operator
 * to discharge it. This build has no operator by design.
 *
 * The intake pipeline stays in the repository and stays tested — see
 * `tests/api-forms.test.ts`, which still drives the real `createStore` and
 * `PostgresSubmissionStore`. It is simply not reachable from the UI. These
 * tests are what stop it being quietly re-wired.
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

/** Comments describe the pipeline these files deliberately do not call. */
function code(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const FORMS = [
  "components/forms/GetStartedForm.tsx",
  "components/forms/ContactForm.tsx",
  "components/forms/NewsletterForm.tsx",
];

describe("no on-site form transmits anything", () => {
  it.each(FORMS)("%s issues no request", (file) => {
    const source = code(file);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest|navigator\.sendBeacon/);
  });

  it.each(FORMS)("%s posts to no API route", (file) => {
    expect(code(file)).not.toMatch(/["'`]\/api\//);
  });

  it("leaves no client that would call the intake endpoints", () => {
    // `useSubmit.ts` mapped 422/429/503 responses for the three forms. With
    // nothing calling those endpoints from the browser, a client for them is
    // exactly the dead code this repository has spent seven batches removing.
    const clients = [...sourceFiles("components"), ...sourceFiles("app")].filter((f) =>
      /["'`]\/api\/(leads|contact|subscribe)/.test(code(f)),
    );
    expect(clients).toEqual([]);
  });
});

describe("no form promises a reply", () => {
  const PROMISES = [
    /will email/i,
    /within one business day/i,
    /we'?ll be in touch/i,
    /identity-verification link/i,
    /you'?re subscribed/i,
    /application received/i,
    /message sent/i,
  ];

  it.each(FORMS)("%s makes no undeliverable promise", (file) => {
    // Comment-stripped: these files now *quote* the copy they replaced, to
    // record why. A comment is not shown to anybody, so matching one would
    // fail the correct code for explaining itself.
    const source = code(file);
    for (const promise of PROMISES) {
      expect(source, `${file} still says ${promise}`).not.toMatch(promise);
    }
  });

  it("tells the visitor their details were discarded", () => {
    const notice = readFileSync(
      path.join(ROOT, "components", "forms", "DemoSubmissionNotice.tsx"),
      "utf8",
    );
    expect(notice).toMatch(/discarded/i);
    expect(notice).toMatch(/nothing was (sent|stored)/i);
    expect(notice).toMatch(/nobody will contact you/i);
  });

  /**
   * The page around the form counts too.
   *
   * The scan above covered the three form components and nothing else, so
   * `/contact` kept a highlight reading *"Fast replies — We answer every
   * enquiry within one business day"* — the same sentence this file deletes
   * from the lead form, sitting six inches above a form that discards what you
   * type. The component was clean and the page was not, and no gate looked at
   * the page.
   *
   * The host set is derived rather than listed: any file that renders one of
   * the three forms. A fourth page that adds a form inherits the rule by
   * existing, which is the only version of this that stays true.
   */
  const FORM_COMPONENTS = ["GetStartedForm", "ContactForm", "NewsletterForm"];

  const hosts = [...sourceFiles("app"), ...sourceFiles("components")].filter((f) => {
    if (FORMS.includes(f.replaceAll("\\", "/"))) return false;
    const source = code(f);
    return FORM_COMPONENTS.some((name) => new RegExp(`<${name}[\\s/>]`).test(source));
  });

  it("finds the pages that host a form", () => {
    // A derived list that quietly matched nothing would pass every assertion
    // below without checking anything.
    expect(hosts.length).toBeGreaterThan(0);
  });

  it.each(hosts)("%s makes no undeliverable promise either", (file) => {
    const source = code(file);
    for (const promise of PROMISES) {
      expect(source, `${file} still says ${promise}`).not.toMatch(promise);
    }
  });
});

describe("the rules a visitor sees are the real ones", () => {
  it.each(FORMS)("%s validates through lib/validation", (file) => {
    // Not a mock of the rules: the same module the API route uses as its
    // source of truth, so what a visitor is told about their input is exactly
    // what the server would have said.
    expect(code(file)).toMatch(/@\/lib\/validation/);
  });

  it.each(FORMS)("%s still honours the honeypot", (file) => {
    expect(code(file)).toMatch(/hp/);
  });
});

/**
 * No page may claim the build collects no personal data.
 *
 * It was true, sitewide, until customer accounts shipped — and then it stayed
 * on `/legal/privacy` and `/company/compliance`, the two pages where a stale
 * data-protection sentence is least harmless. Registration writes an email
 * address (and an optional name) to Postgres, so "collects no personal data"
 * is now false everywhere it appears.
 *
 * The narrower true claim — that the *marketing forms* discard what you type —
 * is the one the rest of this file defends, and it is unaffected. So this
 * asserts the difference: a sentence may say the forms collect nothing, and
 * may not say the build does.
 */
describe("no page claims the build collects nothing", () => {
  const CLAIMS = [
    /collects no personal data/i,
    /no data (is )?collected/i,
    /nothing (here )?is stored\b/i,
  ];

  const files = [...sourceFiles("app"), ...sourceFiles("components")].filter(
    // This file names the strings in order to forbid them.
    (f) => !f.includes("forms-collect-nothing"),
  );

  it.each(files)("%s", (file) => {
    const source = code(file);
    // Comments explain why the claim was removed; only rendered copy matters.
    const rendered = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const found = CLAIMS.filter((rx) => rx.test(rendered)).map((rx) => rx.source);
    expect(found).toEqual([]);
  });
});
