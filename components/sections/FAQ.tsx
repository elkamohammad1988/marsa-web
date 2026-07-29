import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Accordion, type AccordionEntry } from "@/components/ui/Accordion";
import { JsonLd } from "@/components/JsonLd";
import { faqSchema } from "@/lib/schema";

type FAQProps = {
  title?: string;
  description?: string;
  items: AccordionEntry[];
  tone?: "canvas" | "tint" | "deep";
  /** Emit FAQPage structured data. Disable when a page renders several FAQs. */
  emitSchema?: boolean;
};

export function FAQ({
  title = "Frequently Asked Questions",
  description,
  items,
  tone = "tint",
  emitSchema = true,
}: FAQProps) {
  return (
    <Section tone={tone} size="lg">
      {emitSchema && <JsonLd data={faqSchema(items)} />}
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <div>
            <Heading level="h2" className={tone === "deep" ? "text-white" : undefined}>
              {title}
            </Heading>
            {description && (
              <p
                className={`mt-4 text-base ${
                  tone === "deep" ? "text-white/70" : "text-ink-muted"
                }`}
              >
                {description}
              </p>
            )}
          </div>
          <Accordion items={items} tone={tone === "deep" ? "dark" : "light"} />
        </div>
      </Container>
    </Section>
  );
}
