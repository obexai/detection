import { describe, it, expect, vi, afterEach } from "vitest";
import { PiiDetector } from "../index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("large input guard", () => {
  it("scans input under the default 100KB limit normally", () => {
    const detector = new PiiDetector({ sensitivity: "medium" });
    // ~50KB of text with an email
    const text = "a".repeat(50_000) + " user@test.com";
    const result = detector.scan(text);
    const emails = result.entities.filter((e) => e.type === "email");
    expect(emails.length).toBeGreaterThan(0);
  });

  it("skips scan for input over 100KB", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const detector = new PiiDetector({ sensitivity: "medium" });
    // ~110KB of text with PII that should be skipped
    const text = "a".repeat(110_000) + " user@test.com";
    const result = detector.scan(text);

    expect(result.entities).toHaveLength(0);
    expect(result.redacted).toBe(text); // original text preserved
    expect(result.score).toBe(0);
    expect(result.latencyMs).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("skipping PII scan"),
    );
  });

  it("respects custom maxInputBytes", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const detector = new PiiDetector({ maxInputBytes: 100 });
    const text = "a".repeat(200);
    const result = detector.scan(text);

    expect(result.entities).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns fast for oversized input", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const detector = new PiiDetector({ sensitivity: "medium" });
    const text = "a".repeat(200_000);

    const start = performance.now();
    detector.scan(text);
    const elapsed = performance.now() - start;

    // Should return nearly instantly (no regex/NER work)
    expect(elapsed).toBeLessThan(50);
  });
});

describe("scan timeout warning", () => {
  it("warns when scan exceeds threshold", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Use a very low threshold to guarantee it fires
    const detector = new PiiDetector({ scanWarnMs: 0.001 });
    detector.scan("Check this email: slow@test.com");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("PII scan took"),
    );
  });

  it("does not warn for fast scans with default threshold", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const detector = new PiiDetector({ sensitivity: "medium" });
    detector.scan("Hello world");

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("disables warning when scanWarnMs is 0", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const detector = new PiiDetector({ scanWarnMs: 0 });
    detector.scan("Check this email: test@example.com");

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
