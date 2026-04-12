import type { PiiPattern } from "../types.js";
import { nhsCheckDigit } from "./validators.js";

/** UK government identifiers: NI, NHS, UTR, passport */
export const ukGovPatterns: PiiPattern[] = [
  // National Insurance number — AB 12 34 56 C
  {
    type: "national_insurance",
    regex: /\b(?!BG|GB|NK|KN|TN|NT|ZZ)[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/giu,
    confidence: 0.9,
  },

  // NHS number — 10 digits, validated by modulus 11
  {
    type: "nhs_number",
    regex: /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/gu,
    confidence: 0.7,
    validate: nhsCheckDigit,
  },

  // UTR (Unique Taxpayer Reference) — 10 digits
  {
    type: "utr",
    regex: /\b\d{5}\s?\d{5}\b/gu,
    confidence: 0.4, // Low — just 10 digits, needs NER context to confirm
  },

  // UK passport — 9 digits
  {
    type: "passport",
    regex: /\b\d{9}\b/gu,
    confidence: 0.3, // Very low — just 9 digits, almost always needs context
  },
];
