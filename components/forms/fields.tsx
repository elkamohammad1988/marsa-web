"use client";

import { useId } from "react";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border bg-canvas px-4 text-sm text-ink placeholder:text-ink-subtle " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-brand-strong/30 focus:border-brand " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function borderClass(hasError?: boolean): string {
  return hasError ? "border-danger/60" : "border-line";
}

function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="text-brand-strong" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /**
   * A control rendered inside the field, at the trailing edge — the password
   * reveal toggle is the only one so far.
   *
   * It lives here rather than in a bespoke password field so that the label,
   * hint, error and `aria-describedby` wiring stay in one place. A second copy
   * of that markup is a second place for an accessible name to go missing.
   */
  trailing?: ReactNode;
};

export function TextField({
  label,
  error,
  hint,
  className,
  id,
  required,
  trailing,
  ...props
}: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  const input = (
    <input
      id={fieldId}
      className={cn(
        control,
        "h-11",
        borderClass(!!error),
        // Room for the control, so a long value never slides under it.
        trailing ? "pr-20" : undefined,
        className,
      )}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
      required={required}
      {...props}
    />
  );

  return (
    <FieldShell id={fieldId} label={label} required={required} hint={hint} error={error}>
      {trailing ? (
        <div className="relative">
          {input}
          <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function SelectField({
  label,
  error,
  hint,
  className,
  id,
  required,
  children,
  ...props
}: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} required={required} hint={hint} error={error}>
      {/*
        The chevron used to be a `background-image` data URI with
        `stroke='%235B6478'` baked into it — a slate blue-grey from the light
        theme this site dropped. No token could reach it, so every form on the
        site drew a chevron in a colour that is nowhere in the palette. `Select`
        renders the arrow as an SVG sibling taking `currentColor`, which is how
        it follows `--ink-muted` and brightens on focus.
      */}
      <Select
        id={fieldId}
        shellClassName={error ? "ring-danger/60" : undefined}
        className={className}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        required={required}
        {...props}
      >
        {children}
      </Select>
    </FieldShell>
  );
}

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextareaField({
  label,
  error,
  hint,
  className,
  id,
  required,
  ...props
}: TextareaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} required={required} hint={hint} error={error}>
      <textarea
        id={fieldId}
        className={cn(control, "min-h-[120px] py-3", borderClass(!!error), className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        required={required}
        {...props}
      />
    </FieldShell>
  );
}

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  error?: string;
};

export function CheckboxField({ label, error, className, id, ...props }: CheckboxFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div>
      <div className="flex items-start gap-3">
        {/*
          Drawn, not inherited.

          `text-brand-strong border-line` on a checkbox are `@tailwindcss/forms`
          idioms, and that plugin is not installed (`plugins: []`) — so the
          colour classes were setting the *text* colour of a control that has no
          text, and the box itself was the browser's own default. Against
          `color-scheme: dark` that is a flat grey square with a system-blue
          check: the one raw, unstyled control on a site whose every other input
          is tokenised, sitting on the consent row that gates the primary form.

          `appearance-none` takes the native rendering away and the sibling SVG
          puts a mark back, driven by `peer-checked`. It is still a real
          `<input type="checkbox">`, so the form, the label association and
          keyboard behaviour are untouched.
        */}
        <span className="relative mt-0.5 grid h-6 w-6 flex-none place-items-center">
          <input
            id={fieldId}
            type="checkbox"
            className={cn(
              // 24px, not 20px: WCAG 2.2 AA 2.5.8 sets the minimum target at
              // 24×24 CSS px, and a consent checkbox has no inline-in-a-sentence
              // exception to fall back on — it is the control that gates submit.
              "peer h-6 w-6 flex-none cursor-pointer appearance-none rounded-md border bg-canvas transition-colors duration-150",
              "checked:border-brand checked:bg-cta-gradient",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              error ? "border-danger/60" : "border-line hover:border-brand-strong/50",
              className,
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            {...props}
          />
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute h-3.5 w-3.5 scale-50 text-on-brand opacity-0 transition duration-150 ease-out peer-checked:scale-100 peer-checked:opacity-100"
          >
            <path
              d="M4 12.5l5 5L20 6.5"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <label htmlFor={fieldId} className="cursor-pointer text-sm text-ink-muted">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Visually-hidden honeypot input; real users never fill it, bots do.
 *
 * The id comes from `useId` rather than the literal `hp-field` it used to be.
 * Two forms on one page — which is every page carrying the footer newsletter
 * alongside a contact or get-started form — emitted the same id twice, and a
 * duplicate id makes `htmlFor` ambiguous: both labels resolve to whichever
 * input the browser saw first, so one honeypot loses its label entirely.
 */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fieldId = useId();
  return (
    <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor={fieldId}>Do not fill this in</label>
      <input
        id={fieldId}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
