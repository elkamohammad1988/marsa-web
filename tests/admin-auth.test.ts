import { describe, it, expect } from "vitest";
import {
  checkPassword,
  createSessionToken,
  getAdminConfig,
  safeEqual,
  verifySessionToken,
  MIN_PASSWORD_LENGTH,
  MIN_SECRET_LENGTH,
} from "@/lib/admin-auth";

const SECRET = "0123456789abcdef0123456789abcdef";
// 16 characters — the floor raised from 8 by audit S1. One shared password
// with no lockout and no second factor guards every submitted person's name,
// email, country and company.
const PASSWORD = "correct-horse-16";
const config = { password: PASSWORD, secret: SECRET };

describe("getAdminConfig", () => {
  it("stays disabled unless both values are present", () => {
    expect(getAdminConfig({})).toBeNull();
    expect(getAdminConfig({ ADMIN_PASSWORD: PASSWORD })).toBeNull();
    expect(getAdminConfig({ ADMIN_SESSION_SECRET: SECRET })).toBeNull();
  });

  it("rejects weak values rather than running with them", () => {
    expect(getAdminConfig({ ADMIN_PASSWORD: "short", ADMIN_SESSION_SECRET: SECRET })).toBeNull();
    // The old floor was 8. A password that used to be accepted must not be.
    expect(
      getAdminConfig({ ADMIN_PASSWORD: "eightch!", ADMIN_SESSION_SECRET: SECRET }),
    ).toBeNull();
    expect(
      getAdminConfig({ ADMIN_PASSWORD: "a".repeat(MIN_PASSWORD_LENGTH - 1), ADMIN_SESSION_SECRET: SECRET }),
    ).toBeNull();
    expect(
      getAdminConfig({ ADMIN_PASSWORD: PASSWORD, ADMIN_SESSION_SECRET: "tooshort" }),
    ).toBeNull();
  });

  it("accepts a password of exactly the minimum length", () => {
    expect(
      getAdminConfig({
        ADMIN_PASSWORD: "b".repeat(MIN_PASSWORD_LENGTH),
        ADMIN_SESSION_SECRET: "c".repeat(MIN_SECRET_LENGTH),
      }),
    ).not.toBeNull();
  });

  it("accepts a strong pair", () => {
    expect(
      getAdminConfig({ ADMIN_PASSWORD: PASSWORD, ADMIN_SESSION_SECRET: SECRET }),
    ).toEqual(config);
  });
});

describe("safeEqual", () => {
  it("compares values without leaking length via early exit", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("checkPassword", () => {
  it("accepts the configured password and nothing else", async () => {
    expect(await checkPassword(PASSWORD, config)).toBe(true);
    expect(await checkPassword("wrong-horse", config)).toBe(false);
    expect(await checkPassword("", config)).toBe(false);
    expect(await checkPassword(undefined, config)).toBe(false);
    expect(await checkPassword(42, config)).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a freshly issued token", async () => {
    const { token, maxAge } = await createSessionToken(SECRET);
    expect(maxAge).toBe(8 * 60 * 60);
    expect(await verifySessionToken(token, SECRET)).toBe(true);
  });

  it("rejects a token signed with another secret", async () => {
    const { token } = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, "ffffffffffffffffffffffffffffffff")).toBe(false);
  });

  it("rejects tampered payloads", async () => {
    const { token } = await createSessionToken(SECRET);
    const [, signature] = token.split(".");
    const forged = `${Math.floor(Date.now() / 1000) + 999_999}.${signature}`;
    expect(await verifySessionToken(forged, SECRET)).toBe(false);
  });

  it("rejects expired sessions", async () => {
    const issuedAt = Date.now() - 9 * 60 * 60 * 1000;
    const { token } = await createSessionToken(SECRET, issuedAt);
    expect(await verifySessionToken(token, SECRET)).toBe(false);
  });

  it("rejects missing or malformed tokens", async () => {
    expect(await verifySessionToken(undefined, SECRET)).toBe(false);
    expect(await verifySessionToken("", SECRET)).toBe(false);
    expect(await verifySessionToken("nonsense", SECRET)).toBe(false);
  });
});
