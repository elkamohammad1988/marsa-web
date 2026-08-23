"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField, SelectField, TextareaField, Honeypot } from "./fields";
import { useDemoSubmit } from "./useDemoSubmit";
import { DemoSubmissionNotice } from "./DemoSubmissionNotice";
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
  const { state, errors, submit } = useDemoSubmit(validateContact);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Read the honeypot exactly as the server would: a bot that fills it gets
    // a silent no-op rather than an error it can learn from.
    if (hp.trim() !== "") return;
    submit({ name, email, company, topic, message: messageText });
  }

  if (state === "accepted") {
    return (
      <DemoSubmissionNotice
        title="That would have reached the team"
        endpoint="POST /api/contact"
        steps={[
          {
            label: "Re-validate on the server",
            detail: "Topic against an allowlist, message capped at 4,000 characters.",
          },
          {
            label: "Rate-limit and screen for bots",
            detail: "Five per minute per caller, plus a hidden honeypot field.",
          },
          {
            label: "Store, then email the team",
            detail: "Persisted before anyone is notified, with your address as the reply-to.",
          },
        ]}
        primary={{ label: "Try the interactive demo", href: "/demo" }}
        secondary={{ label: "Read the FAQ", href: "/faq" }}
      />
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

      <Button type="submit" variant="primary" size="lg" className="mt-6 w-full sm:w-auto">
        Send message
      </Button>

      {/* Before the reader types, not only after they submit — the same rule
          the newsletter form has always followed. See the note in
          `GetStartedForm.tsx`. */}
      <p className="mt-4 text-xs text-ink-subtle">
        Checked against the real validation rules, then{" "}
        <span className="font-medium text-ink-muted">discarded</span>.
      </p>
    </form>
  );
}
