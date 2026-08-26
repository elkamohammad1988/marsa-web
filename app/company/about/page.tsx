import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { BreadcrumbEyebrow } from "@/components/sections/BreadcrumbEyebrow";
import { CTACard } from "@/components/sections/CTACard";
import { buildMetadata } from "@/lib/seo";
import { FX_CURRENCIES } from "@/lib/fx";
import { IBAN_LENGTHS } from "@/lib/iban";
import sitemap from "@/app/sitemap";

export const metadata: Metadata = buildMetadata({
  title: "About this build",
  description:
    "Marsa is a concept build: a cross-border money product engineered end to end, with no company behind it. What is real here, what is not, and why it exists.",
  path: "/company/about",
});

/**
 * This page used to be a company profile for a company that does not exist.
 *
 * It ran a band of statistics in the grammar of achievement — "180+ countries
 * served" — and closed with a founding story in the past tense: "We set out to
 * fix that. Today Marsa gives people and businesses a genuine European
 * multi-currency IBAN... We build on regulated, licensed financial
 * infrastructure." There is no founding, no today, no infrastructure, and
 * nothing has been served to anybody.
 *
 * Deleting the page was the obvious move and the wrong one. A reader who
 * navigates to /company/about is asking a real question — who made this, and
 * why should I take it seriously — and that question has a true answer more
 * interesting than the invented one. So the page keeps its shape and changes
 * its subject: it is about the build rather than about a business.
 *
 * The numbers are the part worth noticing. Each is derived from the module
 * that implements it, so a figure here cannot drift from the software it
 * describes: there is no second copy of it to drift.
 */
const stats = [
  {
    value: `${FX_CURRENCIES.length}`,
    label: "Currencies in the live ECB feed",
    detail: "Counted from the table the converter and the ticker read.",
  },
  {
    value: `${Object.keys(IBAN_LENGTHS).length}`,
    label: "Countries the IBAN checker validates",
    detail: "ISO 13616 length rules plus the MOD-97 checksum, fully offline.",
  },
  {
    // The sitemap function itself, not the static list it is built from —
    // otherwise the blog posts would be missing and the number would be a
    // quiet undercount rather than a measurement.
    value: `${sitemap().length}`,
    label: "Indexed pages, each with a canonical URL",
    detail: "Counted by running the sitemap, so the two cannot disagree.",
  },
  {
    value: "0",
    label: "Details the marketing forms keep",
    detail: "Each one checks your input against the real rules, then lets go of it.",
  },
];

/**
 * Four rules, as a numbered sequence rather than as four cards.
 *
 * Each of these carried an icon in a 48px gradient tile: a shield for "say what
 * is true", a padlock for "make the bug unrepresentable", a lightning bolt for
 * "no claim without something that checks it", a globe for "one palette". None
 * of the four glyphs had anything to do with the sentence beside it — they were
 * there because the card shape has a slot at the top, which is the definition
 * of decoration. The tiles are gone and so is the last caller of `FeatureIcon`.
 *
 * The cards went with them. Four bordered panels holding nothing but a heading
 * and a paragraph is a border around a paragraph; these are prose, and prose
 * wants a rule and a number, which is also what says "there are four of these
 * and they are in an order" without a badge saying it.
 */
const principles = [
  {
    title: "Say what is true, including when it is small",
    text: "A concept describing free SEPA transfers is a product claim about a hypothetical product. A page telling you that you may refer a complaint to the financial ombudsman is a false statement about a legal right. The line is drawn there, and the disclosure sits in the navbar on every page rather than in a footnote.",
  },
  {
    title: "Make the bug unrepresentable, not fixed",
    text: "A failed database write used to return “accepted but not persisted”, and four separate callers each had to remember to check. The write now either resolves or throws, and there is no value left for a caller to ignore. Much of the work in this repository has that shape: remove the state that allowed the mistake.",
  },
  {
    title: "No claim without something that checks it",
    text: "Contrast ratios, IBAN checksums, rate arithmetic, security headers, whether the sitemap points at pages that exist — each is asserted by a test that fails if the claim stops being true. The useful ones guard the shape of a past mistake rather than its instance.",
  },
  {
    title: "One palette, no configuration theatre",
    text: "Dark by default, in a single set of tokens. An earlier version shipped a light theme that was a value-for-value copy of the dark one, plus a script in the document head to switch between them — a closed loop that could not change a rendered colour. It is gone, and the contrast of what remains is measured rather than assumed.",
  },
];

export default function Page() {
  return (
    <>
      <Section tone="alt" size="md">
        <Container>
          <BreadcrumbEyebrow
            items={[{ label: "Home", href: "/" }, { label: "Company" }, { label: "About" }]}
            className="mb-6"
          />
          <div className="max-w-3xl">
            <Heading level="display">A product built properly, without a company</Heading>
            <p className="mt-5 text-base text-ink-muted md:text-lg">
              Getting paid from another country still means a wire, a fee you find out about
              afterwards, and an exchange rate nobody shows you. Marsa is a working answer to that,
              built end to end as a portfolio piece: the product is imagined, the software under it
              is not.
            </p>
            <p className="mt-4 text-base text-ink-muted md:text-lg">
              The hard part of a product like this was never the marketing page. It is the
              regulatory model it would have to sit inside, arithmetic that has to be right to the
              cent, and the failure modes that decide whether a payment is lost or merely delayed.
              Those are the parts that were built.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="deep" size="md">
        <Container>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="figure font-display text-4xl font-bold text-white">{s.value}</div>
                <div className="mt-2 text-sm font-medium text-white/80">{s.label}</div>
                <div className="mt-1 text-xs text-white/50">{s.detail}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 border-t border-white/10 pt-5 text-xs text-white/45">
            Each figure is computed from the module that implements it, so none of them can drift
            from the code. Nothing here counts users, transactions or countries served, because
            there are none.
          </p>
        </Container>
      </Section>

      <Section tone="canvas" size="lg">
        <Container>
          <div className="max-w-2xl">
            <Heading level="h2">How it was built</Heading>
            <p className="mt-3 text-ink-muted">Four rules that settled most of the arguments.</p>
          </div>
          <ol className="mt-10 border-t border-line md:mt-12">
            {principles.map((p, i) => (
              <li
                key={p.title}
                className="grid grid-cols-1 gap-x-10 gap-y-2 border-b border-line py-7 md:grid-cols-12 md:py-9"
              >
                <span
                  aria-hidden
                  className="font-display text-sm font-bold tabular-nums tracking-tight text-brand-strong md:col-span-1"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-semibold text-ink md:col-span-4">{p.title}</h3>
                <p className="max-w-prose text-sm leading-relaxed text-ink-muted md:col-span-7">
                  {p.text}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="tint" size="lg">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Heading level="h2">Why it exists</Heading>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-ink-muted">
              <p>
                Cross-border payments are genuinely bad. A seller in Casablanca paid by a
                marketplace in Germany waits days for a SWIFT transfer, loses two to four percent to
                a spread nobody quotes them, and cannot open a European account without a European
                address. That problem is real even though this product is not.
              </p>
              <p>
                Marsa is what a serious attempt at it would look like from the outside, taken far
                enough that the answers stop being cosmetic: how safeguarding differs from deposit
                protection, what onboarding has to check before an account can exist, what happens
                to a submission when the database is unreachable, and what a rate is worth if you
                cannot say when it was published.
              </p>
              <p>
                It was then audited against its own claims and rewritten where it failed them. The
                invented testimonials went, the licence claims went, and the marketing forms stopped
                collecting personal data there was no operator to look after.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <CTACard
        eyebrow="See it working"
        title="The parts that actually run"
        description="Live ECB rates, offline IBAN validation, and a walkthrough of the onboarding flow. The software, without the company."
        primaryCta={{ label: "Try the demo", href: "/demo" }}
        secondaryCta={{ label: "Check an IBAN", href: "/tools/iban-checker" }}
      />
    </>
  );
}
