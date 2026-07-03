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

  it("detects UK numbers with a 2-digit international area code (London)", () => {
    const r = detector.scan("You can reach the office at +44 20 7946 0958.");
    expect(r.entities.some((e) => e.type === "phone" && e.value === "+44 20 7946 0958")).toBe(true);
  });

  it("does not misread a 16-digit order ID as a phone number", () => {
    const r = detector.scan("Order ID 4111222233334444 shipped yesterday.");
    expect(r.entities.filter((e) => e.type === "phone")).toHaveLength(0);
  });

  it("does not misread a bad-Luhn debit card reference as a phone number", () => {
    const r = detector.scan("Reference 6759123456789019 does not match any transaction.");
    expect(r.entities.filter((e) => e.type === "phone")).toHaveLength(0);
  });

  it("does not misread an invalid IBAN as a phone number", () => {
    const r = detector.scan("Batch code GB99ABCD12345678901234 failed validation.");
    expect(r.entities.filter((e) => e.type === "phone")).toHaveLength(0);
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

  it("rejects structurally valid IBANs with wrong check digits", () => {
    // GB00 has same BBAN as valid GB29 NWBK... but check digits 00 give mod-97 = 69, not 1
    const r = detector.scan("IBAN: GB00NWBK60161331926819");
    expect(r.entities.filter((e) => e.type === "iban")).toHaveLength(0);
  });

  it("rejects the GB00XXXX placeholder example from the review", () => {
    const r = detector.scan("IBAN: GB00XXXX00000000000000");
    expect(r.entities.filter((e) => e.type === "iban")).toHaveLength(0);
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
    expect(nhs.length).toBeGreaterThan(0);
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

  it("detects unambiguous US-format dates (day > 12) at medium sensitivity", () => {
    const r = detector.scan("Born 03/14/1991 per the US visa application.");
    expect(r.entities.some((e) => e.type === "date_of_birth" && e.value === "03/14/1991")).toBe(true);
  });

  it("does not detect ambiguous US-format dates (day <= 12) at medium sensitivity", () => {
    const r = detector.scan("Born 03/04/1991 per the US visa application.");
    expect(r.entities.filter((e) => e.type === "date_of_birth")).toHaveLength(0);
  });

  it("still detects ambiguous US-format dates (day <= 12) at high sensitivity", () => {
    const r = sensitiveDetector.scan("Born 03/04/1991 per the US visa application.");
    expect(r.entities.some((e) => e.type === "date_of_birth" && e.value === "03/04/1991")).toBe(true);
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

  it("entity value is the raw secret, not the surrounding key=value context", () => {
    const secret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
    const r = detector.scan(`aws_secret_access_key = "${secret}"`);
    const entity = r.entities.find((e) => e.type === "aws_key" && e.value === secret);
    expect(entity).toBeDefined();
    expect(entity!.value).toBe(secret);
  });

  it("redaction preserves the variable name and only replaces the secret value", () => {
    const r = detector.scan('aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"');
    expect(r.redacted).toContain("aws_secret_access_key");
    expect(r.redacted).not.toContain("wJalrXUtnFEMI");
    expect(r.redacted).toContain("[AWS_KEY");
  });

  it("works without quotes", () => {
    const secret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
    const r = detector.scan(`AWS_SECRET_ACCESS_KEY=${secret}`);
    const entity = r.entities.find((e) => e.type === "aws_key" && e.value === secret);
    expect(entity).toBeDefined();
  });
});

// ── API Keys & Tokens ──────────────────────────────────────────

describe("api_key", () => {
  it("detects generic API keys", () => {
    const r = detector.scan('api_key = "sk-1234567890abcdef1234567890abcdef"');
    expect(r.entities.some((e) => e.type === "api_key")).toBe(true);
  });

  it("entity value is the raw token, not the surrounding key=value context", () => {
    const token = "sk-1234567890abcdef1234567890abcdef";
    const r = detector.scan(`api_key = "${token}"`);
    const entity = r.entities.find((e) => e.type === "api_key" && e.value === token);
    expect(entity).toBeDefined();
    expect(entity!.value).toBe(token);
  });

  it("redaction preserves the variable name and only replaces the token value", () => {
    const r = detector.scan('api_key = "sk-1234567890abcdef1234567890abcdef"');
    expect(r.redacted).toContain("api_key");
    expect(r.redacted).not.toContain("sk-1234567890abcdef");
    expect(r.redacted).toContain("[API_KEY");
  });

  it("detects Bearer tokens", () => {
    const r = detector.scan("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.test");
    expect(r.entities.some((e) => e.type === "api_key" || e.type === "jwt")).toBe(true);
  });

  it("detects Stripe keys", () => {
    const r = detector.scan("sk_test_FAKEFAKEFAKEFAKEFAKE00");
    expect(r.entities.some((e) => e.type === "api_key")).toBe(true);
  });

  it("detects GitHub PATs (ghp_ classic)", () => {
    const r = detector.scan("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij");
    expect(r.entities.some((e) => e.type === "api_key")).toBe(true);
  });

  it("detects GitHub OAuth tokens (gho_)", () => {
    const r = detector.scan("gho_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij");
    expect(r.entities.some((e) => e.type === "api_key")).toBe(true);
  });

  it("detects GitHub user-to-server tokens (ghu_)", () => {
    const r = detector.scan("ghu_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij");
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
  it("detects valid sort codes at high sensitivity", () => {
    const r = sensitiveDetector.scan("Sort code: 12-34-56");
    expect(r.entities.some((e) => e.type === "sort_code")).toBe(true);
  });

  it("detects Barclays sort codes (20-xx-xx range) at high sensitivity", () => {
    const r = sensitiveDetector.scan("Sort code: 20-47-82");
    expect(r.entities.some((e) => e.type === "sort_code")).toBe(true);
  });

  it("does not fire on date strings at medium sensitivity", () => {
    const r = detector.scan("Logged 12-03-24 and processed 20-06-26");
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

  it("detects compressed IPv6 addresses", () => {
    const r = detector.scan("Connected from 2001:db8::1");
    expect(r.entities.some((e) => e.type === "ip_address")).toBe(true);
  });

  it("detects link-local IPv6 addresses", () => {
    const r = detector.scan("Interface fe80::1 connected");
    expect(r.entities.some((e) => e.type === "ip_address")).toBe(true);
  });

  it("excludes IPv6 loopback (::1)", () => {
    const r = detector.scan("Loopback: ::1");
    expect(r.entities.filter((e) => e.type === "ip_address")).toHaveLength(0);
  });

  it("detects the full address when groups follow the compression marker", () => {
    const r = detector.scan("IPv6 client address 2001:db8::ff00:42:8329 connected.");
    const ips = r.entities.filter((e) => e.type === "ip_address");
    expect(ips).toHaveLength(1);
    expect(ips[0].value).toBe("2001:db8::ff00:42:8329");
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
