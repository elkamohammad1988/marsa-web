import { describe, it, expect } from "vitest";
import {
  checkPassword,
  createSessionToken,
  getAdminConfig,
  safeEqual,
  verifySessionToken,
} from "@/lib/admin-auth";

const SECRET = "0123456789abcdef0123456789abcdef";
const config = { password: "correct-horse", secret: SECRET };

describe("getAdminConfig", () => {
  it("stays disabled unless both values are present", () => {
    expect(getAdminConfig({})).toBeNull();
    expect(getAdminConfig({ ADMIN_PASSWORD: "correct-horse" })).toBeNull();
    expect(getAdminConfig({ ADMIN_SESSION_SECRET: SECRET })).toBeNull();
  });

  it("rejects weak values rather than running with them", () => {
    expect(getAdminConfig({ ADMIN_PASSWORD: "short", ADMIN_SESSION_SECRET: SECRET })).toBeNull();
    expect(
      getAdminConfig({ ADMIN_PASSWORD: "correct-horse", ADMIN_SESSION_SECRET: "tooshort" }),
    ).toBeNull();
  });

  it("accepts a strong pair", () => {
    expect(
      getAdminConfig({ ADMIN_PASSWORD: "correct-horse", ADMIN_SESSION_SECRET: SECRET }),
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
    expect(await checkPassword("correct-horse", config)).toBe(true);
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
