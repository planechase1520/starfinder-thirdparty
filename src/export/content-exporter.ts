/**
 * Content Exporter — Milestone 2
 *
 * Exports ContentRecord objects from the database to JSON or CSV format
 * and triggers a browser file download.
 *
 * JSON export: full ContentRecord array — lossless, suitable for re-import.
 * CSV export:  flattened record with standard columns — suitable for spreadsheets.
 *
 * The exported JSON is designed to be directly re-importable via the JSON parser.
 */

import type { ContentRecord } from "../database/content-record.js";
import { CATEGORY_LABELS } from "../database/content-record.js";

// ── Column definitions for CSV ────────────────────────────────────────────

const CSV_COLUMNS: Array<{ header: string; resolve: (rec: ContentRecord) => string }> = [
  { header: "id", resolve: (r) => r.id },
  { header: "name", resolve: (r) => r.name },
  { header: "category", resolve: (r) => r.category },
  { header: "categoryLabel", resolve: (r) => CATEGORY_LABELS[r.category] ?? r.category },
  { header: "sourceBook", resolve: (r) => r.sourceBook },
  { header: "publisher", resolve: (r) => r.publisher },
  { header: "author", resolve: (r) => r.author },
  { header: "pageNumber", resolve: (r) => String(r.pageNumber) },
  { header: "tags", resolve: (r) => r.tags.join("; ") },
  { header: "notes", resolve: (r) => r.notes },
  { header: "importedDate", resolve: (r) => r.importedDate },
  { header: "importMethod", resolve: (r) => r.importMethod },
  // Flatten the most common rawContent fields
  { header: "level", resolve: (r) => String(r.rawContent["level"] ?? "") },
  { header: "price", resolve: (r) => String(r.rawContent["price"] ?? "") },
  { header: "bulk", resolve: (r) => String(r.rawContent["bulk"] ?? "") },
  { header: "description", resolve: (r) => String(r.rawContent["description"] ?? "") },
];

export class ContentExporter {

  // ── JSON export ─────────────────────────────────────────────────────────

  /**
   * Serializes a list of ContentRecord objects to a pretty-printed JSON string.
   * The output is valid for re-import via the JSON parser.
   *
   * @param records Records to export.
   */
  static toJson(records: ContentRecord[]): string {
    return JSON.stringify(records, null, 2);
  }

  /**
   * Creates a JSON export of a subset of records by id.
   * @param records Full record list (from database).
   * @param ids     IDs to include. If empty, all records are exported.
   */
  static toJsonFiltered(records: ContentRecord[], ids: string[]): string {
    const filtered = ids.length > 0 ? records.filter((r) => ids.includes(r.id)) : records;
    return this.toJson(filtered);
  }

  // ── CSV export ──────────────────────────────────────────────────────────

  /**
   * Serializes a list of ContentRecord objects to CSV format.
   * Uses a fixed set of columns defined in CSV_COLUMNS.
   * Additional rawContent fields are not exported to keep the CSV manageable.
   *
   * @param records Records to export.
   */
  static toCsv(records: ContentRecord[]): string {
    const header = CSV_COLUMNS.map((c) => this.csvCell(c.header)).join(",");
    const rows = records.map((rec) =>
      CSV_COLUMNS.map((c) => this.csvCell(c.resolve(rec))).join(",")
    );
    return [header, ...rows].join("\r\n");
  }

  /**
   * Creates a CSV export of a subset of records by id.
   * @param records Full record list.
   * @param ids     IDs to include. If empty, all records are exported.
   */
  static toCsvFiltered(records: ContentRecord[], ids: string[]): string {
    const filtered = ids.length > 0 ? records.filter((r) => ids.includes(r.id)) : records;
    return this.toCsv(filtered);
  }

  // ── Download helpers ────────────────────────────────────────────────────

  /**
   * Triggers a browser download for a JSON export of the given records.
   * @param records Records to export and download.
   * @param filename Suggested filename (default: sf3pl-export-<date>.json).
   */
  static downloadJson(records: ContentRecord[], filename?: string): void {
    const content = this.toJson(records);
    const name = filename ?? `sf3pl-export-${this.dateSuffix()}.json`;
    this.triggerDownload(content, name, "application/json");
  }

  /**
   * Triggers a browser download for a CSV export of the given records.
   * @param records Records to export and download.
   * @param filename Suggested filename (default: sf3pl-export-<date>.csv).
   */
  static downloadCsv(records: ContentRecord[], filename?: string): void {
    const content = this.toCsv(records);
    const name = filename ?? `sf3pl-export-${this.dateSuffix()}.csv`;
    this.triggerDownload(content, name, "text/csv;charset=utf-8;");
  }

  /**
   * Triggers a browser download for a validation report as plain text.
   * @param content Report text.
   * @param filename Suggested filename.
   */
  static downloadText(content: string, filename = "sf3pl-validation-report.txt"): void {
    this.triggerDownload(content, filename, "text/plain;charset=utf-8");
  }

  /**
   * Downloads the rawContent of a single record as a standalone JSON file.
   * Useful for debugging the parsed data.
   */
  static downloadRawContent(record: ContentRecord): void {
    const content = JSON.stringify(
      { name: record.name, category: record.category, ...record.rawContent },
      null,
      2
    );
    this.triggerDownload(
      content,
      `sf3pl-raw-${this.slugify(record.name)}.json`,
      "application/json"
    );
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Wraps a cell value in quotes and escapes internal quotes per RFC 4180.
   */
  private static csvCell(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  /** Returns an ISO date suffix suitable for filenames (YYYY-MM-DD). */
  private static dateSuffix(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Converts a display name to a safe filename slug. */
  private static slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  }

  /**
   * Creates a Blob URL and triggers a download anchor click.
   * Cleans up the URL after a short delay.
   */
  private static triggerDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
