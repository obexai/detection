/**
 * Eval harness for the PII detection model card.
 *
 * Runs the labeled corpus through the real PiiDetector (source, not dist)
 * at both `medium` (product default) and `high` sensitivity, scores
 * precision/recall/F1 per entity type against hand-labeled ground truth,
 * and captures latency percentiles from the same runs.
 *
 * Usage:
 *   pnpm eval            # full report -> eval/results.json + console summary
 *   pnpm eval --diff     # print every case's expected vs actual (authoring aid)
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PiiDetector } from "../src/index.js";
import { corpus, type EvalCase } from "./corpus.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SENSITIVITIES = ["medium", "high"] as const;
type Sensitivity = (typeof SENSITIVITIES)[number];

interface Tally {
  tp: number;
  fp: number;
  fn: number;
}

function emptyTally(): Tally {
  return { tp: 0, fp: 0, fn: 0 };
}

function precisionOf(t: Tally): number {
  return t.tp + t.fp === 0 ? 1 : t.tp / (t.tp + t.fp);
}

function recallOf(t: Tally): number {
  return t.tp + t.fn === 0 ? 1 : t.tp / (t.tp + t.fn);
}

function f1Of(t: Tally): number {
  const p = precisionOf(t);
  const r = recallOf(t);
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

// NER-sourced types: compromise.js span boundaries commonly bleed adjacent
// sentence punctuation ("Bristol." / "Tom Reilly,") — that's a real,
// reproducible characteristic of the library, not a detection failure, so
// these types are scored by substring containment rather than exact
// equality. Regex-sourced types keep strict equality (trimmed only, to
// tolerate the one observed whitespace-boundary quirk on 15-digit Amex
// matches) since exact-value matching is a meaningful claim for a
// deterministic pattern engine.
const CONTAINMENT_MATCHED_TYPES = new Set(["person_name", "organization", "location"]);

function normalize(value: string): string {
  return value.trim();
}

function valuesMatch(type: string, expected: string, actual: string): boolean {
  const a = normalize(actual);
  const e = normalize(expected);
  if (CONTAINMENT_MATCHED_TYPES.has(type)) {
    return a.includes(e) || e.includes(a);
  }
  return a === e;
}

interface CaseDiff {
  id: string;
  category: string;
  missing: { type: string; value: string }[]; // FN
  extra: { type: string; value: string }[]; // FP
}

function scoreCase(
  detector: PiiDetector,
  testCase: EvalCase,
): { diff: CaseDiff; matched: { type: string; value: string }[]; latencyMs: number } {
  const result = detector.scan(testCase.text);
  const unclaimed = [...result.entities];

  const matched: { type: string; value: string }[] = [];
  const missing: { type: string; value: string }[] = [];
  for (const exp of testCase.expected) {
    const idx = unclaimed.findIndex((e) => e.type === exp.type && valuesMatch(exp.type, exp.value, e.value));
    if (idx === -1) {
      missing.push(exp);
    } else {
      matched.push(exp);
      unclaimed.splice(idx, 1);
    }
  }

  // Whatever's left in `unclaimed` matched no expected entity — real extras.
  const extra = unclaimed.map((e) => ({ type: e.type, value: e.value }));

  return {
    diff: { id: testCase.id, category: testCase.category, missing, extra },
    matched,
    latencyMs: result.latencyMs,
  };
}

function runAtSensitivity(sensitivity: Sensitivity) {
  const detector = new PiiDetector({ sensitivity });
  const perType = new Map<string, Tally>();
  const overall = emptyTally();
  const diffs: CaseDiff[] = [];
  const latencies: number[] = [];

  for (const testCase of corpus) {
    const { diff, matched, latencyMs } = scoreCase(detector, testCase);
    latencies.push(latencyMs);
    if (diff.missing.length > 0 || diff.extra.length > 0) diffs.push(diff);

    for (const m of matched) {
      overall.tp++;
      const t = perType.get(m.type) ?? emptyTally();
      t.tp++;
      perType.set(m.type, t);
    }
    for (const m of diff.missing) {
      overall.fn++;
      const t = perType.get(m.type) ?? emptyTally();
      t.fn++;
      perType.set(m.type, t);
    }
    for (const e of diff.extra) {
      overall.fp++;
      const t = perType.get(e.type) ?? emptyTally();
      t.fp++;
      perType.set(e.type, t);
    }
  }

  latencies.sort((a, b) => a - b);
  const latency = {
    meanMs: latencies.reduce((s, v) => s + v, 0) / latencies.length,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    maxMs: latencies[latencies.length - 1] ?? 0,
  };

  const perTypeReport: Record<
    string,
    { tp: number; fp: number; fn: number; precision: number; recall: number; f1: number }
  > = {};
  for (const [type, t] of [...perType.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    perTypeReport[type] = {
      ...t,
      precision: round(precisionOf(t)),
      recall: round(recallOf(t)),
      f1: round(f1Of(t)),
    };
  }

  return {
    sensitivity,
    corpusSize: corpus.length,
    overall: {
      ...overall,
      precision: round(precisionOf(overall)),
      recall: round(recallOf(overall)),
      f1: round(f1Of(overall)),
    },
    perType: perTypeReport,
    latency,
    diffs,
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function main() {
  const showDiff = process.argv.includes("--diff");
  const report = {
    generatedAt: new Date().toISOString(),
    corpusSize: corpus.length,
    bySensitivity: SENSITIVITIES.map(runAtSensitivity),
  };

  for (const s of report.bySensitivity) {
    console.log(`\n=== sensitivity: ${s.sensitivity} ===`);
    console.log(
      `overall  precision=${s.overall.precision}  recall=${s.overall.recall}  f1=${s.overall.f1}  (tp=${s.overall.tp} fp=${s.overall.fp} fn=${s.overall.fn})`,
    );
    console.log(
      `latency  mean=${s.latency.meanMs.toFixed(2)}ms  p50=${s.latency.p50Ms.toFixed(2)}ms  p95=${s.latency.p95Ms.toFixed(2)}ms  p99=${s.latency.p99Ms.toFixed(2)}ms`,
    );
    console.table(s.perType);

    if (showDiff && s.diffs.length > 0) {
      console.log(`--- diffs (${s.diffs.length} cases with mismatches) ---`);
      for (const d of s.diffs) {
        console.log(`[${d.id}] (${d.category})`);
        if (d.missing.length) console.log(`  missing (FN): ${JSON.stringify(d.missing)}`);
        if (d.extra.length) console.log(`  extra   (FP): ${JSON.stringify(d.extra)}`);
      }
    }
  }

  const outPath = join(__dirname, "results.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nWrote ${outPath}`);
}

main();
