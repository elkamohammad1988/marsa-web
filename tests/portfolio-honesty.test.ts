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

describe("the seven portfolio images exist and are committable", () => {
  /**
   * Seven, not eight. `08-pricing.png` was the concept product's own
   * subscription tiers — €4.99 a month for something nobody can buy — and it
   * was carried on the argument that the page is built to the same bar as the
   * rest of the app, which is true and is not what the image communicates.
   *
   * Two things decided it. A listing that sells application development should
   * not lead a reviewer through a euro price list for a financial product; the
   * caption defending that image had grown longer than the caption describing
   * it, and an image that needs a disclaimer to be safe is an image doing
   * negative work. And it was the one frame in the set cut through a card,
   * ending mid-way down a feature list, so it argued for less care than the
   * repository it advertises.
   */
  const EXPECTED = [
    "01-hero.png",
    "02-live-rates.png",
    "03-feature-account.png",
    "04-feature-convert.png",
    "05-analytics.png",
    "06-iban-validation.png",
    "07-mobile.png",
  ];

  /**
   * `.gitignore` ignores `portfolio-screenshots/*` and then re-includes exactly
   * these seven. That pairing is what stops the directory growing back into the
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
      expect(EXPECTED, `README embeds ${name}, which is not one of the seven`).toContain(name);
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

/**
 * Every number this project quotes about itself has to be the same number.
 *
 * This is the failure mode the repository has been caught by three times, and
 * the only one that attacks its central claim directly. An early `README.md`
 * advertised "94 passing tests" against an actual 367. A later `CASE-STUDY.md`
 * claimed 655 when the real figure had passed 1,000. At the point this test was
 * written, six documents said 1,530 and `scripts/record-demo.mjs` — which burns
 * its number into a video frame — said 1,558, while the suite returned neither.
 *
 * Each of those was one edit away from correct and nothing failed, because a
 * number in prose is invisible to `tsc`, to ESLint, and to every other test
 * here. For a project whose entire argument is "the claims are checkable", a
 * silently stale claim is worse than a missing one: it is the specific error
 * that invalidates the argument rather than merely weakening it.
 *
 * What this can and cannot do. It cannot know the suite's own total — a run
 * counting itself would need the run to finish first. It asserts the property
 * that is actually achievable and that catches every real drift: **every
 * artefact quotes the same figure.** Re-measure with `npx vitest run`, update
 * one place, and this fails until the rest agree. `scripts/record-demo.mjs` is
 * in the list because its comment already promised this test existed.
 */
describe("the test count is one number everywhere it is claimed", () => {
  const CLAIM_SITES = [
    "README.md",
    "CASE-STUDY.md",
    path.join("docs", "DEPLOYMENT.md"),
    path.join("docs", "UPWORK-LISTING.md"),
    path.join("scripts", "record-demo.mjs"),
  ];

  /**
   * The shapes a test count is actually written in, rather than "a number near
   * the word test".
   *
   * Proximity was the first attempt and it read `| Responsive (390 / 1440) |` as
   * a claim of 1,440 tests, because the next table row happens to be the one
   * that says "Unit tests". A viewport width is not a count, and a rule that
   * cannot tell them apart either fails forever or trains someone to reword a
   * correct sentence to appease it. These three patterns match the claim and not
   * its neighbours.
   */
  const CLAIM_SHAPES = [
    /\b(\d{4})\s*\/\s*\d{4}\b/g, //            1560 / 1560 passing
    /\b(\d{4})\s+(?:unit\s+|passing\s+|automated\s+)*(?:tests?|checks?)\b/gi, // 1560 unit tests, 1,560 automated checks
    /\btests?(?:_?count)?\s*[:=]\s*"?(\d{4})"?/gi, // tests: "1560", TEST_COUNT = "1,560"
  ];
  /*
   * `(?:_?count)?` is not decoration. Without it this shape required the `:` or
   * `=` to follow "test" immediately, so `const TEST_COUNT = "1,561"` in
   * `scripts/record-demo.mjs` never matched — the `_` ended the word. That file
   * was listed as a claim site and read on every run, and the one claim it
   * actually contains was the one thing here that could not see it. It sat a
   * full count behind the rest of the project until an audit read it by eye,
   * which is precisely the failure the constant's own comment says it exists to
   * prevent: a stale number burnt into a frame of video.
   *
   * A blind spot in a gate is worse than no gate, because the green tick is
   * read as coverage. Widening the shape rather than adding a fourth keeps one
   * rule per way a count is written.
   *
   * `checks?` alongside `tests?` is the same lesson, found by checking that the
   * fix above had actually worked. `README.md`, `docs/DEPLOYMENT.md` and
   * `docs/UPWORK-LISTING.md` every one write the figure as "1,703 **automated
   * checks**" — deliberately, because the suite is not only unit tests — and
   * the shape required the literal word "test". Three of the five sites listed
   * below were therefore read on every run and asserted nothing. The rule this
   * file states is "every artefact quotes the same figure"; until now it held
   * for two of them.
   *
   * The general form of both bugs: a gate that names its inputs and then
   * matches a narrower shape than its inputs are written in reports the
   * *intersection* as the whole, and the sites it silently drops are exactly
   * the ones free to drift. If a claim site is added below, check it appears
   * in the probe rather than assuming the shapes cover it.
   */

  /**
   * Thousands separators normalised so `1,560` and `1560` are the same claim;
   * ISO dates removed so `**Tests (2026-08-10)**` is not read as a count; and
   * blockquote markers stripped, because the catalog blurb in `CASE-STUDY.md`
   * wraps mid-claim and `1,560\n> passing tests` is one sentence.
   */
  function claimedCounts(text: string): number[] {
    const flat = text
      .replace(/\d{4}-\d{2}-\d{2}/g, "<date>")
      .replace(/^[ \t]*>[ \t]?/gm, "")
      .replace(/(\d),(\d{3})\b/g, "$1$2");

    const found: number[] = [];
    for (const shape of CLAIM_SHAPES) {
      for (const match of flat.matchAll(shape)) found.push(Number(match[1]));
    }
    return found;
  }

  const perFile = CLAIM_SITES.map((file) => ({
    file,
    counts: claimedCounts(readFileSync(path.join(ROOT, file), "utf8")),
  }));

  it("is claimed somewhere at all", () => {
    const total = perFile.reduce((n, entry) => n + entry.counts.length, 0);
    expect(total, "no document quotes a test count any more").toBeGreaterThan(0);
  });

  it("agrees across every document and the video script", () => {
    const quoted = new Map<number, string[]>();
    for (const { file, counts } of perFile) {
      for (const count of new Set(counts)) {
        quoted.set(count, [...(quoted.get(count) ?? []), file]);
      }
    }

    const report = [...quoted.entries()]
      .map(([count, files]) => `${count} (${files.join(", ")})`)
      .join(" vs ");

    expect(
      quoted.size,
      `the project quotes more than one test count: ${report}. Re-measure with ` +
        "`npx vitest run` and update every site.",
    ).toBe(1);
  });
});
