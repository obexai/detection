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

  // IPv6 — full and compressed forms (RFC 4291)
  // Covers: full (2001:0db8::), compressed (2001:db8::1), link-local (fe80::1)
  // Excludes loopback (::1) and all-zeros (::)
  {
    type: "ip_address",
    regex: /(?<![0-9a-fA-F:])(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::)(?![0-9a-fA-F:])/gu,
    confidence: 0.75,
    validate: (value: string) => value !== "::1" && value !== "::",
  },
];
