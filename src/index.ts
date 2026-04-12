import { getPatterns } from "./patterns/registry.js";
import { redact } from "./redaction.js";
import { detectWithNer } from "./ner.js";
import type { DetectionResult, DetectorConfig, PiiEntity, Sensitivity } from "./types.js";

// Auto-register all built-in patterns on import
import "./patterns/index.js";

export type { DetectionResult, DetectorConfig, PiiEntity, PiiEntityType, Sensitivity, PiiPattern } from "./types.js";
export { registerPatterns, getPatterns } from "./patterns/registry.js";
export { redact } from "./redaction.js";
export { NER_ENTITY_TYPES } from "./ner.js";

/** Minimum confidence thresholds per sensitivity level */
const SENSITIVITY_THRESHOLDS: Record<Sensitivity, number> = {
  low: 0.8,
  medium: 0.5,
  high: 0.3,
};

const DEFAULT_MAX_INPUT_BYTES = 102_400; // 100KB
const DEFAULT_SCAN_WARN_MS = 100;

export class PiiDetector {
  private config: Required<DetectorConfig>;

  constructor(config: DetectorConfig = {}) {
    this.config = {
      sensitivity: config.sensitivity ?? "medium",
      entities: config.entities ?? [],
      exclude: config.exclude ?? [],
      maxInputBytes: config.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES,
      scanWarnMs: config.scanWarnMs ?? DEFAULT_SCAN_WARN_MS,
    };
  }

  /**
   * Scan a string for PII entities.
   * Returns all detected entities, redacted text, and a risk score.
   */
  scan(text: string): DetectionResult {
    // Skip scan for oversized inputs
    if (new TextEncoder().encode(text).byteLength > this.config.maxInputBytes) {
      console.warn(
        `Obex: Input exceeds ${this.config.maxInputBytes} bytes, skipping PII scan`,
      );
      return { entities: [], redacted: text, score: 0, latencyMs: 0 };
    }

    const start = performance.now();
    const threshold = SENSITIVITY_THRESHOLDS[this.config.sensitivity];
    const entities: PiiEntity[] = [];

    for (const pattern of getPatterns()) {
      // Skip excluded entity types
      if (this.config.exclude.includes(pattern.type)) continue;

      // If specific entities requested, skip non-matching
      if (this.config.entities.length > 0 && !this.config.entities.includes(pattern.type)) continue;

      // Skip patterns below confidence threshold
      if (pattern.confidence < threshold) continue;

      // Run regex (use a fresh copy to reset lastIndex)
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const value = match[0];

        // Run optional validator (e.g. Luhn check)
        if (pattern.validate && !pattern.validate(value)) continue;

        entities.push({
          type: pattern.type,
          value,
          start: match.index,
          end: match.index + value.length,
          confidence: pattern.confidence,
          source: "regex",
        });

        // Prevent infinite loops on zero-length matches
        if (match[0].length === 0) regex.lastIndex++;
      }
    }

    // PASS 2: NER detection (person names, organizations, locations)
    const nerEntities = detectWithNer(text);
    for (const entity of nerEntities) {
      if (this.config.exclude.includes(entity.type)) continue;
      if (this.config.entities.length > 0 && !this.config.entities.includes(entity.type)) continue;
      if (entity.confidence < threshold) continue;
      entities.push(entity);
    }

    // Deduplicate overlapping entities — keep highest confidence
    const deduped = deduplicateEntities(entities);

    const latencyMs = performance.now() - start;

    if (this.config.scanWarnMs > 0 && latencyMs > this.config.scanWarnMs) {
      console.warn(
        `Obex: PII scan took ${latencyMs.toFixed(1)}ms (>${this.config.scanWarnMs}ms threshold)`,
      );
    }

    return {
      entities: deduped,
      redacted: redact(text, deduped),
      score: calculateRiskScore(deduped),
      latencyMs,
    };
  }
}

/** Remove overlapping detections, keeping the highest confidence match */
function deduplicateEntities(entities: PiiEntity[]): PiiEntity[] {
  if (entities.length <= 1) return entities;

  const sorted = [...entities].sort((a, b) => a.start - b.start || b.confidence - a.confidence);
  const result: PiiEntity[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];

    // If current overlaps with previous, keep the higher confidence one
    if (curr.start < prev.end) {
      if (curr.confidence > prev.confidence) {
        result[result.length - 1] = curr;
      }
    } else {
      result.push(curr);
    }
  }

  return result;
}

/** Calculate overall risk score based on entity count and confidence */
function calculateRiskScore(entities: PiiEntity[]): number {
  if (entities.length === 0) return 0;

  const avgConfidence =
    entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;

  // Scale: more entities = higher risk, capped at 1.0
  const countFactor = Math.min(entities.length / 5, 1);

  return Math.min(avgConfidence * 0.6 + countFactor * 0.4, 1);
}
