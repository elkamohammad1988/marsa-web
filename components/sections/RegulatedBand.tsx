import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { PointerGlow } from "@/components/ui/PointerGlow";
import { IconShield, IconBank, IconLock } from "@/components/icons";

/**
 * The regulatory model, stated as a model.
 *
 * This band renders on nine pages and used to read "Regulated And
 * Safeguarded — Marsa is built on regulated financial infrastructure, under EU
 * and UK supervision". There is no institution, no supervision and no
 * infrastructure. Describing the architecture a real product would need is
 * both true and more interesting than asserting compliance nobody holds.
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
        "KYC, sanctions and transaction monitoring on every onboarding and every payment — the part that decides whether a product is shippable.",
    },
  ];
  return (
    <Section tone="canvas" size="md">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Heading level="h2">The model behind it</Heading>
          <p className="mt-3 text-ink-muted">
            Marsa is a concept, so it holds no authorisation of its own. This is the regulatory
            structure the product it describes would be built on.
          </p>
        </div>
        <PointerGlow className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              data-glow
              className="spotlight card-hover gradient-ring group relative rounded-card-lg border border-line bg-card p-6 text-center shadow-e1"
            >
              <div className="flex justify-center">
                <FeatureIcon tone="brand" size="lg">
                  {it.icon}
                </FeatureIcon>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{it.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{it.description}</p>
            </div>
          ))}
        </PointerGlow>
      </Container>
    </Section>
  );
}
