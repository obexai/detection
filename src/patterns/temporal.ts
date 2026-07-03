import type { PiiPattern } from "../types.js";

/** Date of birth patterns */
export const temporalPatterns: PiiPattern[] = [
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (shape-ambiguous with MM/DD, high sensitivity only)
  {
    type: "date_of_birth",
    regex: /\b(?:0[1-9]|[12]\d|3[01])[\/\-.](?:0[1-9]|1[0-2])[\/\-.](?:19|20)\d{2}\b/gu,
    confidence: 0.45, // Dates are ambiguous without context; cannot distinguish from MM/DD format
  },

  // YYYY-MM-DD (ISO format)
  {
    type: "date_of_birth",
    regex: /\b(?:19|20)\d{2}[\/\-.](?:0[1-9]|1[0-2])[\/\-.](?:0[1-9]|[12]\d|3[01])\b/gu,
    confidence: 0.5,
  },

  // MM/DD/YYYY (US format), day 01-12 — shape-ambiguous with DD/MM, high sensitivity only
  {
    type: "date_of_birth",
    regex: /\b(?:0[1-9]|1[0-2])[\/\-.](?:0[1-9]|1[0-2])[\/\-.](?:19|20)\d{2}\b/gu,
    confidence: 0.45,
  },

  // MM/DD/YYYY (US format), day 13-31 — cannot be misread as DD/MM, fires at medium
  {
    type: "date_of_birth",
    regex: /\b(?:0[1-9]|1[0-2])[\/\-.](?:1[3-9]|2\d|3[01])[\/\-.](?:19|20)\d{2}\b/gu,
    confidence: 0.6,
  },
];
