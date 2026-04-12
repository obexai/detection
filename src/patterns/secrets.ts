import type { PiiPattern } from "../types.js";

/** API keys, AWS credentials, JWTs */
export const secretsPatterns: PiiPattern[] = [
  // AWS Access Key ID — starts with AKIA, 20 chars
  {
    type: "aws_key",
    regex: /\bAKIA[0-9A-Z]{16}\b/gu,
    confidence: 0.95,
  },

  // AWS Secret Access Key — 40 base64-ish chars after common assignment patterns
  {
    type: "aws_key",
    regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY|SecretAccessKey)[\s]*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/gu,
    confidence: 0.95,
  },

  // Generic API key — common env var patterns with long hex/base64 values
  {
    type: "api_key",
    regex: /(?:api[_-]?key|apikey|api[_-]?secret|api[_-]?token|auth[_-]?token|access[_-]?token|secret[_-]?key|private[_-]?key)[\s]*[=:]\s*["']?([A-Za-z0-9\-_.]{20,})["']?/giu,
    confidence: 0.85,
  },

  // Bearer token in auth headers
  {
    type: "api_key",
    regex: /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gu,
    confidence: 0.9,
  },

  // JWT — three base64url segments separated by dots
  {
    type: "jwt",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/gu,
    confidence: 0.95,
  },

  // Slack token
  {
    type: "api_key",
    regex: /\bxox[bpars]-[0-9a-zA-Z-]{10,}/gu,
    confidence: 0.95,
  },

  // GitHub personal access token
  {
    type: "api_key",
    regex: /\bgh[ps]_[A-Za-z0-9]{36,}\b/gu,
    confidence: 0.95,
  },

  // Stripe key
  {
    type: "api_key",
    regex: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{20,}\b/gu,
    confidence: 0.95,
  },
];
