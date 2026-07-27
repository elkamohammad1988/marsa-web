"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { FormAlert } from "@/components/auth/FormAlert";
import { useAuthForm } from "@/components/auth/useAuthForm";
import { validateEmailOnly } from "@/lib/validation";

/**
 * One form for the two flows that send an email: password recovery, and
 * re-sending a confirmation link.
 *
 * The confirmation copy has to be written carefully, and it is the reason this
 * is one component rather than two. Both endpoints answer identically whether
 * or not the address has an account — otherwise they would be a list of every
 * customer — so the message must not say "we have sent you an email", which
 * asserts something the page cannot know. It says what was done and what to do
 * next, and it is true in both cases.
 */
export function EmailOnlyForm({
  endpoint,
  submitLabel,
  pendingLabel,
  confirmation,
  defaultEmail = "",
}: {
  endpoint: string;
  submitLabel: string;
  pendingLabel: string;
  confirmation: string;
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const { state, errors, formError, submit } = useAuthForm({
    endpoint,
    validate: validateEmailOnly,
  });

  if (state === "done") {
    return <FormAlert tone="success">{confirmation}</FormAlert>;
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit({ email });
      }}
      className="flex flex-col gap-5"
    >
      {formError && <FormAlert tone="error">{formError}</FormAlert>}

      <TextField
        label="Email address"
        type="email"
        name="email"
        autoComplete="email"
        autoFocus={!defaultEmail}
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />

      <Button type="submit" size="lg" disabled={state === "submitting"} className="w-full">
        {state === "submitting" ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
