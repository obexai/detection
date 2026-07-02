/**
 * Hand-labeled eval corpus for the PII detection model card.
 *
 * Ground truth is written by hand, independent of the detector's actual
 * output, then checked against real `PiiDetector.scan()` runs. Where a
 * case's true label was wrong because of a mistaken assumption about regex
 * behavior it's fixed; where the detector genuinely misses or over-fires,
 * the case stays and the metric reports it honestly.
 *
 * `expected: []` means "this text should NOT trigger a detection of any
 * kind" — used for both clean prose baselines and hard-negative probes
 * (text that superficially resembles PII but isn't).
 */

export interface ExpectedEntity {
  type: string;
  value: string;
}

export interface EvalCase {
  id: string;
  category: string;
  text: string;
  expected: ExpectedEntity[];
  note?: string;
}

export const corpus: EvalCase[] = [
  // ---------------------------------------------------------------------
  // Email
  // ---------------------------------------------------------------------
  {
    id: "email-1",
    category: "email",
    text: "Please email me at jane.doe@example.com to confirm.",
    expected: [{ type: "email", value: "jane.doe@example.com" }],
  },
  {
    id: "email-2",
    category: "email",
    text: "Send receipts to billing+2026@acme.co.uk please.",
    expected: [{ type: "email", value: "billing+2026@acme.co.uk" }],
  },
  {
    id: "email-3",
    category: "email",
    text: "Contact support@mail.drask.dev for help.",
    expected: [{ type: "email", value: "support@mail.drask.dev" }],
  },
  {
    id: "email-4-fp-probe",
    category: "email",
    text: "The file is named report@2x.png for retina displays.",
    expected: [],
    note: "filename-like token with @ before an extension; regex has no concept of image-asset naming conventions",
  },
  {
    id: "email-5-fn-probe",
    category: "email",
    text: "reach me: j.smith[at]example[dot]com",
    expected: [{ type: "email", value: "j.smith[at]example[dot]com" }],
    note: "spam-dodging obfuscation defeats a literal @ / . regex — expected miss, documents a real limitation",
  },

  // ---------------------------------------------------------------------
  // Phone
  // ---------------------------------------------------------------------
  {
    id: "phone-1",
    category: "phone",
    text: "Call me on 07911 123456 when you land.",
    expected: [{ type: "phone", value: "07911 123456" }],
  },
  {
    id: "phone-2",
    category: "phone",
    text: "You can reach the office at +44 20 7946 0958.",
    expected: [{ type: "phone", value: "+44 20 7946 0958" }],
  },
  {
    id: "phone-3",
    category: "phone",
    text: "Their support line is (555) 123-4567.",
    expected: [{ type: "phone", value: "(555) 123-4567" }],
  },
  {
    id: "phone-4-fp-probe",
    category: "phone",
    text: "Your order reference is 020-794-6095, keep it for tracking.",
    expected: [],
    note: "order-reference number that happens to be UK-phone-shaped (020 area code); no way to distinguish without context",
  },
  {
    id: "phone-5",
    category: "phone",
    text: "Landline: 0161.496.0958 for the Manchester branch.",
    expected: [
      { type: "phone", value: "0161.496.0958" },
      { type: "location", value: "Manchester" },
    ],
  },

  // ---------------------------------------------------------------------
  // Credit card (Luhn-validated)
  // ---------------------------------------------------------------------
  {
    id: "cc-1-visa",
    category: "credit_card",
    text: "Card on file: 4111 1111 1111 1111, exp 09/28.",
    expected: [{ type: "credit_card", value: "4111 1111 1111 1111" }],
  },
  {
    id: "cc-2-mastercard",
    category: "credit_card",
    text: "Charge the Mastercard 5555-5555-5555-4444 for the deposit.",
    expected: [{ type: "credit_card", value: "5555-5555-5555-4444" }],
  },
  {
    id: "cc-3-amex",
    category: "credit_card",
    text: "Amex number 378282246310005 is on the invoice.",
    expected: [{ type: "credit_card", value: "378282246310005" }],
  },
  {
    id: "cc-4-discover",
    category: "credit_card",
    text: "Discover card 6011111111111117 was declined.",
    expected: [{ type: "credit_card", value: "6011111111111117" }],
  },
  {
    id: "cc-5-fp-probe-bad-luhn",
    category: "credit_card",
    text: "Typo'd card number 4111 1111 1111 1112 bounced at checkout.",
    expected: [],
    note: "correct prefix/length but fails Luhn — should NOT be flagged, tests the checksum validator",
  },
  {
    id: "cc-6-fp-probe-order-id",
    category: "credit_card",
    text: "Order ID 4111222233334444 shipped yesterday.",
    expected: [],
    note: "16-digit order ID that happens to start with a Visa prefix but fails Luhn",
  },

  // ---------------------------------------------------------------------
  // Debit card (Luhn-validated)
  // ---------------------------------------------------------------------
  {
    id: "dc-1-maestro",
    category: "debit_card",
    text: "Maestro debit 6759 1234 5678 9015 linked to the account.",
    expected: [{ type: "debit_card", value: "6759 1234 5678 9015" }],
  },
  {
    id: "dc-2",
    category: "debit_card",
    text: "Prepaid card 5893012345678902 needs topping up.",
    expected: [{ type: "debit_card", value: "5893012345678902" }],
  },
  {
    id: "dc-3-fp-probe-bad-luhn",
    category: "debit_card",
    text: "Reference 6759123456789019 does not match any transaction.",
    expected: [],
    note: "debit-card-shaped number with correct prefix but broken checksum",
  },

  // ---------------------------------------------------------------------
  // IBAN (mod-97 validated)
  // ---------------------------------------------------------------------
  {
    id: "iban-1-gb",
    category: "iban",
    text: "Wire the deposit to GB29 NWBK 6016 1331 9268 19.",
    expected: [{ type: "iban", value: "GB29 NWBK 6016 1331 9268 19" }],
  },
  {
    id: "iban-2-de",
    category: "iban",
    text: "Our German entity's IBAN is DE89370400440532013000.",
    expected: [{ type: "iban", value: "DE89370400440532013000" }],
  },
  {
    id: "iban-3-fp-probe",
    category: "iban",
    text: "Batch code GB99ABCD12345678901234 failed validation.",
    expected: [],
    note: "IBAN-shaped code with a check-digit combination that fails mod-97",
  },

  // ---------------------------------------------------------------------
  // UK National Insurance number
  // ---------------------------------------------------------------------
  {
    id: "ni-1",
    category: "national_insurance",
    text: "My National Insurance number is AB 12 34 56 C.",
    expected: [
      { type: "national_insurance", value: "AB 12 34 56 C" },
      { type: "organization", value: "National Insurance" },
    ],
  },
  {
    id: "ni-2-no-spaces",
    category: "national_insurance",
    text: "NI: JC123456D on the P60.",
    expected: [{ type: "national_insurance", value: "JC123456D" }],
  },
  {
    id: "ni-3-fp-probe-excluded-prefix",
    category: "national_insurance",
    text: "Internal code BG123456C was retired last year.",
    expected: [],
    note: "BG is an explicitly excluded prefix per HMRC allocation rules — tests the negative lookahead",
  },

  // ---------------------------------------------------------------------
  // NHS number (modulus-11 validated)
  // ---------------------------------------------------------------------
  {
    id: "nhs-1",
    category: "nhs_number",
    text: "Patient NHS number 400 123 4564 confirmed at check-in.",
    expected: [
      { type: "nhs_number", value: "400 123 4564" },
      { type: "organization", value: "NHS" },
    ],
  },
  {
    id: "nhs-2",
    category: "nhs_number",
    text: "NHS# 943-476-5986 on the referral letter.",
    expected: [
      { type: "nhs_number", value: "943-476-5986" },
      { type: "organization", value: "NHS" },
    ],
  },
  {
    id: "nhs-3-fp-probe-bad-checkdigit",
    category: "nhs_number",
    text: "Order quantity code 400 123 4569 printed on the label.",
    expected: [],
    note: "10-digit grouped number, correct shape, but fails the NHS modulus-11 check digit",
  },

  // ---------------------------------------------------------------------
  // UK sort code — high-sensitivity only (confidence 0.45, below medium's
  // 0.5 threshold by design, per the source comment in financial.ts)
  // ---------------------------------------------------------------------
  {
    id: "sortcode-1",
    category: "sort_code",
    text: "Sort code 20-45-67, account details attached.",
    expected: [{ type: "sort_code", value: "20-45-67" }],
    note: "no checksum exists for UK sort codes — this is a format-only match, expected to surface at high sensitivity only",
  },
  {
    id: "sortcode-2-fp-probe-date",
    category: "sort_code",
    text: "Meeting scheduled for 12-03-24, same time as usual.",
    expected: [],
    note: "date string that is shape-identical to a sort code — this is the exact false-positive risk the 0.45 confidence is tuned to avoid at medium sensitivity; at high sensitivity this is expected to over-fire",
  },

  // ---------------------------------------------------------------------
  // UTR — high-sensitivity only (confidence 0.4)
  // ---------------------------------------------------------------------
  {
    id: "utr-1",
    category: "utr",
    text: "My UTR is 12345 67890 for the self-assessment.",
    expected: [{ type: "utr", value: "12345 67890" }],
    note: "no checksum for UTRs either — format-only, high sensitivity only",
  },
  {
    id: "utr-2-fp-probe-invoice",
    category: "utr",
    text: "Invoice number 55512 34567 is attached.",
    expected: [],
    note: "10-digit grouped invoice number, shape-identical to a UTR — expected false positive at high sensitivity",
  },

  // ---------------------------------------------------------------------
  // Passport — high-sensitivity only (confidence 0.3)
  // ---------------------------------------------------------------------
  {
    id: "passport-1",
    category: "passport",
    text: "Passport number 123456789 was scanned at the gate.",
    expected: [{ type: "passport", value: "123456789" }],
    note: "bare 9-digit number, no checksum — the weakest-precision pattern in the engine by design",
  },
  {
    id: "passport-2-fp-probe-tracking",
    category: "passport",
    text: "Tracking number 987654321 shows delivered yesterday.",
    expected: [],
    note: "any bare 9-digit number matches this pattern — expected false positive at high sensitivity",
  },

  // ---------------------------------------------------------------------
  // IP address
  // ---------------------------------------------------------------------
  {
    id: "ip-1-v4",
    category: "ip_address",
    text: "The request came from 203.0.113.42 according to the logs.",
    expected: [{ type: "ip_address", value: "203.0.113.42" }],
  },
  {
    id: "ip-2-v6",
    category: "ip_address",
    text: "IPv6 client address 2001:db8::ff00:42:8329 connected.",
    expected: [{ type: "ip_address", value: "2001:db8::ff00:42:8329" }],
  },
  {
    id: "ip-3-fp-probe-localhost",
    category: "ip_address",
    text: "Dev server running on 127.0.0.1 for local testing.",
    expected: [],
    note: "loopback address explicitly excluded by the validator",
  },
  {
    id: "ip-4-fp-probe-semver",
    category: "ip_address",
    text: "Upgrade to package version 1.2.3.4 before deploying.",
    expected: [],
    note: "semver-shaped identifier that is numerically valid as an IPv4 address — genuine ambiguity the engine cannot resolve without context",
  },

  // ---------------------------------------------------------------------
  // UK postcode
  // ---------------------------------------------------------------------
  {
    id: "postcode-1",
    category: "uk_postcode",
    text: "Deliver to SW1A 1AA by Friday.",
    expected: [{ type: "uk_postcode", value: "SW1A 1AA" }],
  },
  {
    id: "postcode-2-no-space",
    category: "uk_postcode",
    text: "Registered address EC1A1BB, London.",
    expected: [
      { type: "uk_postcode", value: "EC1A1BB" },
      { type: "location", value: "London" },
    ],
  },
  {
    id: "postcode-3-fp-probe-batch-code",
    category: "uk_postcode",
    text: "Batch code M11AE printed on the packaging.",
    expected: [{ type: "uk_postcode", value: "M11AE" }],
    note: "genuinely postcode-shaped batch code — the engine cannot distinguish a real address from a coincidentally-shaped product code; kept as a documented limitation rather than a scoring case either way",
  },

  // ---------------------------------------------------------------------
  // Date of birth
  // ---------------------------------------------------------------------
  {
    id: "dob-1-uk-format",
    category: "date_of_birth",
    text: "Date of birth: 14/03/1991 as shown on the passport.",
    expected: [{ type: "date_of_birth", value: "14/03/1991" }],
  },
  {
    id: "dob-2-iso",
    category: "date_of_birth",
    text: "DOB 1991-03-14 recorded in the system.",
    expected: [{ type: "date_of_birth", value: "1991-03-14" }],
  },
  {
    id: "dob-3-us-format",
    category: "date_of_birth",
    text: "Born 03/14/1991 per the US visa application.",
    expected: [{ type: "date_of_birth", value: "03/14/1991" }],
    note: "US-format DOB pattern sits at confidence 0.45 — high sensitivity only",
  },
  {
    id: "dob-4-fp-probe-meeting-date",
    category: "date_of_birth",
    text: "The renewal is due 30/06/2027, mark your calendar.",
    expected: [],
    note: "any DD/MM/YYYY string matches regardless of whether it's actually a birth date — inherent ambiguity of a context-free date pattern",
  },

  // ---------------------------------------------------------------------
  // Secrets: AWS key, generic API key, Bearer token, JWT, Slack, GitHub, Stripe
  // ---------------------------------------------------------------------
  {
    id: "secret-1-aws-key-id",
    category: "aws_key",
    text: "export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE",
    expected: [{ type: "aws_key", value: "AKIAIOSFODNN7EXAMPLE" }],
  },
  {
    id: "secret-2-aws-secret",
    category: "aws_key",
    text: 'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
    expected: [{ type: "aws_key", value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" }],
  },
  {
    id: "secret-3-aws-secret-fn-probe",
    category: "aws_key",
    text: "The secret is wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEYVAL somewhere in the logs.",
    expected: [{ type: "aws_key", value: "wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEYVAL" }],
    note: "bare 40+ char secret-shaped token without the required 'aws_secret_access_key=' label — the lookbehind won't fire; documents that context-free secrets need the generic api_key pattern instead, and even that requires a label",
  },
  {
    id: "secret-4-api-key-labeled",
    category: "api_key",
    text: 'api_key: "sk_live_51H8xJ2eZvKYlo2CnQfake000000000000000"',
    expected: [{ type: "api_key", value: "sk_live_51H8xJ2eZvKYlo2CnQfake000000000000000" }],
  },
  {
    id: "secret-5-bearer",
    category: "api_key",
    text: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc123DEFghi456JKLmno",
    expected: [{ type: "api_key", value: "Bearer eyJhbGciOiJIUzI1NiJ9.abc123DEFghi456JKLmno" }],
  },
  {
    id: "secret-6-slack",
    category: "api_key",
    text: "Slack webhook token xoxb-1234567890-abcdefghijklmnop is active.",
    expected: [{ type: "api_key", value: "xoxb-1234567890-abcdefghijklmnop" }],
  },
  {
    id: "secret-7-github",
    category: "api_key",
    text: "GitHub PAT ghp_1234567890abcdefghijklmnopqrstuvwxyz used in CI.",
    expected: [
      { type: "api_key", value: "ghp_1234567890abcdefghijklmnopqrstuvwxyz" },
      { type: "organization", value: "GitHub" },
    ],
  },
  {
    id: "secret-8-stripe",
    category: "api_key",
    text: "Stripe test key sk_test_4eC39HqLyjWDarjtT1zdp7dc is in the .env file.",
    expected: [{ type: "api_key", value: "sk_test_4eC39HqLyjWDarjtT1zdp7dc" }],
    note: "'Stripe' here is not caught as an organization by NER — kept as api_key-only ground truth, consistent with the ner-3/Barclays finding that compromise.js's org gazetteer misses well-known payment/tech brands",
  },
  {
    id: "secret-9-jwt",
    category: "jwt",
    text: "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
    expected: [
      {
        type: "jwt",
        value:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
      },
    ],
  },
  {
    id: "secret-10-fp-probe-unlabeled-hex",
    category: "api_key",
    text: "The commit hash is a1b2c3d4e5f6789012345678901234567890abcd for this release.",
    expected: [],
    note: "long hex string without a recognized label prefix (git commit hash, not a secret) — should not be flagged",
  },

  // ---------------------------------------------------------------------
  // NER: person_name, organization, location
  // ---------------------------------------------------------------------
  {
    id: "ner-1-name",
    category: "person_name",
    text: "My name is Sarah Chen and I'd like to update my address.",
    expected: [{ type: "person_name", value: "Sarah Chen" }],
  },
  {
    id: "ner-2-name-org-location",
    category: "person_name",
    text: "James Whitfield from Barclays called about the London branch.",
    expected: [
      { type: "person_name", value: "James Whitfield" },
      { type: "organization", value: "Barclays" },
      { type: "location", value: "London" },
    ],
  },
  {
    id: "ner-3-org",
    category: "organization",
    text: "We're switching payment providers to Stripe next quarter.",
    expected: [{ type: "organization", value: "Stripe" }],
  },
  {
    id: "ner-4-location",
    category: "location",
    text: "The conference is being held in Manchester this year.",
    expected: [{ type: "location", value: "Manchester" }],
  },
  {
    id: "ner-5-fp-probe-sentence-initial",
    category: "person_name",
    text: "Thanks for your help today, really appreciate it.",
    expected: [],
    note: "no proper nouns at all; baseline check that capitalization alone doesn't trigger NER",
  },
  {
    id: "ner-6-fn-probe-informal",
    category: "person_name",
    text: "hey it's mike, can you call me back",
    expected: [{ type: "person_name", value: "mike" }],
    note: "lowercase informal name in a first-person-introduction pattern — compromise.js catches this via context, not just capitalization; kept as a positive data point rather than the miss originally assumed",
  },

  // ---------------------------------------------------------------------
  // Mixed realistic scenarios — closer to actual LLM prompt content,
  // exercises multiple entity types and the dedup/overlap logic together
  // ---------------------------------------------------------------------
  {
    id: "scenario-1-support-ticket",
    category: "mixed",
    text: "Hi, I'm Priya Patel. My account email is priya.patel@outlook.com and I'm based in Bristol. Can you check why my card 4111 1111 1111 1111 was declined?",
    expected: [
      { type: "person_name", value: "Priya Patel" },
      { type: "email", value: "priya.patel@outlook.com" },
      { type: "location", value: "Bristol" },
      { type: "credit_card", value: "4111 1111 1111 1111" },
    ],
  },
  {
    id: "scenario-2-hr-onboarding",
    category: "mixed",
    text: "New starter Tom Reilly, NI number AB 12 34 56 C, start date 01/09/2026, reporting to the Leeds office.",
    expected: [
      { type: "person_name", value: "Tom Reilly" },
      { type: "national_insurance", value: "AB 12 34 56 C" },
      { type: "date_of_birth", value: "01/09/2026" },
      { type: "location", value: "Leeds" },
    ],
    note: "start-date field happens to match the DOB pattern shape — an authentic false positive from context-free date matching",
  },
  {
    id: "scenario-3-devops-log",
    category: "mixed",
    text: "Deploy failed from 203.0.113.42, AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE was rejected, retry from IP 198.51.100.7.",
    expected: [
      { type: "ip_address", value: "203.0.113.42" },
      { type: "aws_key", value: "AKIAIOSFODNN7EXAMPLE" },
      { type: "ip_address", value: "198.51.100.7" },
    ],
  },
  {
    id: "scenario-4-clean-prose",
    category: "mixed",
    text: "The quarterly report shows revenue grew steadily and the team is optimistic about next year's targets.",
    expected: [],
    note: "clean baseline prose with no PII at all — general false-positive-free check",
  },
  {
    id: "scenario-5-nhs-referral",
    category: "mixed",
    text: "Referral for Mrs. Alina Kowalski, NHS number 943-476-5986, GP practice in Cardiff.",
    expected: [
      { type: "person_name", value: "Alina Kowalski" },
      { type: "nhs_number", value: "943-476-5986" },
      { type: "location", value: "Cardiff" },
      { type: "organization", value: "NHS" },
    ],
  },
];
