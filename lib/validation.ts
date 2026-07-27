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
/* Account credentials                                                 */
/* ------------------------------------------------------------------ */

/**
 * Minimum password length.
 *
 * Twelve rather than the eight most sites still ask for, and rather than the
 * sixteen `lib/admin-session.ts` requires. The admin floor is high because it
 * is one shared secret, chosen once by an operator, guarding everybody's data;
 * this one is chosen by an ordinary person for their own account and is
 * protected by per-address rate limiting on the sign-in route. Twelve is where
 * length stops being the weakest part of the system.
 *
 * Supabase's own default is six. This is enforced here as well, because the
 * dashboard setting can be changed without a deploy and the rule a visitor is
 * shown should be the one that actually applies.
 */
export const MIN_ACCOUNT_PASSWORD_LENGTH = 12;

/**
 * Maximum password length, in bytes rather than characters.
 *
 * GoTrue hashes with bcrypt, which silently ignores everything past 72 bytes:
 * a 200-character passphrase is exactly as strong as its first 72 bytes, and
 * two different passphrases sharing a 72-byte prefix both sign in. Rejecting
 * the input is honest; accepting it and truncating is a security property
 * quietly weaker than the one the length bar implied.
 */
export const MAX_PASSWORD_BYTES = 72;

const passwordEncoder = new TextEncoder();

/**
 * Password rules, in the order a person hits them.
 *
 * Not trimmed, unlike every other field here: leading and trailing spaces are
 * legitimate password characters, and silently removing them means a password
 * that was accepted at registration is rejected at sign-in.
 */
function passwordError(password: unknown, email: string): string | undefined {
  if (typeof password !== "string" || password.length === 0) return "Choose a password.";
  if (password.length < MIN_ACCOUNT_PASSWORD_LENGTH)
    return `Use at least ${MIN_ACCOUNT_PASSWORD_LENGTH} characters.`;
  if (passwordEncoder.encode(password).length > MAX_PASSWORD_BYTES)
    return `That is too long — ${MAX_PASSWORD_BYTES} bytes is the most that is hashed.`;
  // A password identical to the username is the one guess every attacker makes
  // first, and it is free to rule out.
  if (email && password.toLowerCase() === email.toLowerCase())
    return "Your password cannot be your email address.";
  return undefined;
}

export type RegistrationInput = { email: string; password: string; fullName?: string };

export function validateRegistration(
  input: Record<string, unknown>,
): ValidationResult<RegistrationInput> {
  const errors: Record<string, string> = {};
  const email = str(input.email).toLowerCase();
  const fullName = str(input.fullName);

  if (!email) errors.email = "Email address is required.";
  else if (!isEmail(email)) errors.email = "Enter a valid email address.";
  else if (email.length > 254) errors.email = "Email address is too long.";

  const password = passwordError(input.password, email);
  if (password) errors.password = password;

  if (fullName && fullName.length < 2) errors.fullName = "Name looks too short.";
  else if (fullName.length > 100) errors.fullName = "Name is too long.";

  if (Object.keys(errors).length) return { success: false, errors };

  return {
    success: true,
    data: {
      email,
      password: input.password as string,
      fullName: fullName || undefined,
    },
  };
}

export type SignInInput = { email: string; password: string };

/**
 * Sign-in checks presence and shape only.
 *
 * Applying the password *rules* here would tell an attacker that a given
 * address predates a change of policy, and would lock out anybody whose
 * existing password no longer meets a raised bar — at the sign-in form, where
 * there is nothing they can do about it.
 */
export function validateSignIn(input: Record<string, unknown>): ValidationResult<SignInInput> {
  const errors: Record<string, string> = {};
  const email = str(input.email).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";

  if (!email) errors.email = "Email address is required.";
  else if (!isEmail(email)) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Enter your password.";

  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { email, password } };
}

export type EmailOnlyInput = { email: string };

/** Used by password recovery and by re-sending a confirmation email. */
export function validateEmailOnly(input: Record<string, unknown>): ValidationResult<EmailOnlyInput> {
  const errors: Record<string, string> = {};
  const email = str(input.email).toLowerCase();

  if (!email) errors.email = "Email address is required.";
  else if (!isEmail(email)) errors.email = "Enter a valid email address.";
  else if (email.length > 254) errors.email = "Email address is too long.";

  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { email } };
}

export type NewPasswordInput = { password: string };

/**
 * A new password, set by someone who has already proved who they are.
 *
 * There is no email to compare against — the session says who this is — so the
 * "not your own address" rule is applied by the caller, which has one.
 */
export function validateNewPassword(
  input: Record<string, unknown>,
  email = "",
): ValidationResult<NewPasswordInput> {
  const password = passwordError(input.password, email);
  if (password) return { success: false, errors: { password } };
  return { success: true, data: { password: input.password as string } };
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export type ProfileInput = { fullName: string | null };

/**
 * The editable half of a profile.
 *
 * `email` is absent on purpose: changing it is a credential change that has to
 * go through Supabase's own re-confirmation flow, not a profile update. `role`
 * is absent for a stronger reason — the database will not accept it from a
 * browser session at all (migration 004), and a field here would imply
 * otherwise.
 *
 * An empty name clears the field rather than failing, so somebody who set a
 * name can remove it again.
 */
export function validateProfile(input: Record<string, unknown>): ValidationResult<ProfileInput> {
  const fullName = str(input.fullName);

  if (fullName && fullName.length < 2)
    return { success: false, errors: { fullName: "Name looks too short." } };
  if (fullName.length > 100)
    return { success: false, errors: { fullName: "Name is too long." } };

  return { success: true, data: { fullName: fullName || null } };
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
