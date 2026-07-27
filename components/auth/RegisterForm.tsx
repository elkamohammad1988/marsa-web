"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { PasswordField } from "@/components/auth/PasswordField";
import { FormAlert } from "@/components/auth/FormAlert";
import { useAuthForm } from "@/components/auth/useAuthForm";
import { MIN_ACCOUNT_PASSWORD_LENGTH, validateRegistration } from "@/lib/validation";

/**
 * Create an account.
 *
 * The password rule is stated up front as a hint rather than only after a
 * failed attempt, and the number comes from the constant the server enforces —
 * so the requirement a person is shown is the requirement that will be applied.
 */
export function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { state, errors, formError, submit } = useAuthForm({
    endpoint: "/api/auth/register",
    validate: validateRegistration,
  });

  const busy = state !== "editing";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit({ fullName, email, password });
      }}
      className="flex flex-col gap-5"
    >
      {formError && <FormAlert tone="error">{formError}</FormAlert>}

      <TextField
        label="Full name"
        name="fullName"
        autoComplete="name"
        autoFocus
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
        hint="Optional — it is what the account area calls you."
      />

      <TextField
        label="Email address"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />

      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        hint={`At least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters. A passphrase is easier to remember and harder to guess.`}
      />

      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? "Creating your account…" : "Create account"}
      </Button>

      <p className="text-center text-xs leading-relaxed text-ink-subtle">
        By creating an account you agree to our{" "}
        <Link href="/legal/terms" className="text-brand-strong underline-offset-4 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="text-brand-strong underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
