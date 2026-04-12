import type { PiiPattern } from "../types.js";

/** IP addresses and technical identifiers */
export const networkPatterns: PiiPattern[] = [
  // IPv4 — validated range 0-255 per octet
  {
    type: "ip_address",
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/gu,
    confidence: 0.8,
    validate: (value: string) => {
      // Exclude common non-PII IPs: localhost, broadcast, 0.0.0.0
      if (value === "127.0.0.1" || value === "0.0.0.0" || value === "255.255.255.255") return false;
      // Exclude common version-like strings (e.g. 1.2.3.4 in semver context)
      return true;
    },
  },

  // IPv6 — full and compressed forms
  {
    type: "ip_address",
    regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/gu,
    confidence: 0.75,
  },
];
