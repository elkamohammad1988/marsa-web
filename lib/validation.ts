/**
 * Dependency-free validation shared by client forms and server route
 * handlers. Keeping it framework-agnostic means the exact same rules run in
 * the browser (for instant feedback) and on the server (as the source of
 * truth), with no extra bundle weight.
 */

export type ValidationOk<T> = { success: true; data: T };
export type ValidationFail = { success: false; errors: Record<string, string> };
export type ValidationResult<T> = ValidationOk<T> | ValidationFail;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/* ------------------------------------------------------------------ */
/* Newsletter subscription                                             */
/* ------------------------------------------------------------------ */

export type SubscribeInput = { email: string; consent?: boolean };

export function validateSubscribe(input: Record<string, unknown>): ValidationResult<SubscribeInput> {
  const errors: Record<string, string> = {};
  const email = str(input.email);

  if (!email) errors.email = "Email address is required.";
  else if (!isEmail(email)) errors.email = "Enter a valid email address.";
  else if (email.length > 254) errors.email = "Email address is too long.";

  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { email } };
}

/* ------------------------------------------------------------------ */
/* Get Started / account lead                                          */
/* ------------------------------------------------------------------ */

export const ACCOUNT_TYPES = ["personal", "business"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type LeadInput = {
  name: string;
  email: string;
  accountType: AccountType;
  country: string;
  company?: string;
  plan?: string;
  consent: boolean;
};

export function validateLead(input: Record<string, unknown>): ValidationResult<LeadInput> {
  const errors: Record<string, string> = {};
  const name = str(input.name);
  const email = str(input.email);
  const accountType = str(input.accountType);
  const country = str(input.country);
  const company = str(input.company);
  const plan = str(input.plan);
  const consent = input.consent === true || input.consent === "true" || input.consent === "on";

  if (!name) errors.name = "Please tell us your name.";
  else if (name.length < 2) errors.name = "Name looks too short.";
  else if (name.length > 100) errors.name = "Name is too long.";

  if (!email) errors.email = "Email address is required.";
  else if (!isEmail(email)) errors.email = "Enter a valid email address.";

  if (!ACCOUNT_TYPES.includes(accountType as AccountType))
    errors.accountType = "Choose personal or business.";

  if (!country) errors.country = "Select your country of residence.";

  if (accountType === "business" && !company)
    errors.company = "Company name is required for business accounts.";

  if (company.length > 120) errors.company = "Company name is too long.";

  if (!consent) errors.consent = "Please accept the terms to continue.";

  if (Object.keys(errors).length) return { success: false, errors };

  return {
    success: true,
    data: {
      name,
      email,
      accountType: accountType as AccountType,
      country,
      company: company || undefined,
      plan: plan || undefined,
      consent: true,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Contact / sales enquiry                                             */
/* ------------------------------------------------------------------ */

export const CONTACT_TOPICS = ["general", "sales", "support", "compliance", "press"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export type ContactInput = {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  company?: string;
};

export function validateContact(input: Record<string, unknown>): ValidationResult<ContactInput> {
  const errors: Record<string, string> = {};
  const name = str(input.name);
  const email = str(input.email);
  const topicRaw = str(input.topic) || "general";
  const message = str(input.message);
  const company = str(input.company);

  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > 100) errors.name = "Name is too long.";

  if (!email) errors.email = "Email address is required.";
  else if (!isEmail(email)) errors.email = "Enter a valid email address.";

  const topic = (CONTACT_TOPICS as readonly string[]).includes(topicRaw)
    ? (topicRaw as ContactTopic)
    : "general";

  if (!message) errors.message = "Please add a short message.";
  else if (message.length < 10) errors.message = "Tell us a little more (10+ characters).";
  else if (message.length > 4000) errors.message = "Message is too long (4000 characters max).";

  if (company.length > 120) errors.company = "Company name is too long.";

  if (Object.keys(errors).length) return { success: false, errors };

  return {
    success: true,
    data: { name, email, topic, message, company: company || undefined },
  };
}
