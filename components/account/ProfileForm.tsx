"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/fields";
import { FormAlert } from "@/components/auth/FormAlert";
import { useAuthForm } from "@/components/auth/useAuthForm";
import { validateProfile } from "@/lib/validation";
import type { Profile } from "@/lib/profiles";

/**
 * Edit the parts of a profile that belong to its owner.
 *
 * Name only. The email address is a credential and changing it needs
 * re-confirmation through Supabase, and the role is not the account holder's
 * to set — the database will not accept it from a browser session at all, so
 * rendering a control for it would promise something no request could deliver.
 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [saved, setSaved] = useState(false);
  const { errors, formError, state, submit } = useAuthForm({
    endpoint: "/api/account/profile",
    method: "PATCH",
    validate: validateProfile,
    onSuccess: () => setSaved(true),
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        submit({ fullName });
      }}
      className="flex flex-col gap-5"
    >
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      {saved && !formError && <FormAlert tone="success">Your profile has been saved.</FormAlert>}

      <TextField
        label="Full name"
        name="fullName"
        autoComplete="name"
        value={fullName}
        onChange={(e) => {
          setFullName(e.target.value);
          setSaved(false);
        }}
        error={errors.fullName}
        hint="Leave it empty to remove the name from your profile."
      />

      <div>
        <Button type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
