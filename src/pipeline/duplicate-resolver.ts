/**
 * Duplicate Resolver — Milestone 6
 *
 * Provides utilities for handling naming conflicts when importing content into
 * compendium packs and the content database.
 *
 * Three policies are supported:
 *
 *   skip         — Leave the existing entry unchanged. The new record is skipped.
 *   replace      — Overwrite the existing entry with the new data.
 *   new-version  — Import with a unique versioned name suffix (e.g. "Longsword v2").
 *
 * The ConversionPipeline handles skip / replace through its `overwriteExisting`
 * flag. DuplicateResolver handles the "new-version" name generation before the
 * record is written to the database, so that downstream converters never see a
 * collision.
 */

import type { ContentDatabase as ContentDatabaseType } from "../database/content-database.js";

/**
 * Generates a versioned name that does not already exist in the database.
 *
 * Algorithm:
 *   1. If `baseName` is not taken, return it unchanged.
 *   2. Otherwise try "baseName v2", "baseName v3", … up to v99.
 *   3. If all are taken (unlikely), append a timestamp suffix.
 *
 * @param baseName - The preferred name (e.g. "Longsword").
 * @param db - A reference to the ContentDatabase class (static API).
 * @returns A unique name safe to insert.
 */
export class DuplicateResolver {
  static makeVersionedName(
    baseName: string,
    db: typeof ContentDatabaseType
  ): string {
    if (!db.getByName(baseName)) return baseName;

    for (let v = 2; v <= 99; v++) {
      const candidate = `${baseName} v${v}`;
      if (!db.getByName(candidate)) return candidate;
    }

    return `${baseName} ${Date.now()}`;
  }

  /**
   * Determines whether an existing compendium document with the given name
   * would conflict with the supplied duplicate policy.
   *
   * Returns:
   *   "create"  — no conflict; create a new document.
   *   "update"  — conflict but policy says replace; update the document.
   *   "skip"    — conflict and policy says skip; do nothing.
   *
   * @param existingNames - Set of lowercased names already in the target pack.
   * @param name - The name of the incoming document.
   * @param policy - The active duplicate policy.
   */
  static resolveCompendiumAction(
    existingNames: Set<string>,
    name: string,
    policy: "skip" | "replace" | "new-version"
  ): "create" | "update" | "skip" {
    const lower = name.toLowerCase();
    const exists = existingNames.has(lower);

    if (!exists) return "create";
    if (policy === "replace") return "update";
    return "skip";
  }

  /**
   * Builds a Set of lowercased document names from a compendium index.
   *
   * @param index - The compendium index array (each entry has a `name` field).
   */
  static buildNameSet(index: Array<{ name: string }>): Set<string> {
    return new Set(index.map((e) => e.name.toLowerCase()));
  }
}
