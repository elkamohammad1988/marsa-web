"use client";

import { useState } from "react";

export type SubmitState = "idle" | "submitting" | "success" | "error";

type SubmitReturn = {
  state: SubmitState;
  errors: Record<string, string>;
  message: string;
  submit: (payload: Record<string, unknown>) => Promise<boolean>;
  reset: () => void;
  setErrors: (errors: Record<string, string>) => void;
};

/**
 * Shared submission state machine for the on-site forms. Talks to the JSON
 * API routes and maps their responses to field-level errors (422) or a
 * top-level message (400/429/5xx/network), so every form gets consistent
 * loading / success / error handling.
 */
export function useFormSubmit(endpoint: string): SubmitReturn {
  const [state, setState] = useState<SubmitState>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  async function submit(payload: Record<string, unknown>): Promise<boolean> {
    setState("submitting");
    setErrors({});
    setMessage("");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: {
        ok?: boolean;
        persisted?: boolean;
        error?: string;
        errors?: Record<string, string>;
      } = await res.json().catch(() => ({}));

      if (res.ok) {
        // A 2xx is not on its own proof the submission was stored. The API
        // returns 503 when storage fails, but this check is the backstop: if a
        // response ever reports a non-durable write, it is an error state, not
        // a success screen. Showing "we'll be in touch" for a record that does
        // not exist is the one outcome this form must never produce.
        if (data.ok === false || data.persisted === false) {
          setMessage(
            "We could not save your details, so nothing has been recorded. Please try again.",
          );
          setState("error");
          return false;
        }
        setState("success");
        return true;
      }

      if (res.status === 422 && data.errors) {
        setErrors(data.errors);
        setMessage("Please fix the highlighted fields and try again.");
        setState("error");
        return false;
      }

      setMessage(data.error ?? "Something went wrong. Please try again.");
      setState("error");
      return false;
    } catch {
      setMessage("Network error — please check your connection and try again.");
      setState("error");
      return false;
    }
  }

  function reset() {
    setState("idle");
    setErrors({});
    setMessage("");
  }

  return { state, errors, message, submit, reset, setErrors };
}
