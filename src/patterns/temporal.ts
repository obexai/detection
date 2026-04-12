import type { PiiPattern } from "../types.js";

/** Date of birth patterns */
export const temporalPatterns: PiiPattern[] = [
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  {
    type: "date_of_birth",
    regex: /\b(?:0[1-9]|[12]\d|3[01])[\/\-.](?:0[1-9]|1[0-2])[\/\-.](?:19|20)\d{2}\b/gu,
    confidence: 0.5, // Dates are ambiguous without context
  },

  // YYYY-MM-DD (ISO format)
  {
    type: "date_of_birth",
    regex: /\b(?:19|20)\d{2}[\/\-.](?:0[1-9]|1[0-2])[\/\-.](?:0[1-9]|[12]\d|3[01])\b/gu,
    confidence: 0.5,
  },

  // MM/DD/YYYY (US format)
  {
    type: "date_of_birth",
    regex: /\b(?:0[1-9]|1[0-2])[\/\-.](?:0[1-9]|[12]\d|3[01])[\/\-.](?:19|20)\d{2}\b/gu,
    confidence: 0.45,
  },
];
