import type { PiiPattern } from "../types.js";

/** Email and phone patterns */
export const contactPatterns: PiiPattern[] = [
  // Email — RFC 5322 simplified
  {
    type: "email",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gu,
    confidence: 0.95,
  },

  // UK phone: +44, 07xxx, 01xxx, 02xxx formats
  {
    type: "phone",
    regex: /(?:\+44\s?|0)(?:7\d{3}|\d{3,4})[\s.-]?\d{3}[\s.-]?\d{3,4}\b/gu,
    confidence: 0.8,
  },

  // US phone: (555) 123-4567, 555-123-4567, +1 555 123 4567
  {
    type: "phone",
    regex: /(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/gu,
    confidence: 0.7,
  },

  // International phone: +XX followed by 7-14 digits
  {
    type: "phone",
    regex: /\+(?:3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])\s?\d[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}\b/gu,
    confidence: 0.6,
  },
];
