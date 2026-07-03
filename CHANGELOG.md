# Changelog

All notable changes to `@drask-dev/scan` are documented here.

## [0.7.2] — 2026-07-03

### Fixed
- **Phone false positives from unrelated structured PII** — `src/patterns/contact.ts`'s UK and US phone regexes now anchor with `(?<!\d)` so they can no longer match a substring inside a longer, unrelated digit run (a bad-Luhn card/debit reference, an invalid IBAN, an order ID).
- **UK phone false negatives on 2-digit international area codes** — the UK regex's area-code group now accepts 2-4 digits (was 3-4), catching numbers like London's `+44 20 7946 0958`.
- **IPv6 compressed-address truncation** — `src/patterns/network.ts`'s IPv6 regex no longer stops at the `::` marker when more hex groups follow (e.g. `2001:db8::ff00:42:8329` previously matched only `2001:db8::`).
- **US-format date-of-birth false negatives** — `src/patterns/temporal.ts` now fires at `medium` sensitivity for US-format dates where the day value (13-31) makes the date unambiguous (cannot also parse as `DD/MM/YYYY`); genuinely ambiguous day values (01-12) remain high-sensitivity-only.

### Eval harness impact (`eval/`, `medium` sensitivity)
- `phone`: precision 37.5% -> 66.7%, recall 75% -> 100%
- `ip_address`: precision 60% -> 80%, recall 75% -> 100%
- `date_of_birth`: precision 75% -> 80%, recall 75% -> 100%
- Overall: precision 85.3% -> 91.0%, recall 85.3% -> 89.7%, F1 85.3% -> 90.4%

## [0.7.1] — 2026-07-01

### Changed
- README copy cleanup (no functional changes).

## [0.7.0] — 2026-07-01

### Changed — BREAKING

- **Custom patterns are now instance-scoped, not global.** `registerPatterns()`, `clearPatterns()`, and `resetToDefaultPatterns()` are removed. Previously these mutated a single pattern list shared by every `PiiDetector` in the process — two detectors with different custom patterns would leak into each other once both had registered. Pass custom patterns to the constructor instead: `new PiiDetector({ patterns: [...] })`. See the README's "Custom Patterns" section for the new usage.

## [0.6.3] — 2026-06-30

### Fixed
- **Sort code no longer fires on date strings at medium sensitivity** — confidence lowered from `0.6` to `0.45`, placing it below the medium threshold (`0.5`). Sort codes now require `sensitivity: "high"` to fire, eliminating false positives for UK fintech logs where `DD-MM-YY` date strings share the `XX-XX-XX` format.
- **GitHub OAuth and user-to-server tokens now detected** — the GitHub PAT regex `gh[ps]_` has been extended to `gh[opsu]_`, adding coverage for `gho_` (OAuth tokens) and `ghu_` (user-to-server tokens from GitHub Apps).

### Added
- `SECURITY.md` — vulnerability disclosure policy and contact address.
- `.gitattributes` — `* text=auto` to normalise line endings and eliminate CRLF warnings on Windows.
- Warm-path performance test asserting `scan()` latency `< 5ms` on a pre-warmed instance, guarding the README's sub-5ms claim.

## [0.6.2] — 2026-06-30

### Fixed
- **NER cold-start latency** — compromise.js now initialises all NER pipelines (people, organisations, locations) at module import time using a realistic seed sentence. First `scan()` call is consistently <5ms on warm instances; the ~250ms initialisation cost is paid once at import rather than on the first user request.
- **Secrets `entity.value` now contains only the raw secret** — the AWS secret key and generic API key patterns previously stored the full `key_name = "value"` string as `entity.value` and replaced the variable name during redaction. Both patterns now use lookbehind assertions so `entity.value` is the token only, and redaction preserves the surrounding context (e.g. `aws_secret_access_key = [AWS_KEY_1]`).
- **IBAN mod-97 check digit validation** — the IBAN pattern now validates check digits using the ISO 7064 Mod 97-10 algorithm. Structurally valid but semantically meaningless strings (e.g. `GB00NWBK60161331926819`) are rejected, eliminating a class of false positives relevant to compliance use cases.

### Added
- `ibanCheckDigit` validator exported from `validators.ts` (internal use; not part of the public API).

## [0.6.1] — 2026-06-27

### Fixed
- Sort code validator no longer rejects valid UK sort codes with a `20-xx-xx` prefix (Barclays, one of the UK's largest banks) or `19-xx-xx`. The heuristic that treated these as date-like was incorrect and introduced false negatives for common real-world sort codes.
- NHS number test assertion now correctly validates that detection fires (`toBeGreaterThan(0)` instead of the always-passing `toBeGreaterThanOrEqual(0)`).

### Added
- `resetToDefaultPatterns()` export — restores the 26 built-in patterns after `clearPatterns()`, with no need to re-import or re-instantiate.
- IPv6 detection now covers compressed forms (RFC 4291): `2001:db8::1`, `fe80::1`, `::ffff:…` etc., in addition to the existing full 8-group notation. Loopback (`::1`) and all-zeros (`::`) are still excluded.
- CI matrix now runs on Node.js 18, 20, and 22 (previously Node 20 only), matching the declared `engines: ">=18.0.0"`.
- `.npmrc` is now tracked in git (it contains only registry config, no secrets; the prior gitignore entry was a mistake).

## [0.6.0] — 2026-06-24

Rebrand from Velare → Drask and rename package from `@velare/detection` → `@drask-dev/scan`.

## [0.3.0] — 2026-04-19

### Added
- npm publish workflow with OIDC provenance signing (`--provenance`).
- Unicode support: regex patterns use the `u` flag; redaction correctly handles multi-byte characters and emoji.
- Large-input guard: inputs exceeding 100 KB skip scanning and return the original text unchanged (`maxInputBytes` config option).
- Scan latency warning (`scanWarnMs` config option, default 100 ms).
- Edge case hardening: zero-length match protection, null bytes, control characters.

## [0.2.0] — 2026-04-14

### Added
- NER detection via [compromise.js](https://github.com/spencermountain/compromise): person names, organisations, locations detected alongside regex patterns.
- Two-pass scan: regex first, then NER; overlapping detections deduplicated by keeping the highest-confidence match.
- Debit card patterns (Maestro, Visa Electron) with Luhn validation.
- Sort code, UTR, and passport patterns.
- `source: "regex" | "ner"` field on each `PiiEntity`.
- `NER_ENTITY_TYPES` export.

## [0.1.0] — 2026-04-11

Initial release.

### Features
- 18 regex patterns across 7 categories: email, phone (UK/US/international), credit card, IBAN, National Insurance, NHS number, IPv4, IPv6, UK postcode, date of birth (3 formats), AWS keys, API keys, Bearer tokens, JWTs, Slack/GitHub/Stripe tokens.
- Luhn validation for credit cards; modulus-11 validation for NHS numbers; NI prefix exclusion.
- Configurable sensitivity (`low` / `medium` / `high`), entity type filtering, and exclusion lists.
- ESM + CJS dual build with TypeScript declarations and source maps.
- MIT licence.
