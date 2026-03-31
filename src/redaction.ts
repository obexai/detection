import type { PiiEntity } from "./types.js";

/**
 * Replace detected PII entities with redaction tokens.
 * Processes entities in reverse order to preserve string indices.
 */
export function redact(text: string, entities: PiiEntity[]): string {
  // Track count per type for unique tokens: [EMAIL_1], [EMAIL_2], etc.
  const counters = new Map<string, number>();

  // Sort by start position descending so replacements don't shift indices
  const sorted = [...entities].sort((a, b) => b.start - a.start);

  let result = text;
  for (const entity of sorted) {
    const count = (counters.get(entity.type) ?? 0) + 1;
    counters.set(entity.type, count);
    const token = `[${entity.type.toUpperCase()}_${count}]`;
    result = result.slice(0, entity.start) + token + result.slice(entity.end);
  }

  return result;
}
