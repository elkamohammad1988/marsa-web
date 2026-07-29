"use client";

import { useState } from "react";
import { TextField } from "@/components/forms/fields";
import { cn } from "@/lib/utils";

type PasswordFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** `current-password` when signing in, `new-password` when setting one. */
  autoComplete: "current-password" | "new-password";
};

/**
 * A password input with a reveal toggle.
 *
 * A reveal control rather than a second "confirm password" box. Both exist to
 * catch the same mistake — a typo in something you cannot see — and only one
 * of them lets you check what you actually typed. The second box also invites
 * paste-into-both, which defeats it entirely, and adds a failure mode
 * ("passwords do not match") that is a worse experience than the problem.
 *
 * The toggle is a real button: reachable by Tab, operated by Enter or Space,
 * and it carries `aria-pressed` so a screen reader announces the state rather
 * than only the label. It is `type="button"` because a bare `<button>` inside
 * a form submits it, which here would mean revealing the password by
 * submitting the sign-in form.
 *
 * No field in any auth form takes focus on load. `autofocus` moves the reading
 * position past the heading and the paragraph under it — and on `/register`
 * that paragraph is the disclosure that a real account is about to be created,
 * which is the last thing worth skipping to save one keystroke.
 */
export function PasswordField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <TextField
      label={label}
      name={name}
      type={revealed ? "text" : "password"}
      autoComplete={autoComplete}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      hint={hint}
      trailing={
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-pressed={revealed}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors",
            "hover:bg-ink/5 hover:text-ink",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong",
          )}
        >
          {revealed ? "Hide" : "Show"}
          <span className="sr-only"> password</span>
        </button>
      }
    />
  );
}
