"use client";

import { useState } from "react";
import type { ValidationResult } from "@/lib/validation";

export type DemoSubmitState = "editing" | "accepted";

type DemoSubmitReturn<T> = {
  state: DemoSubmitState;
  errors: Record<string, string>;
  /** Run the shared validator; on success, switch to the accepted panel. */
  submit: (input: Record<string, unknown>) => void;
  setErrors: (errors: Record<string, string>) => void;
  /** The validated payload, for echoing back in the accepted panel. */
  accepted: T | null;
};

/**
 * The on-site forms validate and then **transmit nothing**.
 *
 * This build has no operator. Nobody reads a submission, nobody replies, and
 * no identity check follows — so collecting a real name and email address
 * under a success screen promising "our onboarding team will email you within
 * one business day" was a false statement made to a real person, on a public
 * URL, creating a live data-protection obligation for a project that cannot
 * discharge one.
 *
 * The intake pipeline itself is real and stays in the repository: shared
 * validation, honeypot, cross-instance rate limiting, durable storage with an
 * unambiguous write contract, and email notification, all unit-tested in
 * `tests/api-forms.test.ts`. It is deliberately not wired to the public form.
 * `components/forms/DemoSubmissionNotice.tsx` says so to the visitor, and
 * names the endpoint that would run.
 *
 * Validation runs through the same `lib/validation.ts` the server uses, so
 * what a visitor sees is the real rule set rather than a mock of it.
 */
export function useDemoSubmit<T extends Record<string, unknown>>(
  validate: (input: Record<string, unknown>) => ValidationResult<T>,
): DemoSubmitReturn<T> {
  const [state, setState] = useState<DemoSubmitState>("editing");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<T | null>(null);

  function submit(input: Record<string, unknown>) {
    const result = validate(input);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setAccepted(result.data);
    setState("accepted");
  }

  return { state, errors, submit, setErrors, accepted };
}
