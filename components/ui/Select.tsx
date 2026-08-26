import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { IconChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * The site's one select control.
 *
 * Five `<select>` elements were shipping with no `appearance-none` at all
 * (`CurrencyConverter` ×2, `FxCalculator` ×2, `DemoFlow` ×1). A bare select is
 * painted by the operating system, not by this stylesheet: on Windows Chrome
 * that is a light-grey chip with a black chevron, sitting inside the darkest
 * surface on the page. It was the single most obviously un-designed element on
 * the site, and it sat in the middle of the flagship tool — the currency
 * converter's hero panel, the first interactive thing a visitor touches.
 *
 * Why this still wraps a native `<select>` rather than a custom listbox: the
 * native control brings type-ahead, keyboard semantics, the mobile wheel
 * picker, and correct screen-reader announcement for free, and a hand-rolled
 * `role="listbox"` reimplements all four badly. `appearance-none` removes the
 * OS paint without removing any of the behaviour. `color-scheme: dark` on
 * `:root` (globals.css) is what makes the *open* popup dark too — that part is
 * not stylable from here, and it is the reason the declaration exists.
 *
 * The chevron is a real element, not a `background-image` data URI. The data
 * URI approach in `forms/fields.tsx` had hardcoded `stroke='%235B6478'` — a
 * slate blue-grey left over from the light theme this site no longer has, so
 * every form's chevron rendered a muddy non-palette colour that no token could
 * reach. An SVG sibling takes `currentColor` and follows the tokens.
 */

type Variant = "field" | "chip";

/**
 * `h-full` is a target-size fix, not a cosmetic one.
 *
 * The shell is `h-11` (44px) or `h-9` (36px), but an unstretched `<select>` is
 * only as tall as its own line box — 20–23px measured across the five
 * viewports in the responsive sweep. The shell's remaining height *looks* like
 * part of the control and is not: clicking the top or bottom few pixels of a
 * currency picker did nothing. That is a pointer target under the 24×24 CSS px
 * floor in WCAG 2.2 AA 2.5.8, on the site's most-used control — the same rule
 * `FxCalculator`'s range input already cites for its own `h-6`.
 *
 * Stretching the select to the shell makes the whole visual control the hit
 * area, which is what a reader assumes it already was.
 */
const base =
  "peer h-full w-full appearance-none bg-transparent font-medium text-ink outline-none " +
  "transition-colors duration-200 " +
  // The native popup inherits the OS surface, not ours; give the options a
  // readable pair explicitly for the browsers that do honour it.
  "[&>option]:bg-card [&>option]:text-ink " +
  // An explicit colour rather than `disabled:opacity-60`, for the reason spelled
  // out in `components/forms/fields.tsx`: opacity is a blend against an unknown
  // surface. `--ink-subtle` is 7.57:1 on the field shell's `--surface-tint` and
  // 8.68:1 on the tint below it.
  "disabled:cursor-not-allowed disabled:text-ink-subtle";

const shells: Record<Variant, string> = {
  /** Full-width form control. */
  field:
    "relative flex h-11 items-center rounded-lg bg-surface-tint px-3.5 ring-1 ring-line " +
    "transition-[box-shadow,background-color] duration-200 " +
    "hover:bg-surface-tint-2 " +
    "focus-within:ring-2 focus-within:ring-brand-strong",
  /**
   * Compact control for sitting *inside* another control's row — the currency
   * picker beside an amount input. Sized to align with a 2xl numeric field.
   *
   * `rounded-md` rather than the pill it was: it sits directly inside a
   * `rounded-lg` field, and a fully-round control nested in a rounded
   * rectangle is the one pairing that makes both look unconsidered. A smaller
   * radius than its parent is what nesting should do.
   */
  chip:
    "relative flex h-9 shrink-0 items-center rounded-md bg-card pl-3 pr-1.5 ring-1 ring-line " +
    "transition-[box-shadow,background-color] duration-200 " +
    "hover:bg-surface-tint hover:ring-line-dark " +
    "focus-within:ring-2 focus-within:ring-brand-strong",
};

const fields: Record<Variant, string> = {
  field: "pr-7 text-[15px]",
  chip: "pr-[18px] text-sm",
};

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: Variant;
  /** Applied to the wrapper, not the `<select>` — for width/layout. */
  shellClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { variant = "field", className, shellClassName, children, ...props },
  ref,
) {
  return (
    <div className={cn(shells[variant], shellClassName)}>
      <select ref={ref} className={cn(base, fields[variant], className)} {...props}>
        {children}
      </select>
      <IconChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute text-ink-muted transition-colors duration-200",
          // Follows the field's focus, so the affordance brightens with the ring.
          "peer-focus:text-brand-strong",
          variant === "chip" ? "right-2 h-3.5 w-3.5" : "right-3.5 h-4 w-4",
        )}
      />
    </div>
  );
});
