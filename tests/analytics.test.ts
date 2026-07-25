import { describe, it, expect } from "vitest";
import {
  computeFunnel,
  createAnalyticsStore,
  FUNNEL_STEPS,
  isFunnelStep,
  type DemoEvent,
} from "@/lib/analytics";

function ev(sessionId: string, step: DemoEvent["step"]): DemoEvent {
  return { sessionId, step, at: "2026-07-24T00:00:00.000Z" };
}

describe("isFunnelStep", () => {
  it("accepts the six funnel steps and rejects anything else", () => {
    for (const s of FUNNEL_STEPS) expect(isFunnelStep(s)).toBe(true);
    expect(isFunnelStep("welcome")).toBe(false);
    expect(isFunnelStep("")).toBe(false);
    expect(isFunnelStep(42)).toBe(false);
    expect(isFunnelStep(undefined)).toBe(false);
  });
});

describe("computeFunnel", () => {
  it("returns an all-zero report for no events", () => {
    const r = computeFunnel([]);
    expect(r.starts).toBe(0);
    expect(r.completions).toBe(0);
    expect(r.completionRate).toBe(0);
    expect(r.biggestDrop).toBeNull();
    expect(r.rows).toHaveLength(6);
    expect(r.rows.every((row) => row.sessions === 0)).toBe(true);
  });

  it("counts UNIQUE sessions per step (duplicates are idempotent)", () => {
    const events = [
      ev("a", "start"),
      ev("a", "start"), // duplicate — must not double-count
      ev("b", "start"),
      ev("a", "kyc"),
    ];
    const r = computeFunnel(events);
    expect(r.starts).toBe(2);
    expect(r.rows.find((x) => x.step === "kyc")!.sessions).toBe(1);
  });

  it("computes completion rate and per-step drop-off", () => {
    // 10 start, 5 reach done → 50% completion.
    const events: DemoEvent[] = [];
    for (let i = 0; i < 10; i++) events.push(ev(`s${i}`, "start"));
    for (let i = 0; i < 8; i++) events.push(ev(`s${i}`, "kyc"));
    for (let i = 0; i < 8; i++) events.push(ev(`s${i}`, "iban"));
    for (let i = 0; i < 6; i++) events.push(ev(`s${i}`, "payout"));
    for (let i = 0; i < 6; i++) events.push(ev(`s${i}`, "convert"));
    for (let i = 0; i < 5; i++) events.push(ev(`s${i}`, "done"));

    const r = computeFunnel(events);
    expect(r.starts).toBe(10);
    expect(r.completions).toBe(5);
    expect(r.completionRate).toBe(50);

    const kyc = r.rows.find((x) => x.step === "kyc")!;
    expect(kyc.sessions).toBe(8);
    expect(kyc.pctOfStart).toBe(80);
    expect(kyc.dropPct).toBe(20); // 10 → 8

    // Biggest single drop is start→kyc (20%) tied with payout→? here 8→6=25%.
    expect(r.biggestDrop).not.toBeNull();
    expect(r.biggestDrop!.pct).toBe(25); // iban(8) → payout(6)
    expect(r.biggestDrop!.from).toBe("iban");
    expect(r.biggestDrop!.to).toBe("payout");
  });

  it("never divides by zero when a later step has no starts", () => {
    const r = computeFunnel([ev("x", "kyc")]);
    expect(r.starts).toBe(0);
    expect(r.completionRate).toBe(0);
    expect(Number.isFinite(r.rows[1].pctOfStart)).toBe(true);
  });
});

describe("createAnalyticsStore — provider selection", () => {
  it("uses the file store with no database configured", () => {
    expect(createAnalyticsStore({}).provider).toBe("file");
  });

  it("uses postgres when configured", () => {
    expect(
      createAnalyticsStore({
        SUPABASE_URL: "https://x.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "k",
      }).provider,
    ).toBe("postgres");
  });
});
