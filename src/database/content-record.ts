/**
 * Content Record Types — Milestone 2
 *
 * Defines the shape of every record stored in the SF3PL content database.
 * Records are system-agnostic staging data — they are NOT Foundry documents.
 * A future migration step (Milestone 3+) will convert them into Foundry Items,
 * Actors, and JournalEntries.
 *
 * Design principle: store as much original source data as possible so the
 * conversion step has full fidelity, without coupling to any system schema.
 */

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

/**
 * All supported content categories for Milestone 2.
 * Maps to logical content types for eventual Foundry document conversion.
 */
export const CONTENT_CATEGORIES = [
  "weapon",
  "armor",
  "equipment",
  "augmentation",
  "feat",
  "spell",
  "race",          // species
  "theme",
  "class",
  "archetypeFeature",
  "vehicle",
  "starship",
  "npc",
  "hazard",
  "journal",
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

/** Human-readable labels for each category. */
export const CATEGORY_LABELS: Readonly<Record<ContentCategory, string>> = {
  weapon: "Weapon",
  armor: "Armor",
  equipment: "Equipment",
  augmentation: "Augmentation",
  feat: "Feat",
  spell: "Spell",
  race: "Species",
  theme: "Theme",
  class: "Class",
  archetypeFeature: "Archetype",
  vehicle: "Vehicle",
  starship: "Starship",
  npc: "NPC",
  hazard: "Hazard",
  journal: "Journal Entry",
};

/** Returns true if the string is a valid ContentCategory. */
export function isValidCategory(value: unknown): value is ContentCategory {
  return typeof value === "string" && (CONTENT_CATEGORIES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Import Method
// ---------------------------------------------------------------------------

export type ImportMethod = "json" | "csv" | "txt" | "paste";

export const IMPORT_METHOD_LABELS: Readonly<Record<ImportMethod, string>> = {
  json: "JSON File",
  csv: "CSV File",
  txt: "Text / OCR File",
  paste: "Pasted Text",
};

// ---------------------------------------------------------------------------
// Content Record
// ---------------------------------------------------------------------------

/**
 * A single content record in the SF3PL database.
 *
 * `rawContent` holds all field data as parsed from the source — it is not
 * validated against any system schema. The record acts as a clean staging
 * buffer before system-specific document creation.
 */
export interface ContentRecord {
  /** UUID-style unique identifier generated at import time. */
  id: string;

  /** Display name of the content item. */
  name: string;

  /** Content category (determines future Foundry document type). */
  category: ContentCategory;

  /** Source book or product where this content appears. */
  sourceBook: string;

  /** Publisher of the source book. */
  publisher: string;

  /** Author(s) of the content. */
  author: string;

  /** Page number in the source book. */
  pageNumber: number;

  /** User-defined tags for filtering. Comma-separated at import; stored as array. */
  tags: string[];

  /** GM notes attached to this record. */
  notes: string;

  /**
   * All raw field data parsed from the source file.
   * Structure varies by category but is preserved exactly as parsed.
   */
  rawContent: Record<string, unknown>;

  /** ISO 8601 timestamp of when this record was added to the database. */
  importedDate: string;

  /** How the record was imported. */
  importMethod: ImportMethod;

  /** Semantic version of the database schema this record was written with. */
  schemaVersion: string;
}

// ---------------------------------------------------------------------------
// Partial (for form binding)
// ---------------------------------------------------------------------------

/**
 * A minimal partial ContentRecord used during the import preview step.
 * The user can fill in missing fields before saving.
 */
export type ContentRecordDraft = Omit<ContentRecord, "id" | "importedDate" | "schemaVersion">;

// ---------------------------------------------------------------------------
// Query / Filter
// ---------------------------------------------------------------------------

/** Filter criteria for querying the content database. */
export interface ContentFilter {
  /** Substring match on name (case-insensitive). */
  searchText?: string;
  /** Restrict to specific categories. */
  categories?: ContentCategory[];
  /** Restrict to specific publishers. */
  publishers?: string[];
  /** Restrict to specific source books. */
  sourceBooks?: string[];
  /** Record must have ALL of these tags. */
  tags?: string[];
  /** Import method filter. */
  importMethod?: ImportMethod;
}

/** Field keys available for sorting. */
export type SortField = "name" | "category" | "sourceBook" | "publisher" | "importedDate";

export interface SortConfig {
  field: SortField;
  ascending: boolean;
}

// ---------------------------------------------------------------------------
// Import batch result
// ---------------------------------------------------------------------------

/**
 * Result of saving a batch of records to the database.
 */
export interface SaveResult {
  /** Records successfully added. */
  added: ContentRecord[];
  /** Records skipped because a matching name already existed. */
  skipped: string[];
  /** Records overwritten (when overwrite mode is selected). */
  overwritten: ContentRecord[];
  /** Records that failed to save (unusual errors). */
  failed: Array<{ name: string; reason: string }>;
}
