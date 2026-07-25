import { describe, it, expect } from "vitest";
import { escapeCsvValue, submissionsToCsv, toCsv } from "@/lib/csv";
import type { StoredSubmission } from "@/lib/storage";

describe("escapeCsvValue", () => {
  it("quotes values and doubles embedded quotes", () => {
    expect(escapeCsvValue('say "hi", now')).toBe('"say ""hi"", now"');
  });

  it("neutralises spreadsheet formulas", () => {
    expect(escapeCsvValue("=1+1")).toBe("\"'=1+1\"");
    expect(escapeCsvValue("+44 600 000")).toBe("\"'+44 600 000\"");
    expect(escapeCsvValue("@handle")).toBe("\"'@handle\"");
    expect(escapeCsvValue("-5")).toBe("\"'-5\"");
  });

  it("renders empty for null and undefined", () => {
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(undefined)).toBe("");
  });

  it("serialises objects as JSON", () => {
    expect(escapeCsvValue({ a: 1 })).toBe('"{""a"":1}"');
  });
});

describe("toCsv", () => {
  it("writes a header row and CRLF line endings", () => {
    const csv = toCsv([{ a: "1", b: "2" }], ["a", "b"]);
    expect(csv).toBe('"a","b"\r\n"1","2"');
  });

  it("leaves missing columns as empty (unquoted) fields", () => {
    const csv = toCsv([{ a: "1" }], ["a", "b"]);
    expect(csv).toBe('"a","b"\r\n"1",');
  });
});

describe("submissionsToCsv", () => {
  const items: StoredSubmission[] = [
    {
      id: "1",
      kind: "lead",
      createdAt: "2026-07-23T10:00:00.000Z",
      data: { email: "a@b.com", name: "A" },
    },
    {
      id: "2",
      kind: "lead",
      createdAt: "2026-07-24T10:00:00.000Z",
      data: { email: "c@d.com", country: "MA" },
    },
  ];

  it("unions the data keys across rows in a stable order", () => {
    const [header] = submissionsToCsv(items).split("\r\n");
    expect(header).toBe('"id","kind","createdAt","country","email","name"');
  });

  it("keeps every row and leaves gaps blank", () => {
    const lines = submissionsToCsv(items).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('"1","lead","2026-07-23T10:00:00.000Z",,"a@b.com","A"');
    expect(lines[2]).toBe('"2","lead","2026-07-24T10:00:00.000Z","MA","c@d.com",');
  });
});
