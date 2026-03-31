import { describe, it, expect } from "vitest";
import { PiiDetector } from "../index.js";

const detector = new PiiDetector({ sensitivity: "medium" });

// ── Person Names ─────────────────────────────────────────────

describe("NER - person names", () => {
  it("detects a person name in prose", () => {
    const r = detector.scan("I spoke with Michael Johnson about the project");
    const names = r.entities.filter((e) => e.type === "person_name");
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(names[0].source).toBe("ner");
    expect(names[0].confidence).toBeGreaterThan(0);
    expect(names[0].confidence).toBeLessThan(1);
  });

  it("detects multiple person names", () => {
    const r = detector.scan(
      "Meeting with Sarah Connor and James Wilson on Monday",
    );
    const names = r.entities.filter((e) => e.type === "person_name");
    expect(names.length).toBeGreaterThanOrEqual(2);
  });

  it("does not flag common words as person names", () => {
    const r = detector.scan("The quick brown fox jumps over the lazy dog");
    const names = r.entities.filter((e) => e.type === "person_name");
    expect(names).toHaveLength(0);
  });
});

// ── Organizations ────────────────────────────────────────────

describe("NER - organizations", () => {
  it("detects organization names", () => {
    const r = detector.scan(
      "She works at Goldman Sachs in the trading division",
    );
    const orgs = r.entities.filter((e) => e.type === "organization");
    expect(orgs.length).toBeGreaterThanOrEqual(1);
    expect(orgs[0].source).toBe("ner");
  });
});

// ── Locations ────────────────────────────────────────────────

describe("NER - locations", () => {
  it("detects location names", () => {
    const r = detector.scan("He moved from London to New York last year");
    const locs = r.entities.filter((e) => e.type === "location");
    expect(locs.length).toBeGreaterThanOrEqual(1);
    expect(locs[0].source).toBe("ner");
  });
});

// ── Two-Pass Integration ─────────────────────────────────────

describe("NER - two-pass integration", () => {
  it("detects both regex PII and NER entities in the same text", () => {
    const r = detector.scan(
      "John Smith emailed john.smith@example.com from 192.168.1.1",
    );
    const names = r.entities.filter((e) => e.type === "person_name");
    const emails = r.entities.filter((e) => e.type === "email");
    const ips = r.entities.filter((e) => e.type === "ip_address");

    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(emails).toHaveLength(1);
    expect(ips).toHaveLength(1);

    expect(names[0].source).toBe("ner");
    expect(emails[0].source).toBe("regex");
  });

  it("redacts both regex and NER entities", () => {
    const r = detector.scan(
      "Contact Sarah Wilson at sarah@test.com about the project",
    );
    expect(r.redacted).not.toContain("sarah@test.com");
    expect(r.redacted).toContain("[EMAIL");
    // NER name should also be redacted
    const names = r.entities.filter((e) => e.type === "person_name");
    if (names.length > 0) {
      expect(r.redacted).not.toContain(names[0].value);
      expect(r.redacted).toContain("[PERSON_NAME");
    }
  });

  it("deduplicates overlapping regex and NER detections", () => {
    const r = detector.scan("Please contact John Smith about this matter");
    const allEntities = r.entities;

    // No duplicate spans — same start position should not appear twice
    const starts = allEntities.map((e) => e.start);
    const uniqueStarts = [...new Set(starts)];
    expect(starts.length).toBe(uniqueStarts.length);
  });
});

// ── Entity Positions ─────────────────────────────────────────

describe("NER - entity positions", () => {
  it("provides correct start and end positions", () => {
    const text = "Ask Michael Jordan about the deal";
    const r = detector.scan(text);
    const names = r.entities.filter((e) => e.type === "person_name");

    expect(names.length).toBeGreaterThanOrEqual(1);
    const name = names[0];
    // The value at [start, end) must match the entity value
    expect(text.slice(name.start, name.end)).toBe(name.value);
  });
});

// ── Configuration ────────────────────────────────────────────

describe("NER - configuration", () => {
  it("respects entity type filtering", () => {
    const emailOnly = new PiiDetector({ entities: ["email"] });
    const r = emailOnly.scan("John Smith emailed john@test.com");

    expect(r.entities.filter((e) => e.type === "email")).toHaveLength(1);
    expect(r.entities.filter((e) => e.type === "person_name")).toHaveLength(0);
  });

  it("respects exclude configuration", () => {
    const noNames = new PiiDetector({ exclude: ["person_name"] });
    const r = noNames.scan("John Smith emailed john@test.com");

    expect(r.entities.filter((e) => e.type === "email")).toHaveLength(1);
    expect(r.entities.filter((e) => e.type === "person_name")).toHaveLength(0);
  });

  it("respects sensitivity threshold", () => {
    // NER person_name confidence is 0.70. Low sensitivity threshold is 0.80.
    const lowSens = new PiiDetector({ sensitivity: "low" });
    const r = lowSens.scan("Meeting with Sarah Connor next Tuesday");

    const names = r.entities.filter((e) => e.type === "person_name");
    expect(names).toHaveLength(0);
  });
});

// ── Performance ──────────────────────────────────────────────

describe("NER - performance", () => {
  it("combined regex + NER scan completes in under 50ms", () => {
    const text =
      "John Smith from Goldman Sachs in London emailed john@test.com " +
      "with card 4111 1111 1111 1111 from IP 192.168.1.1. " +
      "His NI is AB 12 34 56 C and postcode SW1A 1AA.";

    const r = detector.scan(text);
    expect(r.latencyMs).toBeLessThan(50);
    expect(r.entities.length).toBeGreaterThan(3);
  });

  it("NER on clean text stays under 50ms", () => {
    const text =
      "The quarterly financial results showed strong growth across all sectors. " +
      "Revenue increased by 15% compared to the previous quarter. " +
      "The board expressed confidence in the company's strategic direction.";

    const r = detector.scan(text);
    expect(r.latencyMs).toBeLessThan(50);
  });
});
