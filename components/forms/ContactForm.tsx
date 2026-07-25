"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField, SelectField, TextareaField, Honeypot } from "./fields";
import { useFormSubmit } from "./useSubmit";
import { validateContact, CONTACT_TOPICS, type ContactTopic } from "@/lib/validation";

const TOPIC_LABELS: Record<ContactTopic, string> = {
  general: "General enquiry",
  sales: "Talk to sales",
  support: "Customer support",
  compliance: "Compliance / legal",
  press: "Press & media",
};

export function ContactForm({ defaultTopic = "general" }: { defaultTopic?: ContactTopic }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState<ContactTopic>(defaultTopic);
  const [messageText, setMessageText] = useState("");
  const [hp, setHp] = useState("");
  const { state, errors, message, submit, setErrors } = useFormSubmit("/api/contact");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, email, company, topic, message: messageText };
    const result = validateContact(payload);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    await submit({ ...payload, hp });
  }

  if (state === "success") {
    return (
      <div className="rounded-card-lg border border-line bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-5 text-2xl font-bold text-ink">Message sent</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-muted">
          Thanks for reaching out. Our team will reply to{" "}
          <span className="font-medium text-ink">{email}</span> within one business day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card-lg border border-line bg-card p-6 shadow-card md:p-8"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
          placeholder="Jordan Rivera"
        />
        <TextField
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
          placeholder="you@company.com"
        />
        <TextField
          label="Company (optional)"
          name="company"
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          error={errors.company}
          placeholder="Acme Trading Ltd"
        />
        <SelectField
          label="How can we help?"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value as ContactTopic)}
        >
          {CONTACT_TOPICS.map((t) => (
            <option key={t} value={t}>
              {TOPIC_LABELS[t]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-5">
        <TextareaField
          label="Message"
          name="message"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          error={errors.message}
          required
          placeholder="Tell us a little about what you need…"
        />
      </div>

      <Honeypot value={hp} onChange={setHp} />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-6 w-full sm:w-auto"
        disabled={state === "submitting"}
      >
        {state === "submitting" ? "Sending…" : "Send message"}
      </Button>

      {message && state === "error" && (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
