import { describe, it, expect } from "vitest";
import {
  isEmail,
  validateSubscribe,
  validateLead,
  validateContact,
  validateRegistration,
  validateSignIn,
  validateEmailOnly,
  validateNewPassword,
  validateProfile,
  ACCOUNT_TYPES,
  CONTACT_TOPICS,
  MAX_PASSWORD_BYTES,
  MIN_ACCOUNT_PASSWORD_LENGTH,
} from "@/lib/validation";

/**
 * `lib/validation.ts` is the server-side source of truth for every byte the
 * public internet sends (`lib/api-forms.ts:50` re-runs it after the client has
 * already run it). Audit finding P5 called out that it had no tests at all.
 *
 * These assert the *outcome a user sees* — accepted or rejected, and which
 * field is named in the rejection — rather than the shape of the internals.
 */

/** The rejected field names, which is what a form actually renders. */
function fieldsWithErrors(result: ReturnType<typeof validateLead>): string[] {
  return result.success ? [] : Object.keys(result.errors).sort();
}

describe("isEmail", () => {
  it.each([
    "jane@acme.com",
    "karim.b@shop.ma",
    "a+tag@sub.domain.co.uk",
    "  spaced@example.com  ", // trimmed before testing
  ])("accepts %j", (value) => {
    expect(isEmail(value)).toBe(true);
  });

  it.each([
    "",
    "jane",
    "jane@",
    "@acme.com",
    "jane@acme", // no dot in the domain
    "jane@acme.c", // single-character TLD
    "jane doe@acme.com", // whitespace inside
    "jane@ac me.com",
  ])("rejects %j", (value) => {
    expect(isEmail(value)).toBe(false);
  });
});

describe("validateSubscribe", () => {
  it("accepts a valid address and returns it trimmed", () => {
    const result = validateSubscribe({ email: "  nina@example.com " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("nina@example.com");
  });

  it("requires an email address", () => {
    const result = validateSubscribe({});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.email).toBe("Email address is required.");
  });

  it("rejects a malformed address with a distinct message", () => {
    const result = validateSubscribe({ email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.email).toBe("Enter a valid email address.");
  });

  it("caps the address at 254 characters", () => {
    // Valid in shape, over the limit in length.
    const local = "a".repeat(250);
    const result = validateSubscribe({ email: `${local}@example.com` });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.email).toBe("Email address is too long.");
  });

  it("accepts an address of exactly 254 characters", () => {
    const local = "a".repeat(254 - "@example.com".length);
    const result = validateSubscribe({ email: `${local}@example.com` });
    expect(result.success).toBe(true);
  });

  it("ignores non-string input rather than throwing", () => {
    for (const email of [null, undefined, 42, {}, [], true]) {
      const result = validateSubscribe({ email });
      expect(result.success).toBe(false);
    }
  });
});

describe("validateLead", () => {
  const valid = {
    name: "Jane Doe",
    email: "jane@acme.com",
    accountType: "personal",
    country: "NL",
    consent: true,
  };

  it("accepts a complete personal application", () => {
    const result = validateLead(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jane Doe");
      expect(result.data.accountType).toBe("personal");
      expect(result.data.consent).toBe(true);
      // Absent optional fields are omitted, not stored as empty strings.
      expect(result.data.company).toBeUndefined();
      expect(result.data.plan).toBeUndefined();
    }
  });

  it("reports every failing field at once, not just the first", () => {
    const result = validateLead({});
    expect(fieldsWithErrors(result)).toEqual([
      "accountType",
      "consent",
      "country",
      "email",
      "name",
    ]);
  });

  describe("consent", () => {
    // The form posts JSON from fetch, but the same validator has to cope with
    // a urlencoded checkbox, which arrives as the string "on".
    it.each([true, "true", "on"])("accepts %j as consent given", (consent) => {
      expect(validateLead({ ...valid, consent }).success).toBe(true);
    });

    it.each([false, "false", "yes", "1", 1, null, undefined, ""])(
      "treats %j as consent withheld",
      (consent) => {
        const result = validateLead({ ...valid, consent });
        expect(result.success).toBe(false);
        if (!result.success)
          expect(result.errors.consent).toBe("Please accept the terms to continue.");
      },
    );
  });

  describe("accountType", () => {
    it.each(ACCOUNT_TYPES)("accepts the allowlisted value %j", (accountType) => {
      expect(validateLead({ ...valid, accountType, company: "Acme BV" }).success).toBe(true);
    });

    it.each(["admin", "PERSONAL", "enterprise", "", null])(
      "rejects %j rather than coercing it",
      (accountType) => {
        const result = validateLead({ ...valid, accountType });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.errors.accountType).toBe("Choose personal or business.");
      },
    );
  });

  describe("company is conditional on accountType", () => {
    it("requires a company name for a business account", () => {
      const result = validateLead({ ...valid, accountType: "business" });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.errors.company).toBe("Company name is required for business accounts.");
    });

    it("does not require one for a personal account", () => {
      expect(validateLead({ ...valid, accountType: "personal" }).success).toBe(true);
    });

    it("caps the company name at 120 characters", () => {
      const result = validateLead({
        ...valid,
        accountType: "business",
        company: "x".repeat(121),
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors.company).toBe("Company name is too long.");
    });
  });

  describe("name", () => {
    it("rejects a single character as too short", () => {
      const result = validateLead({ ...valid, name: "J" });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors.name).toBe("Name looks too short.");
    });

    it("caps the name at 100 characters", () => {
      const result = validateLead({ ...valid, name: "x".repeat(101) });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors.name).toBe("Name is too long.");
    });

    it("counts length after trimming, so padding cannot smuggle a long value", () => {
      expect(validateLead({ ...valid, name: `  ${"x".repeat(100)}  ` }).success).toBe(true);
    });
  });

  it("trims every stored string", () => {
    const result = validateLead({
      ...valid,
      name: "  Jane Doe  ",
      email: "  jane@acme.com  ",
      country: "  NL  ",
      accountType: "business",
      company: "  Acme BV  ",
      plan: "  scale  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        name: "Jane Doe",
        email: "jane@acme.com",
        country: "NL",
        company: "Acme BV",
        plan: "scale",
      });
    }
  });

  it("does not cap email length, unlike validateSubscribe", () => {
    // Documents current behaviour rather than endorsing it: validateSubscribe
    // caps the address at 254 characters and validateLead does not. Not a
    // security hole — the regex still rejects whitespace and requires a domain
    // — but the asymmetry is unintended. Recorded for the re-audit; not changed
    // here because Batch 1 is tests only and no AUDIT.md finding covers it.
    const local = "a".repeat(300);
    expect(validateLead({ ...valid, email: `${local}@example.com` }).success).toBe(true);
  });
});

describe("validateContact", () => {
  const valid = {
    name: "Karim B",
    email: "karim@shop.ma",
    topic: "support",
    message: "I need help connecting a multi-currency IBAN to my shop.",
  };

  it("accepts a complete enquiry", () => {
    const result = validateContact(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.topic).toBe("support");
  });

  describe("topic allowlist", () => {
    it.each(CONTACT_TOPICS)("keeps the allowlisted topic %j", (topic) => {
      const result = validateContact({ ...valid, topic });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.topic).toBe(topic);
    });

    it.each(["billing", "SALES", "<script>", "", null, undefined, 42])(
      "falls back to \"general\" for %j instead of rejecting or storing it",
      (topic) => {
        const result = validateContact({ ...valid, topic });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.topic).toBe("general");
      },
    );
  });

  describe("message", () => {
    it("requires a message", () => {
      const result = validateContact({ ...valid, message: "" });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors.message).toBe("Please add a short message.");
    });

    it("requires at least 10 characters", () => {
      const result = validateContact({ ...valid, message: "too short" }); // 9
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.errors.message).toBe("Tell us a little more (10+ characters).");
    });

    it("accepts exactly 10 characters", () => {
      expect(validateContact({ ...valid, message: "x".repeat(10) }).success).toBe(true);
    });

    it("caps the message at 4000 characters", () => {
      const result = validateContact({ ...valid, message: "x".repeat(4001) });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.errors.message).toBe("Message is too long (4000 characters max).");
    });

    it("accepts exactly 4000 characters", () => {
      expect(validateContact({ ...valid, message: "x".repeat(4000) }).success).toBe(true);
    });
  });

  it("caps the company name at 120 characters", () => {
    const result = validateContact({ ...valid, company: "x".repeat(121) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.company).toBe("Company name is too long.");
  });

  it("omits an empty company rather than storing an empty string", () => {
    const result = validateContact({ ...valid, company: "   " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.company).toBeUndefined();
  });

  it("reports every failing field at once", () => {
    const result = validateContact({});
    expect(result.success).toBe(false);
    if (!result.success)
      expect(Object.keys(result.errors).sort()).toEqual(["email", "message", "name"]);
  });
});

/* ------------------------------------------------------------------ */
/* Account credentials                                                 */
/* ------------------------------------------------------------------ */

/**
 * The same rules run in the browser for instant feedback and on the server as
 * the source of truth, so a person is never shown a rule that is not the one
 * that will be applied.
 */

describe("validateRegistration", () => {
  const valid = { email: "person@example.com", password: "a-long-enough-passphrase" };

  it("accepts an address and a long enough password", () => {
    const result = validateRegistration(valid);
    expect(result.success).toBe(true);
  });

  it("lower-cases the address, so one person is one account", () => {
    // Supabase treats addresses case-insensitively. Without this, the rate
    // limiter's per-account bucket would key `A@b.co` and `a@b.co` separately
    // and halve the protection on the account being attacked.
    const result = validateRegistration({ ...valid, email: "  Person@Example.COM " });
    if (result.success) expect(result.data.email).toBe("person@example.com");
  });

  it("requires a password long enough to be worth hashing", () => {
    const result = validateRegistration({
      ...valid,
      password: "a".repeat(MIN_ACCOUNT_PASSWORD_LENGTH - 1),
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.password).toContain(String(MIN_ACCOUNT_PASSWORD_LENGTH));
  });

  it("accepts a password of exactly the minimum length", () => {
    expect(
      validateRegistration({ ...valid, password: "b".repeat(MIN_ACCOUNT_PASSWORD_LENGTH) }).success,
    ).toBe(true);
  });

  it("refuses a password past bcrypt's 72-byte ceiling rather than truncating it", () => {
    // bcrypt ignores everything past 72 bytes, so a 200-character passphrase
    // is exactly as strong as its first 72 — and two passphrases sharing that
    // prefix both sign in. Accepting it would be a security property quietly
    // weaker than the length bar implies.
    const result = validateRegistration({ ...valid, password: "x".repeat(MAX_PASSWORD_BYTES + 1) });
    expect(result.success).toBe(false);
  });

  it("counts bytes, not characters, against that ceiling", () => {
    // 40 emoji are 40 characters and 160 bytes.
    const result = validateRegistration({ ...valid, password: "🔐".repeat(40) });
    expect(result.success).toBe(false);
  });

  it("refuses a password that is the address itself", () => {
    const result = validateRegistration({
      email: "a-long-address@example.com",
      password: "A-Long-Address@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.password).toContain("email address");
  });

  it("never trims a password", () => {
    // Spaces are legitimate password characters. Trimming means a password
    // accepted at registration is rejected at sign-in.
    const padded = "  a-long-enough-passphrase  ";
    const result = validateRegistration({ ...valid, password: padded });
    if (result.success) expect(result.data.password).toBe(padded);
  });

  it("treats the name as optional but bounded", () => {
    expect(validateRegistration(valid).success).toBe(true);
    expect(validateRegistration({ ...valid, fullName: "x" }).success).toBe(false);
    expect(validateRegistration({ ...valid, fullName: "y".repeat(101) }).success).toBe(false);
  });

  it("reports every failing field at once", () => {
    const result = validateRegistration({ email: "nope", password: "short", fullName: "x" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(Object.keys(result.errors).sort()).toEqual(["email", "fullName", "password"]);
  });
});

describe("validateSignIn", () => {
  it("checks presence and shape, not the password rules", () => {
    // Applying the rules here would lock out anybody whose existing password
    // predates a raised bar, at the one screen where they can do nothing about
    // it — and would say that the address is a real account.
    const result = validateSignIn({ email: "person@example.com", password: "old" });
    expect(result.success).toBe(true);
  });

  it("still requires both fields", () => {
    const result = validateSignIn({});
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.errors).sort()).toEqual(["email", "password"]);
  });

  it("rejects an address that is not one", () => {
    expect(validateSignIn({ email: "nope", password: "something" }).success).toBe(false);
  });
});

describe("validateEmailOnly", () => {
  it("accepts a valid address and normalises it", () => {
    const result = validateEmailOnly({ email: " Person@Example.com " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("person@example.com");
  });

  it("rejects a missing or malformed address", () => {
    expect(validateEmailOnly({}).success).toBe(false);
    expect(validateEmailOnly({ email: "nope" }).success).toBe(false);
  });
});

describe("validateNewPassword", () => {
  it("applies the same length rules as registration", () => {
    expect(validateNewPassword({ password: "a-long-enough-passphrase" }).success).toBe(true);
    expect(validateNewPassword({ password: "short" }).success).toBe(false);
  });

  it("compares against an address the caller supplies from the session", () => {
    // The form never asks for an address; the session has one, so the rule is
    // still enforceable.
    const password = "person-long@example.com";
    expect(validateNewPassword({ password }).success).toBe(true);
    expect(validateNewPassword({ password }, "person-long@example.com").success).toBe(false);
  });
});

describe("validateProfile", () => {
  it("accepts a name and clears it when empty", () => {
    const named = validateProfile({ fullName: "Jordan Rivera" });
    if (named.success) expect(named.data.fullName).toBe("Jordan Rivera");

    const cleared = validateProfile({ fullName: "   " });
    expect(cleared.success).toBe(true);
    if (cleared.success) expect(cleared.data.fullName).toBeNull();
  });

  it("bounds the name at both ends", () => {
    expect(validateProfile({ fullName: "x" }).success).toBe(false);
    expect(validateProfile({ fullName: "y".repeat(101) }).success).toBe(false);
  });

  it("silently drops anything else it is given", () => {
    // The escalation this closes: a role in the request body reaching the
    // database. It cannot, because the validated payload has no field for it.
    const result = validateProfile({ fullName: "Jordan", role: "admin", email: "new@x.co" });
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).toEqual(["fullName"]);
  });
});
