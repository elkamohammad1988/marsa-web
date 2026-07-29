import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export type FeatureBullet = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

type FeatureBulletsProps = {
  items: FeatureBullet[];
  tone?: "canvas" | "alt" | "tint";
};

export function FeatureBullets({ items, tone = "canvas" }: FeatureBulletsProps) {
  return (
    <Section tone={tone} size="md">
      <Container>
        {/* Section landmark heading — visually hidden, keeps the h1→h2→h3
            document outline correct (the cards below are h3). */}
        <h2 className="sr-only">What you get with Marsa</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="card-hover gradient-ring rounded-card border border-line bg-card p-6 shadow-e1"
            >
              <FeatureIcon tone="brand">{it.icon}</FeatureIcon>
              <h3 className="mt-4 text-lg font-semibold text-ink">{it.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{it.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
