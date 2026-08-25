import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { IconShield, IconBank, IconLock } from "@/components/icons";

/**
 * The regulatory model, stated as a model.
 *
 * This band renders on nine pages and used to read "Regulated And
 * Safeguarded — Marsa is built on regulated financial infrastructure, under EU
 * and UK supervision". There is no institution, no supervision and no
 * infrastructure. Describing the architecture a real product would need is
 * both true and more interesting than asserting compliance nobody holds.
 *
 * Set as three columns under one rule rather than as three centred cards with
 * icon tiles, matching `FeatureBullets`. The centred-card treatment made a
 * statement about *not* holding a licence look like a feature boast, which is
 * the opposite of what this band is for. Flat columns read as a note.
 */
export function RegulatedBand() {
  const items = [
    {
      icon: <IconShield />,
      title: "Licensed Rails",
      description:
        "A product like this does not hold a banking licence. It runs on partner institutions that do, in each market it serves.",
    },
    {
      icon: <IconBank />,
      title: "Segregated Accounts",
      description:
        "Customer balances sit in safeguarding accounts at those partners, never mixed with the operator's own funds.",
    },
    {
      icon: <IconLock />,
      title: "Screened Every Time",
      description:
        "KYC, sanctions and transaction monitoring on every onboarding and every payment, the part that decides whether a product is shippable.",
    },
  ];
  return (
    <Section tone="canvas" size="md">
      <Container>
        <div className="max-w-2xl">
          <Heading level="h2">The model behind it</Heading>
          <p className="mt-3 text-ink-muted">
            Marsa is a concept, so it holds no authorisation of its own. This is the regulatory
            structure the product it describes would be built on.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-9 border-t border-line pt-10 md:grid-cols-3">
          {items.map((it) => (
            <div key={it.title}>
              <span aria-hidden className="block text-brand-strong [&_svg]:h-6 [&_svg]:w-6">
                {it.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{it.title}</h3>
              <p className="mt-2 max-w-prose text-sm text-ink-muted">{it.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
