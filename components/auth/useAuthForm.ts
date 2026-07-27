"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { ValidationResult } from "@/lib/validation";

type AuthFormState = "editing" | "submitting" | "done";

type AuthFormReturn<T> = {
  state: AuthFormState;
  /** Per-field messages, keyed by the field name the validator used. */
  errors: Record<string, string>;
  /** A message about the request as a whole, not about one field. */
  formError: string | null;
  submit: (input: Record<string, unknown>) => void;
  /** The validated payload, for a confirmation screen to echo. */
  accepted: T | null;
};

type Options<T> = {
  endpoint: string;
  method?: "POST" | "PATCH";
  /**
   * The same validator the route handler uses. Running it here is instant
   * feedback, not a substitute — the server validates again, and its answer
   * wins.
   */
  validate: (input: Record<string, unknown>) => ValidationResult<T>;
  /**
   * Where to go on success, when the response does not say. A response that
   * carries `next` overrides this, because only the server knows whether a
   * registration produced a session or an email.
   */
  redirectTo?: string;
  /** Called instead of navigating, for a form that stays where it is. */
  onSuccess?: () => void;
};

type ApiResponse = {
  ok?: boolean;
  next?: string;
  error?: string;
  errors?: Record<string, string>;
};

/**
 * The shared client half of every authentication form.
 *
 * Four forms need the same six things — client-side validation through the
 * server's own rules, a pending state, per-field errors from a 422, a
 * whole-form error from a 401/429/503, a redirect on success, and a network
 * failure that says so rather than hanging. Writing that four times is how the
 * four slowly stop behaving alike.
 *
 * Two decisions worth stating:
 *
 * **`router.refresh()` after navigating.** The account pages are server
 * components that read the session cookie. Without a refresh, Next.js may
 * serve the cached, signed-out render of the page we just earned access to.
 *
 * **No optimistic anything.** A form that reports success before the server
 * has agreed is the failure this repository has spent its whole history
 * removing — the old submission screen said "Application received" for records
 * that never existed.
 */
export function useAuthForm<T extends Record<string, unknown>>({
  endpoint,
  method = "POST",
  validate,
  redirectTo,
  onSuccess,
}: Options<T>): AuthFormReturn<T> {
  const router = useRouter();
  const [state, setState] = useState<AuthFormState>("editing");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<T | null>(null);

  const submit = useCallback(
    (input: Record<string, unknown>) => {
      const result = validate(input);
      if (!result.success) {
        setErrors(result.errors);
        setFormError(null);
        return;
      }

      setErrors({});
      setFormError(null);
      setState("submitting");

      void (async () => {
        try {
          const res = await fetch(endpoint, {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
          });
          const body = (await res.json().catch(() => ({}))) as ApiResponse;

          if (!res.ok) {
            if (body.errors) setErrors(body.errors);
            setFormError(body.error ?? "That did not work. Please try again.");
            setState("editing");
            return;
          }

          setAccepted(result.data);

          const destination = body.next ?? redirectTo;
          if (destination) {
            setState("done");
            router.replace(destination);
            // The destination reads the session cookie on the server, so the
            // cached signed-out render has to go.
            router.refresh();
            return;
          }

          setState("done");
          onSuccess?.();
        } catch {
          // Offline, DNS, a dropped connection — everything `fetch` rejects
          // for. Distinguished from a server refusal because the action a
          // person takes is different: try again, rather than change something.
          setFormError("We could not reach the server. Check your connection and try again.");
          setState("editing");
        }
      })();
    },
    [endpoint, method, onSuccess, redirectTo, router, validate],
  );

  return { state, errors, formError, submit, accepted };
}
