/**
 * Converter Types — Milestone 3
 *
 * Defines the interfaces and data shapes used by all Starfinder 1E
 * content converters. Converters transform ContentRecord objects (from
 * the M2 database) into Foundry-compatible document data ready for
 * insertion into compendium packs.
 *
 * Design: each converter is a stateless class implementing ICategoryConverter.
 * A ConverterRegistry maps ContentCategory values to the appropriate converter.
 */

import type { ContentCategory } from "../../database/content-record.js";
import type { ContentRecord } from "../../database/content-record.js";

// ── Foundry document data shapes ─────────────────────────────────────────────

/** Foundry document data for an Item (ready to pass to Item.create). */
export interface FoundryItemData {
  name: string;
  type: string;
  img?: string;
  system: Record<string, unknown>;
  flags: Record<string, unknown>;
}

/** Foundry document data for an Actor (ready to pass to Actor.create). */
export interface FoundryActorData {
  name: string;
  type: string;
  img?: string;
  system: Record<string, unknown>;
  items?: FoundryItemData[];
  flags: Record<string, unknown>;
}

/** Foundry document data for a JournalEntry page. */
export interface FoundryJournalData {
  name: string;
  pages: Array<{
    name: string;
    type: "text";
    text: { content: string; format: number };
  }>;
  flags: Record<string, unknown>;
}

export type FoundryDocData = FoundryItemData | FoundryActorData | FoundryJournalData;

// ── Conversion result ─────────────────────────────────────────────────────────

/** Result of converting a single ContentRecord to a Foundry document. */
export interface ConversionResult {
  /** Whether conversion succeeded (no fatal errors). */
  success: boolean;
  /** The fully-built Foundry document data, or null on failure. */
  documentData: FoundryDocData | null;
  /** Foundry document type: "Item" | "Actor" | "JournalEntry". */
  documentType: "Item" | "Actor" | "JournalEntry";
  /** Target compendium pack ID (e.g. "starfinder-thirdparty.sftpl-weapons"). */
  packId: string;
  /** Non-fatal warnings produced during conversion. */
  warnings: string[];
  /** Fatal errors that caused conversion failure. */
  errors: string[];
  /** Source record name (for reporting). */
  recordName: string;
  /** Source record id (for reporting). */
  recordId: string;
}

// ── SF3PL metadata flags ──────────────────────────────────────────────────────

/**
 * Metadata stored in document flags under the "starfinder-thirdparty" namespace.
 * Attached to every document we create so it can be traced back to its source.
 */
export interface Sf3plDocumentFlags {
  sourceBook: string;
  publisher: string;
  author: string;
  pageNumber: number;
  importDate: string;
  recordId: string;
  tags: string[];
  notes: string;
  importMethod: string;
  schemaVersion: string;
}

export const FLAGS_NAMESPACE = "starfinder-thirdparty";
export const FLAGS_SCHEMA_VERSION = "3.0.0";

// ── Category converter interface ──────────────────────────────────────────────

/**
 * Contract for all category-specific converters.
 * Implementations handle: field mapping, default skeletons, and validation.
 */
export interface ICategoryConverter {
  /** Content category this converter handles. */
  readonly category: ContentCategory;
  /** Foundry document type produced. */
  readonly documentType: "Item" | "Actor" | "JournalEntry";
  /** The SFRPG type string written into the document (e.g. "weapon", "npc2"). */
  readonly sfrpgType: string;
  /** Compendium pack ID suffix (e.g. "sftpl-weapons"). */
  readonly packSuffix: string;

  /**
   * Convert a ContentRecord from the database to a Foundry document.
   * @param record The source record.
   */
  convert(record: ContentRecord): ConversionResult;
}

// ── Field-mapping helpers ─────────────────────────────────────────────────────

/** A field mapping entry read from a config JSON file. */
export interface FieldMapping {
  /** Source key in rawContent. */
  source: string;
  /** Dot-path in the Foundry system data object. E.g. "damage[0].formula" */
  target: string;
  /** Type coercion to apply. */
  type?: "string" | "number" | "boolean" | "array";
  /** Default value when source is absent. */
  default?: unknown;
}

/** Shape of a mapping config file (e.g. config/weapon-mapping.json). */
export interface MappingConfig {
  schemaVersion: string;
  category: string;
  fields: FieldMapping[];
}

// ── Helper utilities ──────────────────────────────────────────────────────────

/**
 * Safely reads a value from rawContent by key.
 * Returns `fallback` when the key is missing or the value is null/undefined.
 */
export function raw<T>(
  rawContent: Record<string, unknown>,
  key: string,
  fallback: T
): T {
  const val = rawContent[key];
  if (val === undefined || val === null) return fallback;
  return val as T;
}

/** Coerces a value to a number, returning `fallback` on NaN. */
export function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

/** Coerces a value to a string. */
export function toStr(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

/** Coerces a value to a boolean. */
export function toBool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase();
  if (s === "true" || s === "yes" || s === "1") return true;
  if (s === "false" || s === "no" || s === "0") return false;
  return fallback;
}

/** Parses a comma-separated string into an array of trimmed strings. */
export function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return (value as unknown[]).map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Builds the standard SF3PL flags object from a ContentRecord. */
export function buildFlags(record: ContentRecord): Record<string, Sf3plDocumentFlags> {
  return {
    [FLAGS_NAMESPACE]: {
      sourceBook: record.sourceBook,
      publisher: record.publisher,
      author: record.author,
      pageNumber: record.pageNumber,
      importDate: new Date().toISOString(),
      recordId: record.id,
      tags: record.tags,
      notes: record.notes,
      importMethod: record.importMethod,
      schemaVersion: FLAGS_SCHEMA_VERSION,
    },
  };
}

/** Applies a set of FieldMapping entries to a rawContent object, returning a flat key→value map. */
export function applyFieldMappings(
  rawContent: Record<string, unknown>,
  mappings: FieldMapping[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const m of mappings) {
    const val = rawContent[m.source];
    if (val !== undefined && val !== null) {
      result[m.target] = coerce(val, m.type);
    } else if (m.default !== undefined) {
      result[m.target] = m.default;
    }
  }
  return result;
}

function coerce(value: unknown, type?: string): unknown {
  switch (type) {
    case "number": return toNum(value);
    case "boolean": return toBool(value);
    case "array": return toArray(value);
    case "string":
    default: return toStr(value);
  }
}
