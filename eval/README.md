# PII detection eval harness

Produces the accuracy and latency numbers behind the client-facing model
card (`hq/drafts/model_card_pii_detection.pdf`, outside this repo) and the
`[X]% false-positive rate` claim in the HN launch draft.

## Run it

```bash
pnpm eval            # full report -> eval/results.json + console summary
pnpm eval -- --diff  # also print every mismatched case (authoring aid)
```

## Methodology

- **Corpus** (`corpus.ts`): ~65 hand-authored cases across all 7 regex
  categories, NER (person/org/location), and 5 realistic multi-entity
  scenarios. Each case is `{ text, expected: {type, value}[] }` —
  `expected: []` marks a case that should trigger no detection at all.
  Values for checksum-validated types (credit/debit card, IBAN, NHS number)
  are real, computed-valid test numbers, not arbitrary digit strings — a
  Luhn-invalid or mod-97-invalid card/IBAN would fail validation for
  reasons unrelated to what's being tested.
- **Ground truth is independent of the implementation.** Cases were
  authored first, then run against the real `PiiDetector` (from `src/`,
  not `dist/`) and the diff reviewed by hand: mismatches caused by a wrong
  assumption about regex/NER behavior were fixed in the corpus; mismatches
  that reflect genuine detector behavior were left as-is. See "Known
  findings" below for what that surfaced.
- **Scoring** (`run.ts`): entities are matched to ground truth by
  `(type, value)`. Regex-sourced types use trimmed exact-string equality.
  NER-sourced types (`person_name`, `organization`, `location`) use
  substring containment in either direction, because compromise.js's span
  boundaries commonly bleed adjacent sentence punctuation ("Bristol." /
  "Tom Reilly,") — that's a real, reproducible characteristic of the
  library, not a detection failure, and exact-boundary matching would
  penalize it as one.
- **Both `medium` (product default) and `high` sensitivity are run**
  against the same ground truth, because three entity types — `sort_code`,
  `utr`, `passport` — sit below `medium`'s 0.5 confidence threshold by
  design (no checksum exists for any of them, so they're tuned off by
  default to avoid over-firing on ordinary numbers) and only activate at
  `high`. Reporting medium-only would show 0% recall for those types
  without the context of why; reporting a single blended number would hide
  the real precision/recall trade-off between the two modes.
- **Latency** comes from `DetectionResult.latencyMs` on every scan in the
  corpus (not the SDK's separate audit-telemetry counters), aggregated to
  mean/p50/p95/p99.

## Known findings (genuine, not corpus bugs)

Kept in the corpus deliberately because they're real and worth knowing
about, not artifacts of test authoring:

- **US phone pattern lacks a leading word boundary.** It can match a
  10-digit substring embedded inside a longer digit run — a failed card
  number, an IBAN, an order ID — and misreport it as a phone number
  (`cc-6-fp-probe-order-id`, `dc-3-fp-probe-bad-luhn`, `iban-3-fp-probe`,
  `nhs-3-fp-probe-bad-checkdigit`). This is the single largest precision
  drag in the results.
- **`+44` numbers with 2-digit area codes (e.g. London's 020) are missed**
  (`phone-2`). The UK phone regex requires 3–4 digits for the area-code
  group; written in international format the leading 0 is dropped,
  shortening London numbers below that minimum.
- **The IPv6 pattern doesn't cover every RFC 4291 compressed form.** A
  valid compressed address can both under-match (truncate early) and
  register a spurious partial match in the same scan (`ip-2-v6`).
- **`sort_code` / `utr` / `passport` have no checksum**, so at `high`
  sensitivity they will match plausible non-PII numbers in the same shape
  (a meeting-time-shaped sort code, an invoice-shaped UTR, a
  tracking-number-shaped passport number) — precisely the trade-off their
  low default confidence exists to avoid.
- **compromise.js's organization detection is keyword-based, not a real
  company gazetteer.** It reliably catches institutional terms already in
  its lexicon (`NHS`, `GitHub`) but missed `Barclays` and `Stripe` outright
  in testing (`ner-2`, `ner-3`). Treat `organization` detections as a
  bonus signal, not a compliance-grade company-name catalogue.
- **Common English words that are also payment-brand names can be
  misflagged** — "visa" (lowercase, in "US visa application") was tagged
  as an organization regardless of context (`dob-3-us-format`).
- **Secrets require a labeled context to be caught** by the generic
  `api_key` pattern and the AWS-secret pattern specifically requires an
  `aws_secret_access_key=`-shaped prefix; a bare 40+ character token with
  no surrounding label is not flagged (`secret-3-aws-secret-fn-probe`).
  This is a deliberate scope boundary of the pattern, not a bug — but it's
  a real recall gap worth knowing before treating "no secrets found" as
  proof a payload is clean.

## Reproducing after an SDK change

Run `pnpm eval` and diff `eval/results.json`. No CI wiring yet — this is a
manual step before regenerating the model card for a release. If a change
to `src/patterns/` or `src/ner.ts` shifts the numbers, regenerate the PDF
before sending it to anyone.
