import type { PiiPattern } from "../types.js";
import { luhn } from "./validators.js";

/** Credit/debit cards, IBANs, sort codes */
export const financialPatterns: PiiPattern[] = [
  // Credit card — Visa, Mastercard, Amex, Discover; validated by Luhn
  // Matches 13-19 digits with optional spaces/dashes in various groupings
  {
    type: "credit_card",
    regex: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[\s-]?\d{4,6}[\s-]?\d{4,5}[\s-]?\d{0,8}\b/gu,
    confidence: 0.9,
    validate: luhn,
  },

  // Debit card — Maestro, Visa Electron, etc.
  {
    type: "debit_card",
    regex: /\b(?:5018|5020|5038|5893|6304|6759|6761|6762|6763)[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{0,7}\b/gu,
    confidence: 0.85,
    validate: luhn,
  },

  // IBAN — 2 letter country code + 2 check digits + up to 30 alphanumeric
  {
    type: "iban",
    regex: /\b[A-Z]{2}\d{2}[\s]?[A-Z0-9]{4}[\s]?(?:[A-Z0-9]{4}[\s]?){1,7}[A-Z0-9]{1,4}\b/gu,
    confidence: 0.85,
  },

  // UK sort code — exactly 6 digits in XX-XX-XX format (requires separators)
  {
    type: "sort_code",
    regex: /\b\d{2}[-]\d{2}[-]\d{2}\b/gu,
    confidence: 0.6,
    validate: (value: string) => {
      // Reject if it looks like part of a date (year-month pattern)
      const digits = value.replace(/-/gu, "");
      const first2 = parseInt(digits.slice(0, 2), 10);
      // Sort codes start 01-99 but never look like a year prefix (19, 20)
      if (first2 === 19 || first2 === 20) return false;
      return true;
    },
  },
];
