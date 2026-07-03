# PII detection model card — design

**Status:** Approved
**Date:** 2026-07-02

## Purpose

A short, client-facing PDF ("model card") for `@drask-dev/scan`'s PII
detection engine, backed by real measured numbers rather than placeholders.
`hq/launch_assets.md`'s HN launch draft already has an unfilled
`[X]% false-positive rate` claim — this work supplies that number
honestly, via a reproducible eval harness, and packages it as a one-pager
sales can hand to prospects.

Out of scope: a head-to-head benchmark against Microsoft Presidio (separate,
larger effort — needs a Python-side harness).

## 1. Eval harness (`scan/eval/`)

Not published to npm (sits next to `src/__tests__/`, excluded the same way
dev-only tooling already is via the package's `files` allowlist).

- **`corpus.ts`** — hand-labeled test cases, each `{ text, expected: PiiEntity[] }`
  (`expected: []` for negative cases). Covers:
  - True positives across all 7 pattern categories (contact, financial, UK
    gov, network, location, temporal, secrets) in varied real-world formats
    (spacing, casing, separators).
  - True positives for NER (`person_name`, `organization`, `location`).
  - Hard negatives designed to probe false positives: Luhn-failing
    card-like digit strings, non-UK phone-shaped numbers, order/reference
    numbers, capitalized common words/brand names near NER triggers.
  - Recall probes: valid PII in awkward-but-real formats (unusual
    separators, mixed casing, informal phrasing) likely to be missed.
  - Target size: ~150-200 cases, weighted so every category has enough
    cases for a meaningful per-category precision/recall (not just overall).

- **`run.ts`** — for each case, runs `new PiiDetector({ sensitivity: "medium" }).scan(text)`,
  matches found entities to expected ones by `(type, value)`, and tallies
  TP/FP/FN per entity type and overall. Computes precision, recall, F1 per
  type and overall. Separately collects `latencyMs` from every scan call
  (harness runs, not the SDK's own audit telemetry) and computes
  mean/p50/p95/p99. Writes `results.json`.

- **`README.md`** — methodology: corpus size/composition, labeling method
  (hand-authored, matched by exact type+value), how to reproduce
  (`pnpm tsx scan/eval/run.ts`), and an explicit caveat that this measures
  the `medium` sensitivity default only (not `low`/`high`).

Numbers in the model card must come from `results.json`, not be hand-typed.

## 2. Model card deliverable

- **Source:** `hq/drafts/model_card_pii_detection.html` — styled one-pager,
  inline CSS, print-ready (`@page` sized for A4/Letter). Not a raw markdown
  dump; visually on par with `hq/drafts/consultant_partner_one_pager.md`'s
  level of client-facing polish, translated to a designed page.
- **Sections:** title/version/date; what it detects (7 categories, 26
  patterns + NER, as a table); performance (latency percentiles); accuracy
  (precision/recall/F1 overall + per-category table); methodology (corpus
  size, reproducibility note, one line pointing at the eval harness);
  known limitations (deterministic regex+NER — not an LLM; English-only
  NER via compromise.js; `medium`-sensitivity numbers only, `low`/`high`
  trade off differently; false positives/negatives are inherent to any
  detector and the numbers here are the honest ceiling, not a guarantee);
  footer with SDK version + contact.
- **Build:** convert the HTML to PDF via headless Edge
  (`msedge --headless --print-to-pdf=model_card_pii_detection.pdf model_card_pii_detection.html`),
  already installed locally — no new dependencies.
- **Output:** both the `.html` (editable source) and `.pdf` (the thing that
  gets sent) committed to... n/a, `hq/` is not a git repo, so these are
  just saved to disk at `hq/drafts/`.

## Not doing

- No Presidio comparison.
- No web-hosted version of the card (PDF only, per explicit request).
- No CI wiring of the eval harness (manual `pnpm tsx` run for now — can be
  automated later if the number needs to be kept fresh across SDK
  releases).
