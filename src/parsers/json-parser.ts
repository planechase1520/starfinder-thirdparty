/**
 * JSON Parser
 *
 * Parses a JSON file containing one or more content entries.
 *
 * Accepted JSON shapes:
 *   1. Single entry object:      { "name": "...", "type": "weapon", ... }
 *   2. Array of entry objects:   [ { ... }, { ... } ]
 *   3. Wrapped object:           { "items": [ ... ] }  (path resolved via options.jsonRootPath)
 *
 * Metadata fields (sourceBook, publisher, author, pageNumber, tags, notes)
 * may be embedded in each entry object or provided via options.sourceMetadata.
 */

import type { IParser } from "./parser.interface.js";
import type {
  ParseResult,
  ParsedEntry,
  ParserOptions,
  ContentType,
  ParseError,
  RawFieldRecord,
  RawFieldValue,
} from "../types/module-types.js";

const METADATA_FIELD_NAMES = new Set([
  "sourceBook",
  "publisher",
  "author",
  "pageNumber",
  "tags",
  "notes",
  "importDate",
  "schemaVersion",
]);

export class JsonParser implements IParser {
  readonly type = "json" as const;
  readonly displayName = "JSON Import";
  readonly acceptedExtensions = [".json"];

  canHandleFile(fileName: string): boolean {
    return fileName.endsWith(".json");
  }

  parse(input: string, options?: ParserOptions): ParseResult {
    const errors: ParseError[] = [];
    const warnings: ParseResult["warnings"] = [];
    const entries: ParsedEntry[] = [];

    // Parse the raw JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(input) as unknown;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        code: "JSON_PARSE_ERROR",
        message: `Failed to parse JSON: ${message}`,
        severity: "error",
      });
      return { entries, errors, warnings };
    }

    // Resolve the root array of entries
    const rawEntries = this.resolveRoot(parsed, options?.jsonRootPath, errors);
    if (rawEntries === null) return { entries, errors, warnings };

    // Process each entry object
    rawEntries.forEach((raw, index) => {
      const ref = `index:${index}`;

      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        warnings.push({
          code: "INVALID_ENTRY",
          message: `Entry at index ${index} is not an object; skipping.`,
          severity: "warning",
          sourceReference: ref,
        });
        return;
      }

      const rawRecord = raw as Record<string, unknown>;

      // Determine content type
      const typeValue = rawRecord["type"] ?? rawRecord["contentType"];
      const contentType: ContentType = (
        typeof typeValue === "string" && typeValue !== ""
          ? typeValue
          : options?.defaultContentType ?? "equipment"
      ) as ContentType;

      // Extract metadata fields
      const partialMeta: Record<string, unknown> = {};
      const data: RawFieldRecord = {};

      for (const [key, value] of Object.entries(rawRecord)) {
        if (key === "type" || key === "contentType") continue;

        if (METADATA_FIELD_NAMES.has(key)) {
          partialMeta[key] = value;
        } else {
          data[key] = value as RawFieldValue;
        }
      }

      if (!rawRecord["name"]) {
        warnings.push({
          code: "MISSING_NAME",
          message: `Entry at index ${index} has no 'name' field.`,
          severity: "warning",
          sourceReference: ref,
        });
      }

      const mergedMetadata = {
        ...(options?.sourceMetadata ?? {}),
        ...partialMeta,
      };

      entries.push({
        contentType,
        data,
        metadata: mergedMetadata as Partial<import("../types/module-types.js").ImportMetadata>,
        sourceReference: ref,
      });
    });

    return { entries, errors, warnings };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Resolves the root array of entry objects from parsed JSON.
   * Handles arrays, wrapped objects, and single-entry objects.
   */
  private resolveRoot(
    parsed: unknown,
    rootPath: string | undefined,
    errors: ParseError[]
  ): Record<string, unknown>[] | null {
    let target = parsed;

    // Resolve optional root path (e.g. "items" or "data.entries")
    if (rootPath) {
      const parts = rootPath.split(".");
      for (const part of parts) {
        if (typeof target !== "object" || target === null) {
          errors.push({
            code: "JSON_ROOT_PATH_ERROR",
            message: `Root path '${rootPath}' could not be resolved.`,
            severity: "error",
          });
          return null;
        }
        target = (target as Record<string, unknown>)[part];
      }
    }

    if (Array.isArray(target)) {
      return target as Record<string, unknown>[];
    }

    if (typeof target === "object" && target !== null && !Array.isArray(target)) {
      // Single object — wrap it in an array
      return [target as Record<string, unknown>];
    }

    errors.push({
      code: "JSON_NO_ENTRIES",
      message: "JSON root is not an array or object.",
      severity: "error",
    });
    return null;
  }
}
