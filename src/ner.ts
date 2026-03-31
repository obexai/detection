import nlp from "compromise";
import type { PiiEntity, PiiEntityType } from "./types.js";

/** NER confidence scores — lower than regex since NER is less precise */
const NER_CONFIDENCE: Record<string, number> = {
  person_name: 0.7,
  organization: 0.6,
  location: 0.65,
};

/** Entity types detected by NER */
export const NER_ENTITY_TYPES: readonly PiiEntityType[] = [
  "person_name",
  "organization",
  "location",
];

/**
 * Run NER detection on text using compromise.js.
 * Returns PII entities for person names, organizations, and locations.
 */
export function detectWithNer(text: string): PiiEntity[] {
  const doc = nlp(text);
  const entities: PiiEntity[] = [];

  extractEntities(doc.people(), text, "person_name", entities);
  extractEntities(doc.organizations(), text, "organization", entities);
  extractEntities(doc.places(), text, "location", entities);

  return entities;
}

function extractEntities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any,
  originalText: string,
  type: PiiEntityType,
  out: PiiEntity[],
): void {
  const matches = view.json({ offset: true });
  for (const match of matches) {
    const offset = match.offset;
    if (!offset) continue;

    const start = offset.start as number;
    const length = offset.length as number;
    const end = start + length;

    // Use original text slice as value to preserve exact whitespace
    const value = originalText.slice(start, end);
    if (!value.trim()) continue;

    out.push({
      type,
      value,
      start,
      end,
      confidence: NER_CONFIDENCE[type] ?? 0.5,
      source: "ner",
    });
  }
}
