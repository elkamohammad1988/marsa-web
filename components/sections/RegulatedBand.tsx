import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { IconShield, IconBank, IconLock } from "@/components/icons";

export function RegulatedBand() {
  const items = [
    {
      icon: <IconShield />,
      title: "Licensed Rails",
      description:
        "Accounts and payments run on licensed partner institutions supervised in the EU and UK.",
    },
    {
      icon: <IconBank />,
      title: "Segregated Accounts",
      description:
        "Your balance sits in safeguarding accounts at partner banks — never mixed with ours.",
    },
    {
      icon: <IconLock />,
      title: "Screened Every Time",
      description:
        "KYC, sanctions and transaction monitoring run on every onboarding and every payment.",
    },
  ];
  return (
    <Section tone="white" size="md">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Heading level="h2">Regulated And Safeguarded</Heading>
          <p className="mt-3 text-ink-muted">
            Marsa is built on regulated financial infrastructure, under EU and UK supervision, so
            your money stays protected end to end.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="card-hover rounded-card-lg border border-line bg-card p-6 text-center"
            >
              <div className="flex justify-center">
                <FeatureIcon tone="blue" size="lg">
                  {it.icon}
                </FeatureIcon>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{it.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{it.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
