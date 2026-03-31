import type { PiiPattern } from "../types.js";

/**
 * Central registry for all PII detection patterns.
 * Patterns are registered by region/category and merged at detection time.
 */
const patterns: PiiPattern[] = [];

export function registerPatterns(newPatterns: PiiPattern[]): void {
  patterns.push(...newPatterns);
}

export function getPatterns(): readonly PiiPattern[] {
  return patterns;
}

export function getPatternsByType(type: string): readonly PiiPattern[] {
  return patterns.filter((p) => p.type === type);
}
