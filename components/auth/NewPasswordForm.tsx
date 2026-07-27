"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/auth/PasswordField";
import { FormAlert } from "@/components/auth/FormAlert";
import { useAuthForm } from "@/components/auth/useAuthForm";
import { MIN_ACCOUNT_PASSWORD_LENGTH, validateNewPassword } from "@/lib/validation";

/**
 * Set a new password, for somebody who is already signed in.
 *
 * Used both by `/reset-password` — reached with a session minted from an
 * emailed recovery link — and from the account area. The two are the same
 * form because they are the same operation; what differs is only where the
 * person came from and where they go afterwards.
 */
export function NewPasswordForm({
  submitLabel = "Save new password",
  redirectTo,
}: {
  submitLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const { state, errors, formError, submit } = useAuthForm({
    endpoint: "/api/account/password",
    validate: validateNewPassword,
    redirectTo,
    onSuccess: () => {
      setPassword("");
      // The account page renders nothing about the password, so there is no
      // stale value to clear — but a refresh keeps the server render in step
      // with a session Supabase may have re-issued behind the change.
      router.refresh();
    },
  });

  if (state === "done" && !redirectTo) {
    return <FormAlert tone="success">Your password has been changed.</FormAlert>;
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit({ password });
      }}
      className="flex flex-col gap-5"
    >
      {formError && <FormAlert tone="error">{formError}</FormAlert>}

      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        autoFocus
        value={password}
        onChange={setPassword}
        error={errors.password}
        hint={`At least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters.`}
      />

      <Button type="submit" size="lg" disabled={state !== "editing"} className="w-full">
        {state === "editing" ? submitLabel : "Saving…"}
      </Button>
    </form>
  );
}
