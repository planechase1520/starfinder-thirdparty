/**
 * CSV Parser
 *
 * Parses CSV files into ParsedEntry objects. Expects a header row followed
 * by data rows. The "type" column (if present) determines the content type
 * of each row; otherwise `options.defaultContentType` is used.
 *
 * Supported special column names:
 *   - "type" or "contentType" → ContentType
 *   - "sourceBook"            → metadata.sourceBook
 *   - "publisher"             → metadata.publisher
 *   - "author"                → metadata.author
 *   - "pageNumber" or "page"  → metadata.pageNumber
 *   - "tags"                  → metadata.tags (comma-separated within the cell)
 *   - "notes"                 → metadata.notes
 *
 * All other columns become fields in the entry's data object.
 *
 * Example CSV:
 *   name,type,level,weaponType,damage,sourceBook,publisher
 *   "Tactical Semi-Auto Pistol",weapon,1,ranged,"1d6 P",Core Rulebook,Paizo
 */

import type { IParser } from "./parser.interface.js";
import type {
  ParseResult,
  ParsedEntry,
  ParserOptions,
  ContentType,
  ParseError,
  ParseWarning,
  RawFieldRecord,
} from "../types/module-types.js";

const METADATA_COLUMNS = new Set([
  "sourcebook",
  "publisher",
  "author",
  "pagenumber",
  "page",
  "tags",
  "notes",
]);

const TYPE_COLUMNS = new Set(["type", "contenttype"]);

export class CsvParser implements IParser {
  readonly type = "csv" as const;
  readonly displayName = "CSV Import";
  readonly acceptedExtensions = [".csv"];

  canHandleFile(fileName: string): boolean {
    return fileName.endsWith(".csv");
  }

  parse(input: string, options?: ParserOptions): ParseResult {
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    const entries: ParsedEntry[] = [];

    const delimiter = options?.csvDelimiter ?? ",";
    const lines = this.splitLines(input.trim());

    if (lines.length === 0) {
      errors.push({
        code: "EMPTY_INPUT",
        message: "CSV input is empty.",
        severity: "error",
      });
      return { entries, errors, warnings };
    }

    // Parse header row
    const headers = this.parseRow(lines[0]!, delimiter).map((h) => h.trim().toLowerCase());

    if (headers.length === 0) {
      errors.push({ code: "NO_HEADERS", message: "CSV has no header row.", severity: "error" });
      return { entries, errors, warnings };
    }

    // Process data rows
    for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
      const line = lines[rowIndex]!.trim();
      if (line === "") continue;

      const rowRef = `row:${rowIndex + 1}`;
      const cells = this.parseRow(line, delimiter);

      // Build a key→value map for this row
      const rowMap: Record<string, string> = {};
      for (let col = 0; col < headers.length; col++) {
        rowMap[headers[col]!] = cells[col]?.trim() ?? "";
      }

      // Determine content type
      const typeCell = rowMap["type"] ?? rowMap["contenttype"] ?? "";
      const contentType: ContentType = (
        typeCell !== "" ? typeCell : options?.defaultContentType ?? "equipment"
      ) as ContentType;

      // Separate metadata fields from data fields
      const data: RawFieldRecord = {};
      const partialMetadata: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(rowMap)) {
        if (TYPE_COLUMNS.has(key)) continue;

        const normalizedKey = key.replace(/[_\s]/g, "").toLowerCase();

        if (METADATA_COLUMNS.has(normalizedKey)) {
          // Map to canonical metadata field names
          switch (normalizedKey) {
            case "sourcebook": partialMetadata["sourceBook"] = value; break;
            case "publisher": partialMetadata["publisher"] = value; break;
            case "author": partialMetadata["author"] = value; break;
            case "pagenumber":
            case "page":
              partialMetadata["pageNumber"] = parseInt(value, 10) || 0;
              break;
            case "tags":
              partialMetadata["tags"] = value.split(",").map((t) => t.trim()).filter(Boolean);
              break;
            case "notes": partialMetadata["notes"] = value; break;
          }
        } else {
          // Try to coerce numeric and boolean strings
          data[key] = this.coerceValue(value);
        }
      }

      // Merge source metadata from options
      const mergedMetadata = {
        ...(options?.sourceMetadata ?? {}),
        ...partialMetadata,
      };

      if (!rowMap["name"] && !data["name"]) {
        warnings.push({
          code: "MISSING_NAME",
          message: `Row ${rowIndex + 1} has no 'name' column.`,
          severity: "warning",
          sourceReference: rowRef,
        });
      }

      entries.push({
        contentType,
        data,
        metadata: mergedMetadata as Partial<import("../types/module-types.js").ImportMetadata>,
        sourceReference: rowRef,
      });
    }

    return { entries, errors, warnings };
  }

  // -------------------------------------------------------------------------
  // RFC 4180-compliant CSV parsing helpers
  // -------------------------------------------------------------------------

  /** Splits input into lines, respecting quoted newlines. */
  private splitLines(input: string): string[] {
    const lines: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i]!;
      if (ch === '"') {
        if (inQuotes && input[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && input[i + 1] === "\n") i++;
        lines.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    if (current !== "") lines.push(current);
    return lines;
  }

  /** Parses a single CSV row into an array of cell values. */
  private parseRow(line: string, delimiter: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  }

  /** Coerces a string value to a number or boolean where appropriate. */
  private coerceValue(value: string): import("../types/module-types.js").RawFieldValue {
    if (value === "") return null;
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") return num;
    return value;
  }
}
