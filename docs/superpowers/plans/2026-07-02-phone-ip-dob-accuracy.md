# Phone / IP / Date-of-Birth Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three specific, diagnosed regex defects in `@drask-dev/scan` so the eval harness's blended overall score at `medium` sensitivity clears 90% (precision/recall/F1), driven entirely by `phone`, `ip_address`, and `date_of_birth` — no other pattern is touched.

**Architecture:** Three independent, single-file regex edits (`src/patterns/contact.ts`, `src/patterns/network.ts`, `src/patterns/temporal.ts`), each covered by new unit tests in the existing `src/__tests__/patterns.test.ts`, verified end-to-end against the real eval corpus (`eval/corpus.ts`, 66 hand-labeled cases) via `pnpm eval`.

**Tech Stack:** TypeScript, Vitest, the existing `tsup`-built `@drask-dev/scan` package. No new dependencies.

## Global Constraints

- Repo: `C:\Users\btjto\drask\scan` (package `@drask-dev/scan`, currently `0.7.1`, public on npm, MIT).
- Do not touch `sort_code`, `utr`, `passport`, `organization`, `email`, `aws_key` patterns — out of scope, and their current low-medium-sensitivity recall is intentional by design (documented in `eval/eval/README.md` / `eval/README.md`).
- Do not remove or weaken the existing false-positive protections already in place (Luhn checksum, mod-97 IBAN, mod-11 NHS, loopback/broadcast IP exclusion, etc.) — every fix here is additive precision/recall tuning, not a rewrite.
- All 101 existing tests in `pnpm test` must stay green throughout — never leave a task on a red suite.
- `nhs-3-fp-probe-bad-checkdigit` ("400 123 4569"), `phone-4-fp-probe` ("020-794-6095"), `ip-4-fp-probe-semver` ("1.2.3.4"), and `dob-4-fp-probe-meeting-date` ("30/06/2027") are **expected to remain false positives** — each is a shape-identical, context-free ambiguity with no regex-only fix (same class as `sort_code`/`utr`/`passport`). Do not attempt to suppress these; attempting it risks new recall regressions for no scoring benefit within the deadline.
- Target verified by dry-run: all three fixes together move `medium`-sensitivity overall from `precision=0.853 recall=0.853 f1=0.853` to `precision=0.91 recall=0.897 f1=0.904`, with 101/101 tests still passing.

---

### Task 1: Fix phone precision (digit-run substring leakage) and recall (2-digit UK area code)

**Files:**
- Modify: `src/patterns/contact.ts`
- Test: `src/__tests__/patterns.test.ts` (extend the existing `describe("phone", ...)` block, lines 32-52)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by other tasks — `phone` pattern entries are independent of `network.ts` and `temporal.ts`.

**Root cause (confirmed via `pnpm eval -- --diff` and standalone regex testing):**
1. The US phone regex (`/(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/gu`) has no anchor before its first character, so it can start matching mid-digit-run inside an unrelated longer number (a bad-Luhn debit card reference, an IBAN, a 16-digit order ID) as long as a trailing `\b` is satisfiable at the end. This causes 3 of the current 5 `phone`-category false positives: `cc-6-fp-probe-order-id`, `dc-3-fp-probe-bad-luhn`, `iban-3-fp-probe`.
2. The UK phone regex's area-code group (`(?:7\d{3}|\d{3,4})`) requires a minimum of 3 digits, so international-format London numbers like `+44 20 7946 0958` (2-digit area code `20`) are never matched — this is the single `phone` false negative (`phone-2`).

**Fix:** add a `(?<!\d)` negative lookbehind to the start of both the UK and US phone regexes (prevents starting a match on a digit that's itself preceded by another digit — i.e. mid-run), and widen the UK regex's area-code group to `\d{2,4}` with its middle group widened from a fixed `\d{3}` to `\d{3,4}` to admit the `20 7946 0958`-style grouping.

- [ ] **Step 1: Write the failing tests**

Open `src/__tests__/patterns.test.ts`. Find the existing `describe("phone", ...)` block (it currently ends at line 52 with the `"detects US numbers with dashes"` test followed by `});`). Replace that closing section:

```typescript
  it("detects US numbers with dashes", () => {
    const r = detector.scan("Phone: 555-123-4567");
    expect(r.entities.some((e) => e.type === "phone")).toBe(true);
  });
});
```

with:

```typescript
  it("detects US numbers with dashes", () => {
    const r = detector.scan("Phone: 555-123-4567");
    expect(r.entities.some((e) => e.type === "phone")).toBe(true);
  });

  it("detects UK numbers with a 2-digit international area code (London)", () => {
    const r = detector.scan("You can reach the office at +44 20 7946 0958.");
    expect(r.entities.some((e) => e.type === "phone" && e.value === "+44 20 7946 0958")).toBe(true);
  });

  it("does not misread a 16-digit order ID as a phone number", () => {
    const r = detector.scan("Order ID 4111222233334444 shipped yesterday.");
    expect(r.entities.filter((e) => e.type === "phone")).toHaveLength(0);
  });

  it("does not misread a bad-Luhn debit card reference as a phone number", () => {
    const r = detector.scan("Reference 6759123456789019 does not match any transaction.");
    expect(r.entities.filter((e) => e.type === "phone")).toHaveLength(0);
  });

  it("does not misread an invalid IBAN as a phone number", () => {
    const r = detector.scan("Batch code GB99ABCD12345678901234 failed validation.");
    expect(r.entities.filter((e) => e.type === "phone")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd C:\Users\btjto\drask\scan && pnpm vitest run src/__tests__/patterns.test.ts -t phone`
Expected: 4 new tests FAIL (the 2-digit area code test fails with no match found; the three "does not misread" tests fail because a spurious `phone` entity is present).

- [ ] **Step 3: Implement the regex fix**

In `src/patterns/contact.ts`, replace:

```typescript
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
```

with:

```typescript
  // UK phone: +44, 07xxx, 01xxx, 02xxx formats
  {
    type: "phone",
    regex: /(?<!\d)(?:\+44\s?|0)(?:7\d{3}|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/gu,
    confidence: 0.8,
  },

  // US phone: (555) 123-4567, 555-123-4567, +1 555 123 4567
  {
    type: "phone",
    regex: /(?<!\d)(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/gu,
    confidence: 0.7,
  },
```

Leave the third (international) phone pattern in the file untouched — it isn't implicated in any of the diagnosed cases.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd C:\Users\btjto\drask\scan && pnpm vitest run src/__tests__/patterns.test.ts -t phone`
Expected: all `phone` tests PASS (8 total: 4 pre-existing + 4 new).

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `cd C:\Users\btjto\drask\scan && pnpm test`
Expected: `105 passed (105)` — 101 pre-existing + 4 new, zero failures.

- [ ] **Step 6: Commit**

```bash
cd C:\Users\btjto\drask\scan
git add src/patterns/contact.ts src/__tests__/patterns.test.ts
git commit -m "fix: anchor phone patterns to digit-run boundaries, widen UK area-code width

- Leading (?<!\d) lookbehind on UK and US phone regexes stops them
  matching a substring inside a longer unrelated digit run (bad-Luhn
  card/debit references, invalid IBANs, order IDs).
- UK area-code group widened 3-4 digits -> 2-4 digits (and the
  following group 3 -> 3-4 digits) to catch international-format
  2-digit area codes, e.g. London's +44 20 ....

Fixes 3 of 5 phone false positives and the sole phone false negative
in the eval harness (eval/corpus.ts): phone precision 37.5% -> 66.7%,
recall 75% -> 100%."
```

---

### Task 2: Fix IPv6 compressed-address truncation

**Files:**
- Modify: `src/patterns/network.ts`
- Test: `src/__tests__/patterns.test.ts` (extend the existing `describe("ipv6", ...)` block, lines 347-367)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by other tasks.

**Root cause (confirmed via standalone regex testing):** the existing IPv6 alternation is the standard RFC 4291 canonical pattern, which is designed for *anchored, whole-string* validation (`^...$`). Used unanchored inside a `g`-flag scan over free text, JS regex alternation accepts the **first** alternative that matches at a given position — not the longest — so for `2001:db8::ff00:42:8329` the second alternative (`(?:[0-9a-fA-F]{1,4}:){1,7}:`, meant for addresses that *end* in `::`) matches just `2001:db8::` and the engine stops there, never trying the later alternative that would correctly consume all three trailing groups (`ff00:42:8329`). This produces both the false negative (`ip-2-v6`, full value never matched) and a spurious partial-match false positive (`2001:db8::`) in the same scan.

**Fix:** wrap the whole alternation in a leading `(?<![0-9a-fA-F:])` lookbehind and a trailing `(?![0-9a-fA-F:])` lookahead. The lookahead is the actual fix: it forces any alternative whose match is immediately followed by another hex digit or colon to fail, which makes the regex engine backtrack through the alternation (and through each alternative's own repetition counts) until it finds the branch that consumes the maximal contiguous run — i.e. the correct full address. The lookbehind is defensive symmetry, preventing a match from starting mid-run the same way the phone fix does.

- [ ] **Step 1: Write the failing test**

Open `src/__tests__/patterns.test.ts`. Find the existing `describe("ipv6", ...)` block (ends at line 367 with `"excludes IPv6 loopback (::1)"` then `});`). Replace:

```typescript
  it("excludes IPv6 loopback (::1)", () => {
    const r = detector.scan("Loopback: ::1");
    expect(r.entities.filter((e) => e.type === "ip_address")).toHaveLength(0);
  });
});
```

with:

```typescript
  it("excludes IPv6 loopback (::1)", () => {
    const r = detector.scan("Loopback: ::1");
    expect(r.entities.filter((e) => e.type === "ip_address")).toHaveLength(0);
  });

  it("detects the full address when groups follow the compression marker", () => {
    const r = detector.scan("IPv6 client address 2001:db8::ff00:42:8329 connected.");
    const ips = r.entities.filter((e) => e.type === "ip_address");
    expect(ips).toHaveLength(1);
    expect(ips[0].value).toBe("2001:db8::ff00:42:8329");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\btjto\drask\scan && pnpm vitest run src/__tests__/patterns.test.ts -t "groups follow"`
Expected: FAIL — either 2 entities returned (the truncated `2001:db8::` plus nothing else) or the single entity's value is `2001:db8::` instead of the full address.

- [ ] **Step 3: Implement the regex fix**

In `src/patterns/network.ts`, replace:

```typescript
    regex: /(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::/gu,
```

with:

```typescript
    regex: /(?<![0-9a-fA-F:])(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::)(?![0-9a-fA-F:])/gu,
```

(The confidence, `validate`, comments, and every alternative branch inside the group are unchanged — only the wrapping lookbehind/lookahead are new.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:\Users\btjto\drask\scan && pnpm vitest run src/__tests__/patterns.test.ts -t "groups follow"`
Expected: PASS.

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `cd C:\Users\btjto\drask\scan && pnpm test`
Expected: `106 passed (106)` — cumulative with Task 1's additions, zero failures. Pay particular attention to the pre-existing `"detects full IPv6 addresses"`, `"detects compressed IPv6 addresses"`, `"detects link-local IPv6 addresses"`, and `"excludes IPv6 loopback (::1)"` tests — all four must still pass unchanged, confirming the lookahead/lookbehind didn't break any previously-working form.

- [ ] **Step 6: Commit**

```bash
cd C:\Users\btjto\drask\scan
git add src/patterns/network.ts src/__tests__/patterns.test.ts
git commit -m "fix: stop IPv6 compressed-address regex truncating at the :: marker

Unanchored alternation was accepting the first matching branch instead
of the longest, so addresses with multiple hex groups after '::' (e.g.
2001:db8::ff00:42:8329) were truncated to just the leading groups plus
'::' — both a false negative (full address never matched) and a false
positive (the truncated prefix flagged as its own address) in the same
scan. A wrapping (?<![0-9a-fA-F:])...(?![0-9a-fA-F:]) forces the
engine to backtrack through the alternation until it finds the branch
that consumes the maximal contiguous run.

Fixes the eval harness's ip-2-v6 case: ip_address precision 60% -> 80%,
recall 75% -> 100%."
```

---

### Task 3: Split the US-format date-of-birth pattern by ambiguity

**Files:**
- Modify: `src/patterns/temporal.ts`
- Test: `src/__tests__/patterns.test.ts` (extend the existing `describe("date_of_birth", ...)` block, lines 174-184)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by other tasks.

**Root cause:** the current US-format pattern (`MM/DD/YYYY`, day range `01-31`) sits at confidence `0.45` — below the `medium` threshold of `0.5` — for every value it matches, because it was tuned as a single bucket covering both genuinely ambiguous dates (where day ≤ 12, so the same digits could also parse as a valid `DD/MM/YYYY`) and unambiguous ones (where day > 12, so it *cannot* be misread as `DD/MM/YYYY` — no UK-format date has a month greater than 12). `dob-3-us-format` ("Born 03/14/1991...") has day `14`, which is unambiguous, but still gets the blanket low confidence and is missed at `medium` sensitivity.

**Fix:** split the single US-format pattern into two: the existing ambiguous one (day `01-12`) stays at `0.45`/high-sensitivity-only, and a new unambiguous one (day `13-31`) gets a higher confidence (`0.6`) that clears the `medium` threshold. The two patterns' day ranges are disjoint, so no string can match both (no duplicate-entity risk), and the existing UK-format pattern's own month group (`01-12`) already can't match a day-position value in the `13-31` range, so there's no cross-pattern collision either.

- [ ] **Step 1: Write the failing tests**

Open `src/__tests__/patterns.test.ts`. Find the existing `describe("date_of_birth", ...)` block (ends at line 184 with `"detects ISO dates"` then `});`). Replace:

```typescript
  it("detects ISO dates", () => {
    const r = sensitiveDetector.scan("Born: 1990-03-15");
    expect(r.entities.some((e) => e.type === "date_of_birth")).toBe(true);
  });
});
```

with:

```typescript
  it("detects ISO dates", () => {
    const r = sensitiveDetector.scan("Born: 1990-03-15");
    expect(r.entities.some((e) => e.type === "date_of_birth")).toBe(true);
  });

  it("detects unambiguous US-format dates (day > 12) at medium sensitivity", () => {
    const r = detector.scan("Born 03/14/1991 per the US visa application.");
    expect(r.entities.some((e) => e.type === "date_of_birth" && e.value === "03/14/1991")).toBe(true);
  });

  it("does not detect ambiguous US-format dates (day <= 12) at medium sensitivity", () => {
    const r = detector.scan("Born 03/04/1991 per the US visa application.");
    expect(r.entities.filter((e) => e.type === "date_of_birth")).toHaveLength(0);
  });

  it("still detects ambiguous US-format dates (day <= 12) at high sensitivity", () => {
    const r = sensitiveDetector.scan("Born 03/04/1991 per the US visa application.");
    expect(r.entities.some((e) => e.type === "date_of_birth" && e.value === "03/04/1991")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd C:\Users\btjto\drask\scan && pnpm vitest run src/__tests__/patterns.test.ts -t "US-format"`
Expected: the first new test FAILS (no `date_of_birth` entity found at medium for the day=14 case); the other two should already pass (they exercise existing behavior) — confirm that, don't just assume it.

- [ ] **Step 3: Implement the pattern split**

In `src/patterns/temporal.ts`, replace:

```typescript
  // MM/DD/YYYY (US format)
  {
    type: "date_of_birth",
    regex: /\b(?:0[1-9]|1[0-2])[\/\-.](?:0[1-9]|[12]\d|3[01])[\/\-.](?:19|20)\d{2}\b/gu,
    confidence: 0.45,
  },
];
```

with:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd C:\Users\btjto\drask\scan && pnpm vitest run src/__tests__/patterns.test.ts -t "US-format"`
Expected: all 3 new tests PASS.

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `cd C:\Users\btjto\drask\scan && pnpm test`
Expected: `109 passed (109)` — cumulative with Tasks 1-2's additions, zero failures.

- [ ] **Step 6: Commit**

```bash
cd C:\Users\btjto\drask\scan
git add src/patterns/temporal.ts src/__tests__/patterns.test.ts
git commit -m "fix: split US-format date_of_birth pattern by day-value ambiguity

The single MM/DD/YYYY pattern covered both genuinely ambiguous dates
(day <= 12, could also parse as DD/MM) and unambiguous ones (day > 12,
cannot be a valid month so cannot be misread as DD/MM), tuning the
whole bucket to confidence 0.45 (below the medium-sensitivity 0.5
threshold) to avoid over-firing on the ambiguous half. Split into two
disjoint-range patterns: day 01-12 stays at 0.45/high-only, day 13-31
moves to 0.6 and fires at medium, since it carries none of the
ambiguity risk the low confidence exists to guard against.

Fixes the eval harness's dob-3-us-format case: date_of_birth recall
75% -> 100% at medium sensitivity, no precision cost."
```

---

### Task 4: Verify blended target, update docs, bump version

**Files:**
- Modify: `eval/README.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Regenerate: `eval/results.json` (via `pnpm eval`, not hand-edited)

**Interfaces:**
- Consumes: the merged state of Tasks 1-3 (all three pattern files fixed, all new tests passing).
- Produces: the final verified eval numbers this plan's Goal is measured against.

- [ ] **Step 1: Run the full eval harness**

Run: `cd C:\Users\btjto\drask\scan && pnpm eval`
Expected console output for `=== sensitivity: medium ===`:

```
overall  precision=0.91  recall=0.897  f1=0.904  (tp=61 fp=6 fn=7)
```

with per-type rows showing `phone` at `tp=4 fp=2 fn=0` (precision 0.667, recall 1), `ip_address` at `tp=4 fp=1 fn=0` (precision 0.8, recall 1), and `date_of_birth` at `tp=4 fp=1 fn=0` (precision 0.8, recall 1). If the numbers differ from this, stop and diagnose before proceeding — don't edit the README/CHANGELOG against a result that doesn't match what was verified during planning.

- [ ] **Step 2: Run the full test suite one more time**

Run: `cd C:\Users\btjto\drask\scan && pnpm test`
Expected: `109 passed (109)`, zero failures.

- [ ] **Step 3: Update the eval README's "Known findings" section**

In `eval/README.md`, replace:

```markdown
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
```

with:

```markdown
- **Phone numbers with no distinguishing context are still indistinguishable
  from same-shaped non-phone numbers.** A spaced 3-3-4 digit grouping
  (`nhs-3-fp-probe-bad-checkdigit`, e.g. an order quantity code) and a
  hyphenated UK-shaped reference number (`phone-4-fp-probe`) both still
  match — this is the same class of irreducible shape-ambiguity as
  `sort_code`/`utr`/`passport` below, not a bug. (Fixed in v0.7.2: the
  phone regex no longer leaks into unrelated structured-PII types with no
  shape ambiguity at all — credit card, debit card, IBAN — and UK numbers
  with a 2-digit international area code, e.g. London's `+44 20 ...`, are
  now matched.)
- **A semver-shaped string is numerically indistinguishable from an IPv4
  address** (`ip-4-fp-probe-semver`, e.g. `1.2.3.4`) — genuine ambiguity
  the engine cannot resolve without context. (Fixed in v0.7.2: the IPv6
  pattern no longer truncates at the `::` compression marker when more
  hex groups follow, e.g. `2001:db8::ff00:42:8329`.)
- **A context-free date string cannot be distinguished from an actual date
  of birth** (`dob-4-fp-probe-meeting-date`) — any `DD/MM/YYYY`-shaped
  string matches regardless of surrounding meaning, same class as the
  phone/IP findings above.
```

- [ ] **Step 4: Bump the package version**

In `package.json`, replace:

```json
  "version": "0.7.1",
```

with:

```json
  "version": "0.7.2",
```

- [ ] **Step 5: Add a CHANGELOG entry**

In `CHANGELOG.md`, replace:

```markdown
# Changelog

All notable changes to `@drask-dev/scan` are documented here.

## [0.7.1] — 2026-07-01
```

with:

```markdown
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
```

- [ ] **Step 6: Regenerate eval/results.json and commit everything**

Run: `cd C:\Users\btjto\drask\scan && pnpm eval` (already run in Step 1 — this just confirms `eval/results.json` on disk reflects the latest run before committing it).

```bash
cd C:\Users\btjto\drask\scan
git add eval/README.md eval/results.json CHANGELOG.md package.json
git commit -m "chore: 0.7.2 — phone/IP/DOB accuracy fixes, update eval docs

Blended eval overall at medium sensitivity: precision 85.3% -> 91.0%,
recall 85.3% -> 89.7%, F1 85.3% -> 90.4%."
```

- [ ] **Step 7: Report final state to the user**

Print the final `pnpm eval` medium-sensitivity summary and the `git log --oneline -5` output so the user can see the four commits and the verified numbers before deciding whether to push / trigger `publish.yml`. Do not push to `origin` or trigger the npm publish workflow — those are shared-state actions outside this plan's scope; flag them as the next manual step.

---

## Self-Review

**Spec coverage:** phone precision (Task 1) ✓, phone recall (Task 1) ✓, IP precision+recall (Task 2, both driven by the same truncation bug) ✓, DOB recall (Task 3) ✓, blended-90%-by-EOD verification (Task 4) ✓. No pattern outside phone/ip_address/date_of_birth is touched, per the user's explicit scope.

**Placeholder scan:** every step has literal before/after code, exact file paths, exact commands with expected output. No "add appropriate handling"-style steps.

**Type consistency:** all edits are to plain data-literal arrays (`PiiPattern[]`) already typed by the existing `import type { PiiPattern } from "../types.js"` in each file — no new types, functions, or signatures introduced, so there's nothing to drift across tasks.
