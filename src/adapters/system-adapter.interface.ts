/**
 * System Adapter Interface
 *
 * Defines the contract every system adapter must implement.
 * An adapter is responsible for transforming raw parsed data into
 * Foundry document data structures for a specific RPG system.
 *
 * To add support for a new system (e.g. Pathfinder 2E, D&D 5E):
 * 1. Create a new directory under src/adapters/<system-id>/
 * 2. Implement this interface
 * 3. Register the adapter with AdapterRegistry
 */

import type {
  ContentType,
  ParsedEntry,
  TransformedDocument,
  ParseError,
  ParseWarning,
  RawFieldRecord,
} from "../types/module-types.js";

// ---------------------------------------------------------------------------
// Adapter metadata
// ---------------------------------------------------------------------------

/** Describes which Foundry system an adapter targets. */
export interface AdapterInfo {
  /** Foundry system ID (e.g. "sfrpg", "pf2e", "dnd5e"). */
  systemId: string;
  /** Human-readable system name. */
  systemName: string;
  /** Semantic version of the system this adapter is tested against. */
  targetSystemVersion: string;
  /** Adapter version — increment when the mapping logic changes. */
  adapterVersion: string;
  /** Content types this adapter can handle. */
  supportedTypes: ContentType[];
}

// ---------------------------------------------------------------------------
// Transform result
// ---------------------------------------------------------------------------

/** Result of transforming a single parsed entry. */
export interface TransformResult {
  /** Transformed document ready for Foundry document creation. */
  document: TransformedDocument | null;
  /** Non-fatal warnings encountered during transformation. */
  warnings: ParseWarning[];
  /** Fatal errors that prevented transformation. */
  errors: ParseError[];
}

// ---------------------------------------------------------------------------
// System Adapter Interface
// ---------------------------------------------------------------------------

/**
 * A system adapter converts raw `ParsedEntry` objects into Foundry-ready
 * `TransformedDocument` objects for a specific RPG system.
 *
 * Adapters must be pure/stateless per transformation — all state needed
 * for conversion should come from the entry itself and the adapter's
 * configuration (e.g. mapping JSON files).
 */
export interface ISystemAdapter {
  /** Metadata about this adapter. */
  readonly info: AdapterInfo;

  /**
   * Returns true if this adapter can handle the given content type.
   * @param contentType The content type to check.
   */
  supportsContentType(contentType: ContentType): boolean;

  /**
   * Transforms a raw parsed entry into a Foundry document data object.
   *
   * @param entry The raw parsed entry from a parser.
   * @returns A transform result containing the document (or null on failure)
   *          plus any errors and warnings.
   */
  transform(entry: ParsedEntry): TransformResult;

  /**
   * Returns the Foundry document type string for a given content type.
   * @param contentType The logical content type.
   * @returns "Item", "Actor", or "JournalEntry"
   */
  getDocumentType(contentType: ContentType): "Item" | "Actor" | "JournalEntry";

  /**
   * Returns the system-specific item/actor type string for a content type.
   * For example, for SFRPG and "race" this would return "race".
   * @param contentType The logical content type.
   */
  getSystemType(contentType: ContentType): string;

  /**
   * Produces a minimal valid system data skeleton for a given content type.
   * Used by the manual entry UI to pre-populate empty forms.
   * @param contentType The content type to create a skeleton for.
   */
  createEmptySystemData(contentType: ContentType): RawFieldRecord;

  /**
   * Returns a list of required field names for a given content type.
   * Used by the validator to check completeness before document creation.
   * @param contentType The content type to check.
   */
  getRequiredFields(contentType: ContentType): string[];
}
