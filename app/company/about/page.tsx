import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { BreadcrumbEyebrow } from "@/components/sections/BreadcrumbEyebrow";
import { CTACard } from "@/components/sections/CTACard";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { IconGlobe, IconShield, IconLock, IconLightning } from "@/components/icons";
import { buildMetadata } from "@/lib/seo";
import { FX_CURRENCIES } from "@/lib/fx";
import { IBAN_LENGTHS } from "@/lib/iban";
import sitemap from "@/app/sitemap";

export const metadata: Metadata = buildMetadata({
  title: "About This Build",
  description:
    "Marsa is a concept build: a cross-border money product designed and engineered end to end, without a company behind it. What is real, what is not, and why it was built this way.",
  path: "/company/about",
});

/**
 * This page used to be a company profile for a company that does not exist.
 *
 * It opened *"Marsa was founded on a simple belief"*, ran a band of statistics
 * presented as achievements — **180+ countries served**, **30+ currencies
 * held** — and closed with a founding story in the past tense: *"We set out to
 * fix that. Today Marsa gives people and businesses a genuine European
 * multi-currency IBAN."* There is no founding, no we, no today, and nothing has
 * been served to anybody.
 *
 * Deleting it was the obvious move and the wrong one. A portfolio reader
 * arriving at `/company/about` is asking a real question — *who made this and
 * why should I take it seriously* — and that question has a true answer that is
 * more interesting than the invented one. So the page keeps its shape and
 * changes its subject: it is now about the build rather than about a business.
 *
 * The numbers are the part worth noticing. Every figure below is **derived from
 * the code that implements it** — the currency table the converter reads, the
 * ISO 13616 length table the validator checks against, the route list the
 * sitemap is generated from. A stat on this page cannot drift from the software
 * it describes, because there is no second copy of it to drift. That is the
 * same failure the README had when it claimed 94 passing tests against an
 * actual 367, and the reason no test count appears here.
 */

const stats = [
  {
    value: `${FX_CURRENCIES.length}`,
    label: "Currencies in the live ECB feed",
    detail: "Counted from the table the converter and ticker read.",
  },
  {
    value: `${Object.keys(IBAN_LENGTHS).length}`,
    label: "Countries the IBAN checker validates",
    detail: "ISO 13616 length rules plus the MOD-97 checksum, fully offline.",
  },
  {
    // The sitemap function itself, not the static list it is built from —
    // otherwise the six blog posts would be missing and the number would be a
    // quiet undercount rather than a measurement.
    value: `${sitemap().length}`,
    label: "Pages, each with its own canonical URL",
    detail: "Counted by running the sitemap, so the two cannot disagree.",
  },
  {
    value: "0",
    label: "Personal details collected",
    detail: "The forms validate what you type, then discard it.",
  },
];

const principles = [
  {
    icon: <IconShield />,
    title: "Say what is true, including when it is small",
    text: "A concept describing free SEPA transfers is a product claim about a hypothetical product. A page telling you that you may refer a complaint to the financial ombudsman is a false statement about a legal right. The line is drawn there, deliberately, and the disclosure is on every page rather than buried in a footer.",
  },
  {
    icon: <IconLock />,
    title: "Make the bug unrepresentable, not fixed",
    text: "A failed database write used to return “accepted but not persisted”, and four separate callers each had to remember to check. Now the write either resolves or throws, and there is no value left for a caller to ignore. Most of the work in this repository is that shape: remove the state that allowed the mistake.",
  },
  {
    icon: <IconLightning />,
    title: "No claim without something that checks it",
    text: "Contrast ratios, IBAN checksums, rate arithmetic, security headers, the ordering of blog dates, whether the sitemap points at pages that exist — each is asserted by a test that fails if the claim stops being true. The interesting ones guard the shape of a past mistake rather than its instance.",
  },
  {
    icon: <IconGlobe />,
    title: "One palette, no configuration theatre",
    text: "Dark by default, in a single set of tokens. An earlier version shipped a light theme that was a value-for-value copy of the dark one, plus a script in the document head to switch between them — a closed loop that could not change a rendered colour. It is gone, and the contrast of what remains is measured rather than assumed.",
  },
];

export default function Page() {
  return (
    <>
      <Section tone="cream" size="md">
        <Container>
          <BreadcrumbEyebrow
            items={[{ label: "Home", href: "/" }, { label: "Company" }, { label: "About" }]}
            className="mb-6"
          />
          <div className="max-w-3xl">
            <Heading level="display">A Product Built Properly, Without A Company</Heading>
            <p className="mt-5 text-base text-ink-muted md:text-lg">
              Marsa is a concept build: a cross-border multi-currency account, designed and
              engineered end to end, with no business behind it. There is no licence, no partner
              institution, no balance and no customer. What there is, is the software — and it is
              the software that this site is trying to show you.
            </p>
            <p className="mt-4 text-base text-ink-muted md:text-lg">
              The hard part of a product like this was never the marketing page. It is the
              regulatory model it would have to sit inside, the arithmetic that has to be right to
              the cent, and the failure modes that decide whether a payment is lost or merely
              delayed. Those are the parts that were built.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="navy" size="md">
        <Container>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="num-glow font-display text-4xl font-bold tabular-nums text-white">
                  {s.value}
                </div>
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

      <Section tone="white" size="lg">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Heading level="h2">How It Was Built</Heading>
            <p className="mt-3 text-ink-muted">
              Four rules that decided most of the arguments.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {principles.map((p) => (
              <div key={p.title} className="rounded-card-lg border border-line bg-card p-6">
                <FeatureIcon tone="blue">{p.icon}</FeatureIcon>
                <h3 className="mt-4 text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="blue-tint" size="lg">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Heading level="h2">Why It Exists</Heading>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-ink-muted">
              <p>
                Cross-border payments are genuinely bad. A seller in Casablanca paid by a
                marketplace in Germany waits days for a SWIFT transfer, loses two to four percent
                to a spread nobody quotes them, and cannot open a European account without a
                European address. That problem is real even though this product is not.
              </p>
              <p>
                Marsa is what a serious attempt at it would look like from the outside, taken far
                enough that the answers stop being cosmetic: how safeguarding actually differs from
                deposit protection, what onboarding has to check before an account can exist, what
                happens to a submission when the database is unreachable, and what a rate is worth
                if you cannot say when it was published.
              </p>
              <p>
                It was then audited against its own claims and rewritten where it failed them. The
                invented testimonials went, the licence claims went, the placeholder photography
                went, and the forms stopped collecting personal data they had no operator to look
                after. Every one of those changes is a merged pull request with its reasoning
                written down.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <CTACard
        eyebrow="See It Working"
        title="The Parts That Actually Run"
        description="Live ECB rates, offline IBAN validation, and a walkthrough of the onboarding flow — the software, without the company."
        primaryCta={{ label: "Try The Demo", href: "/demo" }}
        secondaryCta={{ label: "Check An IBAN", href: "/tools/iban-checker" }}
        art="coin-warm"
      />
    </>
  );
}
