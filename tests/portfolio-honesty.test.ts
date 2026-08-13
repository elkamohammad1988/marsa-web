import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The honesty programme applies to the artefacts, not only to the site.
 *
 * Every page of this site carries a concept-build disclosure, `/demo` opens
 * with a sandbox banner, and `RegulatedBand` describes the regulatory model of
 * a hypothetical product rather than asserting an authorisation nobody holds.
 * All of that was true while `scripts/capture.mjs` opened each capture with:
 *
 *     .fixed.bottom-4.left-4 { display: none !important; }
 *
 * — deleting the disclosure from all eight portfolio images on the reasoning
 * that a badge repeated across eight frames is chrome. That reasoning holds for
 * a screenshot read on the site. It inverts for these eight, because a
 * portfolio image is the only place this product is ever seen with no site
 * around it: no navigation, no footer, no badge to open, nothing to click.
 *
 * The result was that `01-hero.png` — the file used as the listing thumbnail —
 * showed a European IBAN, a €12,480.55 balance, an "Open An Account" button and
 * "Free plan available · Online application in about 5 minutes", with every
 * marker that this is a concept build removed by the capture script itself. The
 * site was scrupulously honest and its screenshots were not, and the screenshots
 * are what a reviewer sees first.
 *
 * These tests guard the artefact pipeline rather than the pixels. They cannot
 * assert what is in a PNG, so they assert the two things that made the PNG wrong
 * and would make it wrong again: a rule that hides the disclosure, and a capture
 * path that does not demand it.
 */

const ROOT = process.cwd();
const CAPTURE = path.join(ROOT, "scripts", "capture.mjs");
const source = readFileSync(CAPTURE, "utf8");

/**
 * Comments in this file quote the rule they exist to prevent, so a naive scan
 * would count the explanation as the offence. Strip comments before matching —
 * the same approach `tests/site-identity.test.ts` takes for the same reason.
 */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const executable = withoutComments(source);

describe("capture script keeps the concept disclosure in frame", () => {
  it("injects no rule that hides the disclosure", () => {
    // Any CSS the script injects that both names the disclosure's corner and
    // removes it from the render. Written broadly on purpose: `display: none`,
    // `visibility: hidden` and `opacity: 0` would all produce an unmarked image.
    const hides =
      /\.fixed\.bottom-4\.left-4[^}]*\{[^}]*(display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)/i;
    expect(executable).not.toMatch(hides);
  });

  it("requires the disclosure before every capture, and throws when it is absent", () => {
    expect(executable).toMatch(/async function requireDisclosure\s*\(/);
    expect(executable).toMatch(/await requireDisclosure\(page\)/);

    // A warning would let a full run finish and write eight unmarked images,
    // which is the failure mode this replaced. It has to be fatal.
    const body = executable.slice(executable.indexOf("async function requireDisclosure"));
    const fn = body.slice(0, body.indexOf("\n}\n") + 3);
    expect(fn).toMatch(/throw new Error/);
    expect(fn).not.toMatch(/console\.(warn|log)\s*\(/);
  });

  it("checks the element reads as a disclosure, not merely that something is there", () => {
    // Guarding on the selector alone would pass if the corner were reused for
    // an unrelated fixed element — a cookie prompt, a chat launcher — and the
    // images would go back to being unmarked without the test noticing.
    expect(executable).toMatch(/concept build/i);
  });

  /**
   * The guard has to be able to find the badge, and for a while it could not.
   *
   * It looked for `.fixed.bottom-4.left-4`, which is where the disclosure lived
   * until it was moved into the navbar — a fix for a real bug, since a floating
   * overlay was covering the primary call to action on `/pricing`. Nothing in
   * that change was wrong and nothing in it mentioned the capture script, but
   * the selector stopped matching and the next capture run aborted.
   *
   * That run aborting is the system working: the script throws rather than
   * writes, so the failure surfaced as an error instead of eight unmarked
   * images. But a class selector means any restyle can reach the honesty gate,
   * and the fix is a hook that exists to be found. This asserts the two ends
   * agree — the script cannot look for an attribute the badge does not carry.
   */
  it("looks for a hook the disclosure actually carries", () => {
    const selector = executable.match(/document\.querySelector\("(\[[\w-]+\])"\)/);
    expect(selector, "requireDisclosure no longer queries a plain attribute hook").
      not.toBeNull();

    const attribute = selector![1].slice(1, -1);
    const badge = readFileSync(
      path.join(ROOT, "components", "layout", "ConceptBadge.tsx"),
      "utf8",
    );
    expect(withoutComments(badge), `ConceptBadge carries no ${selector![1]}`).toMatch(
      new RegExp(`${attribute}=`),
    );
  });
});

describe("the eight portfolio images exist and are committable", () => {
  const EXPECTED = [
    "01-hero.png",
    "02-live-rates.png",
    "03-feature-account.png",
    "04-feature-convert.png",
    "05-analytics.png",
    "06-iban-validation.png",
    "07-mobile.png",
    "08-pricing.png",
  ];

  /**
   * `.gitignore` ignores `portfolio-screenshots/*` and then re-includes exactly
   * these eight. That pairing is what stops the directory growing back into the
   * 127-file contact sheet it used to be — and it is also what would silently
   * drop a renamed image from the repository, leaving a broken embed in the
   * README on GitHub. Assert the two lists are the same list.
   */
  it("is the same set the README embeds and .gitignore re-includes", () => {
    const ignore = readFileSync(path.join(ROOT, ".gitignore"), "utf8");
    const readme = readFileSync(path.join(ROOT, "README.md"), "utf8");

    for (const name of EXPECTED) {
      expect(ignore, `${name} missing from .gitignore allow-list`).toContain(
        `!portfolio-screenshots/${name}`,
      );
      expect(readme, `${name} not embedded in README`).toContain(
        `portfolio-screenshots/${name}`,
      );
    }
  });

  it("embeds no image the repository does not carry", () => {
    const readme = readFileSync(path.join(ROOT, "README.md"), "utf8");
    const embedded = [...readme.matchAll(/portfolio-screenshots\/([\w.-]+\.png)/g)].map(
      (m) => m[1],
    );
    expect(embedded.length).toBeGreaterThan(0);
    for (const name of new Set(embedded)) {
      expect(EXPECTED, `README embeds ${name}, which is not one of the eight`).toContain(name);
    }
  });

  /**
   * Skipped rather than failed when the directory is absent: these are build
   * artefacts of `npm run capture`, which needs Chrome and a running server, and
   * CI has neither. On a machine that has them, the size ceiling is worth
   * holding — a public repository carries its images forever in git history.
   */
  it("stays under the size ceiling that made the previous set a problem", () => {
    const dir = path.join(ROOT, "portfolio-screenshots");
    if (!existsSync(path.join(dir, EXPECTED[0]))) return;

    let total = 0;
    for (const name of EXPECTED) {
      const file = path.join(dir, name);
      if (!existsSync(file)) continue;
      const bytes = statSync(file).size;
      total += bytes;
      expect(bytes, `${name} is over 2 MB`).toBeLessThan(2 * 1024 * 1024);
    }
    expect(total, "the eight images exceed 8 MB in total").toBeLessThan(8 * 1024 * 1024);
  });
});
