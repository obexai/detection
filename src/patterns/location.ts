import type { PiiPattern } from "../types.js";

/** Location-based PII patterns */
export const locationPatterns: PiiPattern[] = [
  // UK postcode — A9 9AA, A99 9AA, A9A 9AA, AA9 9AA, AA99 9AA, AA9A 9AA
  {
    type: "uk_postcode",
    regex: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/giu,
    confidence: 0.85,
  },
];
