/**
 * Algophony Studio — Metadata CSV Mapper
 *
 * Maps CSV columns to SfxPromptAttributes fields.
 * Uses papaparse for parsing, produces prompt cards from rows.
 */

import type { SfxPromptAttributes } from "./prompt-schema";

/** Supported CSV field names that can map to prompt attributes */
export const MAPPABLE_FIELDS = [
  "filename", "description", "category", "subcategory", "keywords",
  "duration", "material", "action", "location", "space",
  "perspective", "mood", "exclusions",
] as const;

export type MappableField = (typeof MAPPABLE_FIELDS)[number];

/** Field mapping: CSV header -> SfxPromptAttributes key */
export type FieldMapping = Record<string, MappableField | "skip">;

/** A parsed CSV row */
export interface CsvRow {
  [header: string]: string;
}

/**
 * Auto-suggest mappings from CSV headers to Atlas fields.
 */
export function suggestMappings(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {};

  const synonyms: Record<string, MappableField> = {
    filename: "filename",
    file: "filename",
    name: "filename",
    description: "description",
    desc: "description",
    category: "category",
    cat: "category",
    type: "category",
    subcategory: "subcategory",
    sub: "subcategory",
    subcat: "subcategory",
    keywords: "keywords",
    tags: "keywords",
    keyword: "keywords",
    duration: "duration",
    length: "duration",
    dur: "duration",
    material: "material",
    mat: "material",
    action: "action",
    verb: "action",
    location: "location",
    loc: "location",
    environment: "location",
    env: "location",
    space: "space",
    acoustic: "space",
    room: "space",
    perspective: "perspective",
    mic: "perspective",
    mood: "mood",
    tone: "mood",
    emotion: "mood",
    exclusions: "exclusions",
    exclude: "exclusions",
    avoid: "exclusions",
  };

  for (const header of headers) {
    const normalized = header.toLowerCase().trim().replace(/[^a-z]/g, "");
    mapping[header] = synonyms[normalized] ?? "skip";
  }

  return mapping;
}

/**
 * Convert a single CSV row into partial SfxPromptAttributes using the mapping.
 */
export function mapRowToAttributes(
  row: CsvRow,
  mapping: FieldMapping
): Partial<SfxPromptAttributes> {
  const attrs: Partial<SfxPromptAttributes> = {
    loop: false,
    promptInfluence: 0.3,
    modelId: "eleven_text_to_sound_v2",
    exclusions: [],
  };

  for (const [header, field] of Object.entries(mapping)) {
    if (field === "skip" || !row[header]) continue;
    const value = row[header].trim();
    if (!value) continue;

    switch (field) {
      case "category":
        attrs.category = value;
        break;
      case "subcategory":
        attrs.subcategory = value;
        break;
      case "description":
        attrs.sourceObject = value;
        break;
      case "keywords":
        // Split keywords and use first as action, rest as texture
        const kw = value.split(/[,;|]/).map((k) => k.trim()).filter(Boolean);
        if (kw.length > 0) attrs.action = kw[0];
        if (kw.length > 1) attrs.texture = kw.slice(1).join(", ");
        break;
      case "duration":
        const dur = parseFloat(value);
        if (!isNaN(dur) && dur >= 0.5 && dur <= 30) {
          attrs.durationSeconds = dur;
        }
        break;
      case "material":
        attrs.material = value;
        break;
      case "action":
        attrs.action = value;
        break;
      case "location":
        attrs.environment = value;
        break;
      case "space":
        attrs.acousticSpace = value;
        break;
      case "perspective":
        attrs.perspective = value;
        break;
      case "mood":
        attrs.mood = value;
        break;
      case "exclusions":
        attrs.exclusions = value.split(/[,;|]/).map((e) => e.trim()).filter(Boolean);
        break;
    }
  }

  return attrs;
}

/**
 * Convert multiple CSV rows into prompt card attributes.
 */
export function mapRowsToCards(
  rows: CsvRow[],
  mapping: FieldMapping
): Array<Partial<SfxPromptAttributes>> {
  return rows.map((row) => mapRowToAttributes(row, mapping));
}
