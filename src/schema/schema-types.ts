/**
 * Schema Types — Milestone 4
 *
 * Shared type definitions for the Schema Discovery, Registry, and Mapping
 * systems. All other schema modules import from this file.
 *
 * Design:
 *   A DiscoveredSchema captures every field path discovered in a live Foundry
 *   document type at a specific point in time. Schemas are versioned via a
 *   content hash so changes can be detected automatically.
 */

// ── Field data types ──────────────────────────────────────────────────────────

export type FieldDataType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "unknown";

// ── Discovered field ──────────────────────────────────────────────────────────

/**
 * A single field (or nested path) discovered in a Foundry document's system data.
 * Paths use dot-notation with bracket syntax for arrays, e.g.:
 *   "damage[0].formula"
 *   "abilities.str.value"
 */
export interface DiscoveredField {
  /** Dot-path into the document's `system` object. */
  path: string;
  /** Inferred or declared data type. */
  type: FieldDataType;
  /** True when missing from source data causes a validation error. */
  required: boolean;
  /** True when the field can hold null. */
  nullable: boolean;
  /** The default value used when the field is absent. */
  defaultValue: unknown;
  /** Human-readable label sourced from DataModel or system labels. */
  label?: string;
  /** Allowed values for enum-like string fields. */
  choices?: string[];
  /** For object/array fields: recursive child field list. */
  children?: DiscoveredField[];
}

// ── Discovered schema ─────────────────────────────────────────────────────────

/** How the schema was obtained. Affects trustworthiness of `required` flags. */
export type SchemaSource =
  | "datamodel"          // Foundry V10+ DataModel — most authoritative
  | "system-model"       // game.system.model (legacy template.json)
  | "document-inspection"// Inspected from live document instances
  | "template"           // User-selected template document
  | "manual";            // Hand-authored config

/**
 * Complete schema for one document subtype (e.g. weapon, npc2).
 * Versioned by a SHA-256 hex hash of the field path list for change detection.
 */
export interface DiscoveredSchema {
  /** Game system id, e.g. "sfrpg". */
  systemId: string;
  /** "Item", "Actor", or "JournalEntry". */
  documentType: "Item" | "Actor" | "JournalEntry";
  /** SFRPG subtype, e.g. "weapon", "npc2". */
  subtype: string;
  /** All discovered fields at this point in time. */
  fields: DiscoveredField[];
  /** ISO 8601 timestamp of when this schema was discovered. */
  discoveredAt: string;
  /** Short hash of the sorted field-path list. Used for change detection. */
  schemaHash: string;
  /** How the schema was discovered. */
  source: SchemaSource;
  /** Source document UUID when discovered via template or inspection. */
  sourceDocumentUuid?: string;
}

// ── Schema diff ───────────────────────────────────────────────────────────────

/** The result of comparing two versions of the same document-type schema. */
export interface SchemaDiff {
  systemId: string;
  documentType: string;
  subtype: string;
  previousHash: string;
  currentHash: string;
  /** Fields present in current but not in previous. */
  addedFields: string[];
  /** Fields present in previous but not in current. */
  removedFields: string[];
  /** Fields that exist in both but whose type changed. */
  changedTypes: Array<{ path: string; from: FieldDataType; to: FieldDataType }>;
  /** Fields whose required status changed from false to true. */
  newlyRequired: string[];
  /** ISO timestamp of the comparison. */
  comparedAt: string;
  /** True when there are no differences. */
  isCompatible: boolean;
}

// ── Schema compatibility report ───────────────────────────────────────────────

/** Per-record report of whether rawContent satisfies the discovered schema. */
export interface SchemaCompatibilityReport {
  recordId: string;
  recordName: string;
  category: string;
  /** True when all required fields are present and types match. */
  compatible: boolean;
  /** Required field paths missing from rawContent. */
  missingRequiredFields: string[];
  /** Optional field paths missing (informational only). */
  missingOptionalFields: string[];
  /** rawContent keys not present in the schema (may be typos). */
  unknownFields: string[];
  /** Actionable suggestions for repairing each missing/wrong field. */
  suggestions: Array<{ field: string; suggestion: string }>;
  /** ISO timestamp when the report was generated. */
  generatedAt: string;
}

// ── Batch compatibility result ────────────────────────────────────────────────

export interface BatchCompatibilityResult {
  total: number;
  compatible: number;
  incompatible: number;
  reports: SchemaCompatibilityReport[];
  generatedAt: string;
}

// ── Template entry ────────────────────────────────────────────────────────────

/**
 * A user-selected Foundry document used as a template for schema learning.
 * The system data is stored verbatim so we can extract field paths at any time.
 */
export interface DocumentTemplate {
  /** UUID of the source Foundry document (e.g. Compendium.sfrpg.items.Item.xxx). */
  uuid: string;
  /** Display name of the document. */
  name: string;
  /** "Item" | "Actor" | "JournalEntry" */
  documentType: "Item" | "Actor" | "JournalEntry";
  /** Document subtype, e.g. "weapon". */
  subtype: string;
  /** The full system data snapshot captured at registration time. */
  systemDataSnapshot: Record<string, unknown>;
  /** ISO timestamp of when this template was added. */
  addedAt: string;
  /** User notes about this template. */
  notes: string;
}

// ── Schema key ────────────────────────────────────────────────────────────────

/** Canonical key used to look up a schema in the registry. */
export function makeSchemaKey(documentType: string, subtype: string): string {
  return `${documentType}.${subtype}`;
}

// ── Hash helper ───────────────────────────────────────────────────────────────

/**
 * Produces a short, stable hash string from a sorted list of field paths.
 * Used to detect schema changes between module loads.
 *
 * Uses a simple djb2-style hash — sufficient for change detection, not
 * intended to be cryptographically secure.
 */
export function hashFieldPaths(paths: string[]): string {
  const sorted = [...paths].sort().join("|");
  let hash = 5381;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) + hash) ^ sorted.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(16).padStart(8, "0");
}
