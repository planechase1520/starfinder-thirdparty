/**
 * Converter Base Class — Milestone 3
 *
 * Abstract base class for all category-specific converters.
 * Provides:
 *   - Common document-wrapping logic
 *   - Flag injection from ContentRecord metadata
 *   - A `merge()` helper for deep-merging skeleton + mapped fields
 *   - Default ConversionResult builders (success / failure)
 *
 * Subclasses must implement:
 *   - buildSystemData(record) → category-specific SFRPG system data object
 *   - getDefaultSkeleton()    → base system data with all required defaults
 */

import type { ContentRecord } from "../../database/content-record.js";
import type {
  ICategoryConverter,
  ConversionResult,
  FoundryItemData,
  FoundryActorData,
} from "./converter-types.js";
import { buildFlags, raw, toNum, toStr } from "./converter-types.js";
import { ModuleLogger } from "../../utils/logger.js";

const MODULE_ID = "starfinder-thirdparty";

export abstract class ConverterBase implements ICategoryConverter {
  abstract readonly category: import("../../database/content-record.js").ContentCategory;
  abstract readonly documentType: "Item" | "Actor" | "JournalEntry";
  abstract readonly sfrpgType: string;
  abstract readonly packSuffix: string;

  /**
   * Build the category-specific SFRPG system data from a record.
   * Receives the full record including rawContent.
   */
  protected abstract buildSystemData(record: ContentRecord): Record<string, unknown>;

  /**
   * The full pack collection ID for this category.
   * E.g. "starfinder-thirdparty.sftpl-weapons"
   */
  get packId(): string {
    return `${MODULE_ID}.${this.packSuffix}`;
  }

  /**
   * Convert a ContentRecord into a Foundry document data object.
   * Wraps buildSystemData() with metadata injection and error handling.
   */
  convert(record: ContentRecord): ConversionResult {
    const warnings: string[] = [];

    try {
      const systemData = this.buildSystemData(record);
      const flags = buildFlags(record);

      let documentData: FoundryItemData | FoundryActorData;

      if (this.documentType === "Item") {
        documentData = {
          name: record.name,
          type: this.sfrpgType,
          system: systemData,
          flags,
        } as FoundryItemData;
      } else {
        documentData = {
          name: record.name,
          type: this.sfrpgType,
          system: systemData,
          flags,
        } as FoundryActorData;
      }

      if (!record.sourceBook) warnings.push("Missing source book.");
      if (!record.publisher) warnings.push("Missing publisher.");
      if (record.pageNumber <= 0) warnings.push("Missing page number.");

      return {
        success: true,
        documentData,
        documentType: this.documentType,
        packId: this.packId,
        warnings,
        errors: [],
        recordName: record.name,
        recordId: record.id,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ModuleLogger.error(`[${this.category}Converter] Conversion failed for "${record.name}": ${message}`);
      return {
        success: false,
        documentData: null,
        documentType: this.documentType,
        packId: this.packId,
        warnings,
        errors: [message],
        recordName: record.name,
        recordId: record.id,
      };
    }
  }

  // ── Shared field-extraction helpers ──────────────────────────────────────

  protected str(record: ContentRecord, key: string, fallback = ""): string {
    return toStr(raw(record.rawContent, key, fallback), fallback);
  }

  protected num(record: ContentRecord, key: string, fallback = 0): number {
    return toNum(raw(record.rawContent, key, fallback), fallback);
  }

  protected bool(record: ContentRecord, key: string, fallback = false): boolean {
    const val = raw(record.rawContent, key, fallback);
    if (typeof val === "boolean") return val;
    const s = String(val).toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  }

  /** Builds the standard description object used by all SFRPG items/actors. */
  protected description(record: ContentRecord): { value: string; chat: string; unidentified: string } {
    const value = this.str(record, "description");
    return { value, chat: "", unidentified: "" };
  }

  /**
   * Deep-merges `overrides` onto `base`.
   * Only one level deep — sufficient for SFRPG system data objects.
   */
  protected merge(
    base: Record<string, unknown>,
    overrides: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...base };
    for (const [key, value] of Object.entries(overrides)) {
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof result[key] === "object" &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = {
          ...(result[key] as Record<string, unknown>),
          ...(value as Record<string, unknown>),
        };
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
