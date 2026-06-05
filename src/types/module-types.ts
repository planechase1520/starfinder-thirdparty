/**
 * Core type definitions for the Starfinder Third Party Library module.
 * These types are system-agnostic and form the foundation of the import pipeline.
 */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/** Metadata attached to every imported document. */
export interface ImportMetadata {
  /** Name of the source book (e.g. "Near Space", "Starfinder Core Rulebook"). */
  sourceBook: string;
  /** Publisher name (e.g. "Paizo", "Legendary Games"). */
  publisher: string;
  /** Author(s) of the source material. */
  author: string;
  /** Page number in the source book where the content appears. */
  pageNumber: number;
  /** ISO 8601 date string of when this document was imported. */
  importDate: string;
  /** Optional GM notes about this content. */
  notes: string;
  /** Arbitrary tags for filtering and searching. */
  tags: string[];
  /** Content type identifier (maps to a compendium pack). */
  contentType: ContentType;
  /** Version of the import schema used. */
  schemaVersion: string;
}

// ---------------------------------------------------------------------------
// Content Types
// ---------------------------------------------------------------------------

/** All supported content types across all adapters. */
export type ContentType =
  | "weapon"
  | "armor"
  | "equipment"
  | "augmentation"
  | "feat"
  | "spell"
  | "race"        // species in Starfinder 1E
  | "theme"
  | "class"
  | "archetypeFeature"
  | "vehicle"
  | "starship"
  | "npc"
  | "hazard"
  | "journal";

/** Document categories split by Foundry document type. */
export type ItemContentType = Extract<
  ContentType,
  "weapon" | "armor" | "equipment" | "augmentation" | "feat" | "spell" | "race" | "theme" | "class" | "archetypeFeature"
>;

export type ActorContentType = Extract<ContentType, "vehicle" | "starship" | "npc" | "hazard">;

export type JournalContentType = Extract<ContentType, "journal">;

// ---------------------------------------------------------------------------
// Raw parsed data (output of parsers, input to adapters)
// ---------------------------------------------------------------------------

/**
 * Raw data record produced by a parser before system-specific transformation.
 * Keys are field names, values are raw strings or structured data.
 */
export type RawFieldValue = string | number | boolean | null | RawFieldRecord | RawFieldValue[];

export interface RawFieldRecord {
  [key: string]: RawFieldValue;
}

/**
 * A single raw parsed entry from a CSV, JSON, or OCR source.
 */
export interface ParsedEntry {
  /** The detected or declared content type. */
  contentType: ContentType;
  /** Raw field data from the source. */
  data: RawFieldRecord;
  /** Optional metadata fields found in the source. */
  metadata?: Partial<ImportMetadata>;
  /** Source-file-level identifier for tracing errors back to line/row. */
  sourceReference?: string;
}

// ---------------------------------------------------------------------------
// Import pipeline stages
// ---------------------------------------------------------------------------

/** Parse result from a parser — could contain multiple entries. */
export interface ParseResult {
  entries: ParsedEntry[];
  errors: ParseError[];
  warnings: ParseWarning[];
  sourceFile?: string;
}

/** A single entry ready for Foundry document creation (after adapter transform). */
export interface TransformedDocument {
  /** Foundry document type. */
  documentType: "Item" | "Actor" | "JournalEntry";
  /** System-specific item/actor type (e.g. "weapon", "npc"). */
  systemType: string;
  /** Document name. */
  name: string;
  /** System data payload (ready to set as document.system). */
  system: RawFieldRecord;
  /** Import metadata stored in flags. */
  metadata: ImportMetadata;
  /** Original parsed entry for debugging. */
  source: ParsedEntry;
}

/** Full import session tracking a complete pipeline run. */
export interface ImportSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: "pending" | "parsing" | "validating" | "importing" | "done" | "failed";
  sourceFile?: string;
  parserType: ParserType;
  systemId: string;
  totalEntries: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: ParseError[];
  warnings: ParseWarning[];
  createdDocuments: CreatedDocumentRef[];
}

/** Reference to a document created during import. */
export interface CreatedDocumentRef {
  documentType: "Item" | "Actor" | "JournalEntry";
  id: string;
  name: string;
  packName: string;
  contentType: ContentType;
}

// ---------------------------------------------------------------------------
// Errors and Warnings
// ---------------------------------------------------------------------------

export interface ParseError {
  code: string;
  message: string;
  field?: string;
  sourceReference?: string;
  severity: "error";
  data?: unknown;
}

export interface ParseWarning {
  code: string;
  message: string;
  field?: string;
  sourceReference?: string;
  severity: "warning";
  data?: unknown;
}

// ---------------------------------------------------------------------------
// Parser types
// ---------------------------------------------------------------------------

export type ParserType = "csv" | "json" | "ocr" | "manual";

export interface ParserOptions {
  /** Content type to assign if not detected automatically. */
  defaultContentType?: ContentType;
  /** Source metadata to inject into every parsed entry. */
  sourceMetadata?: Partial<ImportMetadata>;
  /** CSV-specific: custom delimiter character. */
  csvDelimiter?: string;
  /** JSON-specific: JSON path to the array of items (e.g. "items[]"). */
  jsonRootPath?: string;
  /** OCR-specific: template name for content extraction. */
  ocrTemplate?: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: ParseError[];
  warnings: ParseWarning[];
  entry: ParsedEntry;
}

export interface ValidationReport {
  totalChecked: number;
  passed: number;
  failed: number;
  results: ValidationResult[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Search / Browse
// ---------------------------------------------------------------------------

export interface BrowseFilter {
  searchText?: string;
  contentTypes?: ContentType[];
  publishers?: string[];
  sourceBooks?: string[];
  tags?: string[];
  levelMin?: number;
  levelMax?: number;
  creatureTypes?: string[];
}

export interface BrowseEntry {
  id: string;
  name: string;
  contentType: ContentType;
  metadata: ImportMetadata;
  packName: string;
  documentType: "Item" | "Actor" | "JournalEntry";
}
