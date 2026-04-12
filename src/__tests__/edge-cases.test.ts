import { describe, it, expect } from "vitest";
import { PiiDetector } from "../index.js";

const detector = new PiiDetector({ sensitivity: "medium" });

describe("edge cases", () => {
  it("handles empty string", () => {
    const result = detector.scan("");
    expect(result.entities).toHaveLength(0);
    expect(result.redacted).toBe("");
    expect(result.score).toBe(0);
  });

  it("handles whitespace-only string", () => {
    const result = detector.scan("   \n\t  ");
    expect(result.entities).toHaveLength(0);
  });

  it("handles single character", () => {
    const result = detector.scan("a");
    expect(result.entities).toHaveLength(0);
  });

  it("handles PII-only input", () => {
    const result = detector.scan("john@test.com");
    const emails = result.entities.filter((e) => e.type === "email");
    expect(emails.length).toBeGreaterThan(0);
    expect(emails[0].value).toBe("john@test.com");
  });

  it("handles repeated same PII", () => {
    const result = detector.scan("a@b.com a@b.com a@b.com");
    const emails = result.entities.filter((e) => e.type === "email");
    // Each occurrence is a separate entity (different positions)
    expect(emails.length).toBe(3);
  });

  it("handles string with null bytes", () => {
    const result = detector.scan("hello\x00world");
    // Should not crash
    expect(result).toBeDefined();
    expect(result.entities).toBeDefined();
  });

  it("handles string with control characters", () => {
    const result = detector.scan("test\x01\x02\x03@example.com");
    // Should not crash
    expect(result).toBeDefined();
  });

  it("handles very long string without PII (under size limit)", () => {
    const text = "a".repeat(50_000);
    const result = detector.scan(text);
    expect(result.entities).toHaveLength(0);
    expect(result.score).toBe(0);
  });

  it("handles text that is only numbers", () => {
    const result = detector.scan("12345");
    // Should not crash, may or may not match patterns depending on sensitivity
    expect(result).toBeDefined();
  });

  it("handles the word 'null'", () => {
    const result = detector.scan("null");
    expect(result.entities).toHaveLength(0);
  });

  it("handles the word 'undefined'", () => {
    const result = detector.scan("undefined");
    expect(result.entities).toHaveLength(0);
  });
});
