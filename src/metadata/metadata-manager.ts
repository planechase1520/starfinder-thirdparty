/**
 * Metadata Manager
 *
 * Handles reading and writing ImportMetadata to/from Foundry document flags.
 * Every document imported by SF3PL stores its metadata in:
 *   document.flags["starfinder-thirdparty"]["sf3pl-metadata"]
 *
 * The metadata schema is versioned so future changes can be migrated.
 */

import type { ImportMetadata, ContentType, BrowseEntry, BrowseFilter } from "../types/module-types.js";

const MODULE_ID = "starfinder-thirdparty";
const METADATA_FLAG_KEY = "sf3pl-metadata";

export class MetadataManager {

  /**
   * Builds a Foundry flags object containing the metadata.
   * @param metadata The metadata to store.
   */
  static buildFlags(metadata: ImportMetadata): Record<string, Record<string, unknown>> {
    return {
      [MODULE_ID]: {
        [METADATA_FLAG_KEY]: {
          ...metadata,
          importDate: metadata.importDate || new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Extracts ImportMetadata from a Foundry document's flags.
   * Returns null if the document was not imported by SF3PL.
   * @param doc Any Foundry document with a getFlag method.
   */
  static getMetadataFromFlags(
    doc: { getFlag?: (scope: string, key: string) => unknown; flags?: Record<string, Record<string, unknown>> }
  ): ImportMetadata | null {
    let rawMeta: unknown;

    if (typeof doc.getFlag === "function") {
      rawMeta = doc.getFlag(MODULE_ID, METADATA_FLAG_KEY);
    } else if (doc.flags?.[MODULE_ID]) {
      rawMeta = doc.flags[MODULE_ID]?.[METADATA_FLAG_KEY];
    }

    if (!rawMeta || typeof rawMeta !== "object") return null;

    return this.normalizeMetadata(rawMeta as Record<string, unknown>);
  }

  /**
   * Creates a default ImportMetadata object for manual construction.
   * @param contentType The content type of the document.
   * @param overrides Optional partial overrides.
   */
  static createDefault(contentType: ContentType, overrides?: Partial<ImportMetadata>): ImportMetadata {
    return {
      sourceBook: "Unknown",
      publisher: "Unknown",
      author: "",
      pageNumber: 0,
      importDate: new Date().toISOString(),
      notes: "",
      tags: [],
      contentType,
      schemaVersion: "1.0.0",
      ...overrides,
    };
  }

  /**
   * Updates the metadata flags on an existing document.
   * @param doc The Foundry document to update.
   * @param metadata The new metadata to set.
   */
  static async updateMetadata(
    doc: { setFlag: (scope: string, key: string, value: unknown) => Promise<unknown> },
    metadata: ImportMetadata
  ): Promise<void> {
    await doc.setFlag(MODULE_ID, METADATA_FLAG_KEY, {
      ...metadata,
      importDate: metadata.importDate || new Date().toISOString(),
    });
  }

  /**
   * Applies a BrowseFilter to a list of BrowseEntry objects.
   * All active filter conditions are ANDed together.
   * @param entries The full list of browseable entries.
   * @param filter The filter criteria.
   */
  static applyFilter(entries: BrowseEntry[], filter: BrowseFilter): BrowseEntry[] {
    return entries.filter((entry) => {
      // Text search against name
      if (filter.searchText) {
        const needle = filter.searchText.toLowerCase();
        const haystack = entry.name.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      // Content type filter
      if (filter.contentTypes && filter.contentTypes.length > 0) {
        if (!filter.contentTypes.includes(entry.contentType)) return false;
      }

      // Publisher filter
      if (filter.publishers && filter.publishers.length > 0) {
        if (!filter.publishers.includes(entry.metadata.publisher)) return false;
      }

      // Source book filter
      if (filter.sourceBooks && filter.sourceBooks.length > 0) {
        if (!filter.sourceBooks.includes(entry.metadata.sourceBook)) return false;
      }

      // Tag filter (entry must have ALL specified tags)
      if (filter.tags && filter.tags.length > 0) {
        const entryTags = new Set(entry.metadata.tags);
        for (const tag of filter.tags) {
          if (!entryTags.has(tag)) return false;
        }
      }

      return true;
    });
  }

  /**
   * Sorts a list of BrowseEntry objects.
   * @param entries The entries to sort.
   * @param sortBy Field to sort by ("name" | "publisher" | "sourceBook" | "contentType").
   * @param ascending Sort direction.
   */
  static sortEntries(
    entries: BrowseEntry[],
    sortBy: "name" | "publisher" | "sourceBook" | "contentType" = "name",
    ascending = true
  ): BrowseEntry[] {
    const sorted = [...entries].sort((a, b) => {
      let aVal: string;
      let bVal: string;

      switch (sortBy) {
        case "publisher": aVal = a.metadata.publisher; bVal = b.metadata.publisher; break;
        case "sourceBook": aVal = a.metadata.sourceBook; bVal = b.metadata.sourceBook; break;
        case "contentType": aVal = a.contentType; bVal = b.contentType; break;
        default: aVal = a.name; bVal = b.name;
      }

      return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return sorted;
  }

  /**
   * Extracts all unique values for a given metadata field from a list of entries.
   * Useful for building filter option dropdowns.
   * @param entries The entries to inspect.
   * @param field The metadata field to extract unique values from.
   */
  static getUniqueValues(entries: BrowseEntry[], field: keyof ImportMetadata): string[] {
    const values = new Set<string>();
    for (const entry of entries) {
      const val = entry.metadata[field];
      if (Array.isArray(val)) {
        for (const tag of val) {
          if (typeof tag === "string") values.add(tag);
        }
      } else if (typeof val === "string" && val !== "") {
        values.add(val);
      }
    }
    return [...values].sort();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Normalizes a raw flags object into a typed ImportMetadata object.
   * Handles migration from older schema versions.
   */
  private static normalizeMetadata(raw: Record<string, unknown>): ImportMetadata {
    return {
      sourceBook: typeof raw["sourceBook"] === "string" ? raw["sourceBook"] : "Unknown",
      publisher: typeof raw["publisher"] === "string" ? raw["publisher"] : "Unknown",
      author: typeof raw["author"] === "string" ? raw["author"] : "",
      pageNumber: typeof raw["pageNumber"] === "number" ? raw["pageNumber"] : 0,
      importDate: typeof raw["importDate"] === "string" ? raw["importDate"] : new Date().toISOString(),
      notes: typeof raw["notes"] === "string" ? raw["notes"] : "",
      tags: Array.isArray(raw["tags"]) ? (raw["tags"] as string[]) : [],
      contentType: (raw["contentType"] ?? "equipment") as ContentType,
      schemaVersion: typeof raw["schemaVersion"] === "string" ? raw["schemaVersion"] : "1.0.0",
    };
  }
}
