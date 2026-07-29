"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { PasswordField } from "@/components/auth/PasswordField";
import { FormAlert } from "@/components/auth/FormAlert";
import { useAuthForm } from "@/components/auth/useAuthForm";
import { validateSignIn } from "@/lib/validation";

/**
 * Sign in.
 *
 * `notice` is a message chosen by the server from a closed set (see
 * `AUTH_NOTICES`) — never text taken from the URL. `next` is where to go
 * afterwards, already sanitised by `safeRedirect` before it reached the page.
 */
export function SignInForm({ next, notice }: { next?: string; notice?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { state, errors, formError, submit } = useAuthForm({
    endpoint: "/api/auth/login",
    validate: validateSignIn,
  });

  const busy = state !== "editing";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit({ email, password, next });
      }}
      className="flex flex-col gap-5"
    >
      {notice && <FormAlert tone="error">{notice}</FormAlert>}
      {formError && <FormAlert tone="error">{formError}</FormAlert>}

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
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />

      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {/* The label changes rather than being replaced by a spinner: it stays
            readable, it is announced, and the button keeps its width. */}
        {busy ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex flex-col gap-1.5 text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          Forgotten your password?
        </Link>
        {/*
          Permanently visible, and that is the point. Sign-in gives the same
          answer for a wrong password and for an address that has never
          confirmed its email, because telling the two apart would make this
          form an account-enumeration oracle. This link is how the person in
          the second case gets out, without anybody being told which case they
          are in.
        */}
        <Link
          href="/verify-email"
          className="text-ink-subtle underline-offset-4 hover:text-ink hover:underline"
        >
          Need a new confirmation email?
        </Link>
      </div>
    </form>
  );
}
