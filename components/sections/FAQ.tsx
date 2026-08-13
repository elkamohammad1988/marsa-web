import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Accordion, type AccordionEntry } from "@/components/ui/Accordion";
import { Stagger } from "@/components/ui/Stagger";
import { JsonLd } from "@/components/JsonLd";
import { faqSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";

type FAQProps = {
  title?: string;
  description?: string;
  items: AccordionEntry[];
  tone?: "canvas" | "tint" | "deep";
  /** Emit FAQPage structured data. Disable when a page renders several FAQs. */
  emitSchema?: boolean;
};

export function FAQ({
  title = "Frequently asked questions",
  description,
  items,
  tone = "tint",
  emitSchema = true,
}: FAQProps) {
  return (
    <Section tone={tone} size="lg">
      {emitSchema && <JsonLd data={faqSchema(items)} />}
      <Container>
        {/*
          The left column holds a heading and one line of copy against an
          accordion three times its height, so it bottomed out with roughly
          300px of empty column beneath it — the page's largest single void,
          directly beside its densest block.

          Sticking it rather than padding it is the fix: the heading now
          travels with the questions instead of scrolling away, so the space
          below it is doing something (it is the room the heading needs to
          move in) rather than merely being empty.
        */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <Stagger className="lg:sticky lg:top-28" step={90}>
            <Heading
              level="h2"
              className={cn("rise", tone === "deep" && "text-white")}
            >
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
          </Stagger>
          <Accordion items={items} tone={tone === "deep" ? "dark" : "light"} />
        </div>
      </Container>
    </Section>
  );
}
