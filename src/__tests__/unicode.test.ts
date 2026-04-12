import { describe, it, expect } from "vitest";
import { PiiDetector } from "../index.js";

const detector = new PiiDetector({ sensitivity: "medium" });

describe("unicode support", () => {
  it("detects email mixed with accented text", () => {
    const result = detector.scan("Müller's email is test@example.com");
    const emails = result.entities.filter((e) => e.type === "email");
    expect(emails.length).toBeGreaterThan(0);
    expect(emails[0].value).toBe("test@example.com");
  });

  it("detects phone mixed with CJK characters", () => {
    const result = detector.scan("电话 07700 900123 谢谢");
    const phones = result.entities.filter((e) => e.type === "phone");
    expect(phones.length).toBeGreaterThan(0);
  });

  it("detects credit card mixed with emoji", () => {
    const result = detector.scan("Card 4111111111111111 🎉");
    const cards = result.entities.filter((e) => e.type === "credit_card");
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].value.replace(/\s/g, "")).toBe("4111111111111111");
  });

  it("correctly redacts PII in multi-byte text", () => {
    const result = detector.scan("Herr Müller: test@example.com 日本語テスト");
    expect(result.redacted).toContain("[EMAIL");
    expect(result.redacted).not.toContain("test@example.com");
    // CJK text preserved
    expect(result.redacted).toContain("日本語テスト");
  });

  it("entity indices are correct with multi-byte characters", () => {
    const text = "café test@example.com end";
    const result = detector.scan(text);
    const email = result.entities.find((e) => e.type === "email");
    expect(email).toBeDefined();
    expect(text.slice(email!.start, email!.end)).toBe("test@example.com");
  });

  it("handles text with surrogate pairs (emoji)", () => {
    const text = "🎄🎅 Contact: user@test.org 🎁";
    const result = detector.scan(text);
    const email = result.entities.find((e) => e.type === "email");
    expect(email).toBeDefined();
    expect(email!.value).toBe("user@test.org");
  });
});
