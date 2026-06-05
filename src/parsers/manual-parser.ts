/**
 * Manual Data Entry Parser
 *
 * Converts a single manually-entered data object (from the Import Wizard UI)
 * into a ParsedEntry. Unlike file-based parsers, this parser receives a
 * pre-structured JavaScript object rather than a raw string.
 *
 * The import wizard passes a plain object; this parser validates the shape
 * and wraps it in a ParseResult for the rest of the pipeline.
 */

import type { IParser } from "./parser.interface.js";
import type {
  ParseResult,
  ParsedEntry,
  ParserOptions,
  ContentType,
  RawFieldRecord,
  RawFieldValue,
} from "../types/module-types.js";

export class ManualParser implements IParser {
  readonly type = "manual" as const;
  readonly displayName = "Manual Entry";
  readonly acceptedExtensions = [];

  canHandleFile(_fileName: string): boolean {
    return false; // Manual parser is invoked directly, not from a file.
  }

  /**
   * Accepts either a JSON string (from a form textarea) or the raw object
   * serialized as JSON. The outer shape should match:
   *   {
   *     "type": "weapon",
   *     "name": "...",
   *     "level": 1,
   *     ... (other fields)
   *   }
   */
  parse(input: string, options?: ParserOptions): ParseResult {
    const errors: ParseResult["errors"] = [];
    const warnings: ParseResult["warnings"] = [];

    let rawObject: Record<string, unknown>;
    try {
      const parsed = JSON.parse(input) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        errors.push({
          code: "MANUAL_INVALID_SHAPE",
          message: "Manual entry must be a single JSON object.",
          severity: "error",
        });
        return { entries: [], errors, warnings };
      }
      rawObject = parsed as Record<string, unknown>;
    } catch (err: unknown) {
      errors.push({
        code: "JSON_PARSE_ERROR",
        message: `Manual entry JSON is invalid: ${err instanceof Error ? err.message : String(err)}`,
        severity: "error",
      });
      return { entries: [], errors, warnings };
    }

    const typeValue = rawObject["type"] ?? rawObject["contentType"];
    const contentType: ContentType = (
      typeof typeValue === "string" && typeValue !== ""
        ? typeValue
        : options?.defaultContentType ?? "equipment"
    ) as ContentType;

    const data: RawFieldRecord = {};
    for (const [key, value] of Object.entries(rawObject)) {
      if (key === "type" || key === "contentType") continue;
      data[key] = value as RawFieldValue;
    }

    if (!rawObject["name"]) {
      warnings.push({
        code: "MISSING_NAME",
        message: "Manual entry has no 'name' field.",
        severity: "warning",
        sourceReference: "manual",
      });
    }

    const entry: ParsedEntry = {
      contentType,
      data,
      metadata: options?.sourceMetadata,
      sourceReference: "manual",
    };

    return { entries: [entry], errors, warnings };
  }

  /**
   * Convenience method: parse a pre-built object without JSON serialization.
   * @param obj The data object directly from the UI form.
   * @param options Parser options including metadata.
   */
  parseObject(obj: Record<string, unknown>, options?: ParserOptions): ParseResult {
    return this.parse(JSON.stringify(obj), options);
  }
}
