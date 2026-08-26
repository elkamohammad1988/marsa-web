import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Reveal } from "@/components/ui/Reveal";
import { Stagger } from "@/components/ui/Stagger";
import { ScrollRegion } from "@/components/ui/ScrollRegion";

export type ComparisonRow = {
  /** The dimension being compared — the row's own heading. */
  label: string;
  /** What this product does. */
  subject: string;
  /** What it is being compared against. */
  comparator: string;
};

export type ComparisonColumns = {
  subject: string;
  comparator: string;
};

type ComparisonTableProps = {
  eyebrow?: string;
  /**
   * Optional. `/tools/sepa-vs-swift` puts its table directly under the page's
   * own introduction, where a second heading would be restating it.
   */
  title?: string;
  /**
   * Column headings. Defaults to the ten marketing pages' comparison — this
   * product against a high-street bank — and is overridable so the same table
   * can compare two things that are neither.
   */
  columns?: ComparisonColumns;
  rows: ComparisonRow[];
  /** Names the scroll region when there is no `title` to name it. */
  label?: string;
};

/**
 * The comparison, set as a table rather than as a lit panel.
 *
 * ## What went
 *
 * **The zebra striping and the row hover.** Rows alternated `bg-card` and
 * `bg-surface-tint-2` and brightened to `bg-surface-tint` under the pointer.
 * Nothing in this table is clickable, so the hover was a control's feedback on
 * static content — the reader is told something responds, tries it, and nothing
 * does. Striping is a legibility aid for a table too wide to track across; this
 * one is three columns, and hairlines do it without painting six rectangles.
 *
 * **The lit band down the Marsa column.** An absolutely-positioned overlay at
 * `bg-brand/[0.07]` with a `ring-brand-strong/25` inset, floated above the rows
 * on `z-10` with the cells lifted to `z-20` to stay above *it*. Three
 * z-indexes and a pointer-events reset to tint one column. The column is
 * already marked: its heading is the product's name and its values are set in
 * `text-ink` at semibold against a muted competitor. Emphasis by weight and
 * colour needs no scaffolding.
 *
 * **The card wrapper.** A rounded, bordered, `shadow-e2` panel around a table.
 * A table has its own edges.
 *
 * ## What is left
 *
 * A rule under the head, a hairline under each row, and one column set heavier
 * than the other. That is a specification, which is the register this whole
 * page is trying to write in.
 */
export function ComparisonTable({
  eyebrow,
  title,
  columns = { subject: "Marsa", comparator: "Traditional" },
  rows,
  label,
}: ComparisonTableProps) {
  const heading = title ?? label ?? `${columns.subject} compared with ${columns.comparator}`;

  return (
    <Section tone="canvas" size="lg">
      <Container>
        {title && (
          <Stagger className="max-w-2xl" step={90}>
            {eyebrow && (
              <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
                {eyebrow}
              </span>
            )}
            <Heading level="h2" className="rise mt-3">
              {title}
            </Heading>
          </Stagger>
        )}

        {/* The scroll lives in the wrapper, not on the page: at 390px three
            columns need about 545px to set without breaking a value across two
            lines, and a table that scrolls inside its own box is the one shape
            that never gives the document a horizontal scrollbar.

            `ScrollRegion` rather than a bare `overflow-x-auto`, because a
            scrolling box of plain text has no focusable child and is therefore
            unreachable by keyboard — axe's `scrollable-region-focusable`, and
            the exact defect `tests/scroll-regions.test.ts` exists to catch.
            It is also why the `Reveal` moved inside: the region has to be the
            element that scrolls and the element that takes focus. */}
        <ScrollRegion label={heading} className={title ? "mt-10 md:mt-12" : undefined}>
          <Reveal>
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line-dark">
                <th scope="col" className="py-3 pr-4 font-medium text-ink-muted">
                  Feature
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  {columns.subject}
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-ink-muted">
                  {columns.comparator}
                </th>
              </tr>
            </thead>
            {/*
              The rows arrive one after another rather than as a block, so the
              table reads down the way it is meant to be read. A shorter step
              than the rows elsewhere on the page: six at 70ms would still be
              landing most of a second after the reader reached them, which
              stops being a rhythm and becomes a wait.
            */}
            <Stagger as="tbody" step={45}>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-line">
                  <th
                    scope="row"
                    className="py-3.5 pr-4 text-left font-medium text-ink-muted"
                  >
                    {r.label}
                  </th>
                  <td className="px-4 py-3.5 font-semibold text-ink">{r.subject}</td>
                  <td className="px-4 py-3.5 text-ink-muted">{r.comparator}</td>
                </tr>
              ))}
            </Stagger>
          </table>
          </Reveal>
        </ScrollRegion>
      </Container>
    </Section>
  );
}
