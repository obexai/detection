# @drask-dev/detection

PII detection engine for JavaScript/TypeScript. 26 regex patterns with validators plus NER-based entity detection, configurable sensitivity, and sub-5ms latency.

## Install

```bash
npm install @drask-dev/detection
```

## Quick Start

```ts
import { PiiDetector } from "@drask-dev/detection";

const detector = new PiiDetector({ sensitivity: "medium" });
const result = detector.scan("Contact john@example.com or call 020 7946 0958");

console.log(result.entities);
// [{ type: "email", value: "john@example.com", confidence: 0.95, ... },
//  { type: "phone", value: "020 7946 0958", confidence: 0.8, ... }]

console.log(result.redacted);
// "Contact [EMAIL_1] or call [PHONE_1]"

console.log(result.score);     // 0.67 (risk score 0-1)
console.log(result.latencyMs); // ~2ms
```

## What It Detects

26 patterns across 7 categories:

| Category | Entity Types | Count | Validators |
|----------|-------------|-------|------------|
| **Contact** | Email, phone (UK, US, international) | 4 | — |
| **Financial** | Credit card, debit card, IBAN, sort code | 4 | Luhn checksum (cards), date rejection (sort code) |
| **UK Government** | National Insurance, NHS number, UTR, passport | 4 | NHS modulus 11 |
| **Network** | IPv4, IPv6 | 2 | Excludes localhost/broadcast |
| **Location** | UK postcode | 1 | — |
| **Temporal** | Date of birth (DD/MM/YYYY, ISO, US format) | 3 | — |
| **Secrets** | AWS keys, generic API keys, Bearer tokens, JWT, Slack/GitHub/Stripe tokens | 8 | — |

## NER Detection

In addition to regex patterns, the detector runs a second pass using [compromise.js](https://github.com/spencermountain/compromise) to detect named entities:

| Entity Type | Confidence |
|-------------|------------|
| `person_name` | 0.7 |
| `organization` | 0.6 |
| `location` | 0.65 |

NER matches are included alongside regex matches in the `entities` array. The `source` field on each `PiiEntity` indicates whether a match came from `"regex"` or `"ner"`.

## Configuration

```ts
const detector = new PiiDetector({
  sensitivity: "high",          // "low" | "medium" | "high"
  entities: ["email", "phone"], // only detect these types
  exclude: ["uk_postcode"],     // skip these types
});
```

### Sensitivity levels

| Level | Confidence threshold | Behaviour |
|-------|---------------------|-----------|
| `low` | 0.8 | Only high-confidence matches (fewer false positives) |
| `medium` | 0.5 | Balanced (default) |
| `high` | 0.3 | Aggressive — catches more, including low-confidence patterns like passport numbers |

## Custom Patterns

```ts
import { registerPatterns } from "@drask-dev/detection";

registerPatterns([{
  type: "email",
  regex: /my-custom-pattern/g,
  confidence: 0.9,
  validate: (match) => match.length > 5, // optional validator
}]);
```

## API

### `PiiDetector`

```ts
const detector = new PiiDetector(config?: DetectorConfig);
const result = detector.scan(text: string): DetectionResult;
```

### `DetectionResult`

```ts
{
  entities: PiiEntity[];  // all detected PII
  redacted: string;       // input with PII replaced by [TYPE_N] tokens
  score: number;          // overall risk score 0-1
  latencyMs: number;      // scan duration in ms
}
```

### `PiiEntity`

```ts
{
  type: string;           // e.g. "email", "credit_card"
  value: string;          // the matched text
  start: number;          // start index in original string
  end: number;            // end index in original string
  confidence: number;     // 0-1
  source: "regex" | "ner";
}
```

## License

MIT
