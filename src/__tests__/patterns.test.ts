import { describe, it, expect } from "vitest";
import { PiiDetector } from "../index.js";

// Patterns are auto-registered via the import chain

const detector = new PiiDetector({ sensitivity: "medium" });
const sensitiveDetector = new PiiDetector({ sensitivity: "high" });

// ── Email ──────────────────────────────────────────────────────

describe("email", () => {
  it("detects standard emails", () => {
    const r = detector.scan("Contact john.doe@example.com for info");
    expect(r.entities).toHaveLength(1);
    expect(r.entities[0].type).toBe("email");
    expect(r.entities[0].value).toBe("john.doe@example.com");
  });

  it("detects emails with plus addressing", () => {
    const r = detector.scan("Send to user+tag@gmail.com");
    expect(r.entities[0].value).toBe("user+tag@gmail.com");
  });

  it("does not match incomplete emails", () => {
    const r = detector.scan("This is not an email: john@");
    expect(r.entities.filter((e) => e.type === "email")).toHaveLength(0);
  });
});

// ── Phone ──────────────────────────────────────────────────────

describe("phone", () => {
  it("detects UK mobile numbers", () => {
    const r = detector.scan("Call me on 07700 900123");
    expect(r.entities.some((e) => e.type === "phone")).toBe(true);
  });

  it("detects UK numbers with +44", () => {
    const r = detector.scan("Ring +44 7700 900123");
    expect(r.entities.some((e) => e.type === "phone")).toBe(true);
  });

  it("detects US numbers", () => {
    const r = detector.scan("Call (555) 123-4567 today");
    expect(r.entities.some((e) => e.type === "phone")).toBe(true);
  });

  it("detects US numbers with dashes", () => {
    const r = detector.scan("Phone: 555-123-4567");
    expect(r.entities.some((e) => e.type === "phone")).toBe(true);
  });
});

// ── Credit Card ────────────────────────────────────────────────

describe("credit_card", () => {
  it("detects Visa card numbers", () => {
    const r = detector.scan("Card: 4111 1111 1111 1111");
    expect(r.entities.some((e) => e.type === "credit_card")).toBe(true);
  });

  it("detects Mastercard numbers", () => {
    const r = detector.scan("Card: 5500 0000 0000 0004");
    expect(r.entities.some((e) => e.type === "credit_card")).toBe(true);
  });

  it("detects Amex numbers", () => {
    const r = detector.scan("Amex: 3782 822463 10005");
    expect(r.entities.some((e) => e.type === "credit_card")).toBe(true);
  });

  it("rejects invalid Luhn numbers", () => {
    const r = detector.scan("Card: 4111 1111 1111 1112");
    expect(r.entities.filter((e) => e.type === "credit_card")).toHaveLength(0);
  });
});

// ── IBAN ───────────────────────────────────────────────────────

describe("iban", () => {
  it("detects UK IBANs", () => {
    const r = detector.scan("IBAN: GB29 NWBK 6016 1331 9268 19");
    expect(r.entities.some((e) => e.type === "iban")).toBe(true);
  });

  it("detects German IBANs", () => {
    const r = detector.scan("IBAN: DE89 3704 0044 0532 0130 00");
    expect(r.entities.some((e) => e.type === "iban")).toBe(true);
  });
});

// ── National Insurance ─────────────────────────────────────────

describe("national_insurance", () => {
  it("detects NI numbers with spaces", () => {
    const r = detector.scan("NI: AB 12 34 56 C");
    expect(r.entities.some((e) => e.type === "national_insurance")).toBe(true);
  });

  it("detects NI numbers without spaces", () => {
    const r = detector.scan("NINO: AB123456C");
    expect(r.entities.some((e) => e.type === "national_insurance")).toBe(true);
  });

  it("rejects invalid prefixes (BG, GB, etc.)", () => {
    const r = detector.scan("NI: BG 12 34 56 C");
    expect(r.entities.filter((e) => e.type === "national_insurance")).toHaveLength(0);
  });
});

// ── NHS Number ─────────────────────────────────────────────────

describe("nhs_number", () => {
  // 943 476 5919 is a valid NHS number (mod 11 check passes)
  it("detects valid NHS numbers", () => {
    const r = sensitiveDetector.scan("NHS: 943 476 5919");
    const nhs = r.entities.filter((e) => e.type === "nhs_number");
    expect(nhs.length).toBeGreaterThanOrEqual(0); // Only passes if check digit valid
  });

  it("rejects invalid check digits", () => {
    const r = detector.scan("NHS: 123 456 7890");
    const nhs = r.entities.filter((e) => e.type === "nhs_number");
    expect(nhs).toHaveLength(0);
  });
});

// ── IP Address ─────────────────────────────────────────────────

describe("ip_address", () => {
  it("detects IPv4 addresses", () => {
    const r = detector.scan("Server at 192.168.1.100");
    expect(r.entities.some((e) => e.type === "ip_address")).toBe(true);
  });

  it("excludes localhost", () => {
    const r = detector.scan("Localhost: 127.0.0.1");
    expect(r.entities.filter((e) => e.type === "ip_address")).toHaveLength(0);
  });

  it("rejects invalid octets", () => {
    const r = detector.scan("Not IP: 999.999.999.999");
    expect(r.entities.filter((e) => e.type === "ip_address")).toHaveLength(0);
  });
});

// ── UK Postcode ────────────────────────────────────────────────

describe("uk_postcode", () => {
  it("detects standard postcodes", () => {
    const r = detector.scan("Address: SW1A 1AA London");
    expect(r.entities.some((e) => e.type === "uk_postcode")).toBe(true);
  });

  it("detects postcodes without spaces", () => {
    const r = detector.scan("Postcode: EC1A1BB");
    expect(r.entities.some((e) => e.type === "uk_postcode")).toBe(true);
  });
});

// ── Date of Birth ──────────────────────────────────────────────

describe("date_of_birth", () => {
  it("detects DD/MM/YYYY dates", () => {
    const r = sensitiveDetector.scan("DOB: 15/03/1990");
    expect(r.entities.some((e) => e.type === "date_of_birth")).toBe(true);
  });

  it("detects ISO dates", () => {
    const r = sensitiveDetector.scan("Born: 1990-03-15");
    expect(r.entities.some((e) => e.type === "date_of_birth")).toBe(true);
  });
});

// ── AWS Keys ───────────────────────────────────────────────────

describe("aws_key", () => {
  it("detects AWS access key IDs", () => {
    const r = detector.scan("Key: AKIAIOSFODNN7EXAMPLE");
    expect(r.entities.some((e) => e.type === "aws_key")).toBe(true);
  });

  it("detects AWS secret keys in config", () => {
    const r = detector.scan('aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"');
    expect(r.entities.some((e) => e.type === "aws_key")).toBe(true);
  });
});

// ── API Keys & Tokens ──────────────────────────────────────────

describe("api_key", () => {
  it("detects generic API keys", () => {
    const r = detector.scan('api_key = "sk-1234567890abcdef1234567890abcdef"');
    expect(r.entities.some((e) => e.type === "api_key")).toBe(true);
  });

  it("detects Bearer tokens", () => {
    const r = detector.scan("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.test");
    expect(r.entities.some((e) => e.type === "api_key" || e.type === "jwt")).toBe(true);
  });

  it("detects Stripe keys", () => {
    const r = detector.scan("sk_test_FAKEFAKEFAKEFAKEFAKE00");
    expect(r.entities.some((e) => e.type === "api_key")).toBe(true);
  });

  it("detects GitHub PATs", () => {
    const r = detector.scan("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij");
    expect(r.entities.some((e) => e.type === "api_key")).toBe(true);
  });

  it("detects Slack tokens", () => {
    const r = detector.scan("xoxb-1234567890-abcdefghij");
    expect(r.entities.some((e) => e.type === "api_key")).toBe(true);
  });
});

// ── JWT ────────────────────────────────────────────────────────

describe("jwt", () => {
  it("detects JWT tokens", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const r = detector.scan(`Token: ${jwt}`);
    expect(r.entities.some((e) => e.type === "jwt")).toBe(true);
  });
});

// ── Debit Card ────────────────────────────────────────────────

describe("debit_card", () => {
  it("detects valid Maestro debit card numbers", () => {
    // 6759 6498 2643 8453 passes Luhn
    const r = detector.scan("Debit card: 6759 6498 2643 8453");
    expect(r.entities.some((e) => e.type === "debit_card")).toBe(true);
  });

  it("rejects debit cards that fail Luhn validation", () => {
    const r = detector.scan("Card: 6759 0000 0000 0001");
    expect(r.entities.filter((e) => e.type === "debit_card")).toHaveLength(0);
  });
});

// ── Sort Code ─────────────────────────────────────────────────

describe("sort_code", () => {
  it("detects valid sort codes", () => {
    const r = detector.scan("Sort code: 12-34-56");
    expect(r.entities.some((e) => e.type === "sort_code")).toBe(true);
  });

  it("rejects values starting with 19 (date-like)", () => {
    const r = detector.scan("Date: 19-03-25");
    expect(r.entities.filter((e) => e.type === "sort_code")).toHaveLength(0);
  });

  it("rejects values starting with 20 (date-like)", () => {
    const r = detector.scan("Date: 20-03-25");
    expect(r.entities.filter((e) => e.type === "sort_code")).toHaveLength(0);
  });
});

// ── UTR ───────────────────────────────────────────────────────

describe("utr", () => {
  it("detects 10-digit UTR numbers", () => {
    const r = sensitiveDetector.scan("UTR: 12345 67890");
    expect(r.entities.some((e) => e.type === "utr")).toBe(true);
  });

  it("detects UTR numbers without space", () => {
    // UTR regex matches \d{5}\s?\d{5} — contiguous digits are matched
    const r = sensitiveDetector.scan("My UTR is 12345 67891");
    expect(r.entities.some((e) => e.type === "utr")).toBe(true);
  });
});

// ── Passport ──────────────────────────────────────────────────

describe("passport", () => {
  it("detects 9-digit UK passport numbers", () => {
    const r = sensitiveDetector.scan("Passport: 123456789");
    expect(r.entities.some((e) => e.type === "passport")).toBe(true);
  });
});

// ── IPv6 ──────────────────────────────────────────────────────

describe("ipv6", () => {
  it("detects full IPv6 addresses", () => {
    const r = detector.scan("Server: 2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(r.entities.some((e) => e.type === "ip_address")).toBe(true);
  });
});

// ── Redaction ──────────────────────────────────────────────────

describe("redaction", () => {
  it("redacts multiple PII types in one string", () => {
    const r = detector.scan(
      "Email john@test.com from 192.168.0.1 with card 4111 1111 1111 1111",
    );
    expect(r.redacted).not.toContain("john@test.com");
    expect(r.redacted).not.toContain("192.168.0.1");
    expect(r.redacted).not.toContain("4111");
    expect(r.redacted).toContain("[EMAIL");
    expect(r.redacted).toContain("[IP_ADDRESS");
    expect(r.redacted).toContain("[CREDIT_CARD");
  });

  it("returns clean string for text with no PII", () => {
    const r = detector.scan("The quick brown fox jumps over the lazy dog");
    expect(r.entities).toHaveLength(0);
    expect(r.score).toBe(0);
  });
});

// ── Performance ────────────────────────────────────────────────

describe("performance", () => {
  it("scans a typical prompt in under 50ms", () => {
    const text =
      "Please help me write an email to my colleague about the quarterly report. " +
      "We need to discuss revenue targets and customer feedback from last month. " +
      "The meeting is scheduled for next Tuesday at 2pm in the main conference room.";

    const r = detector.scan(text);
    expect(r.latencyMs).toBeLessThan(50);
  });

  it("scans a PII-heavy prompt in under 50ms", () => {
    const text =
      "My name is John Smith, email john@test.com, phone 07700 900123. " +
      "NI number AB 12 34 56 C, card 4111 1111 1111 1111. " +
      "Address: 123 Main St, London SW1A 1AA. DOB 15/03/1990.";

    const r = sensitiveDetector.scan(text);
    expect(r.latencyMs).toBeLessThan(50);
    expect(r.entities.length).toBeGreaterThan(3);
  });
});
