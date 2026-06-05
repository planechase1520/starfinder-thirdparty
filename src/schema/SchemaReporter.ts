/**
 * Schema Reporter — Milestone 4
 *
 * Generates human-readable and machine-readable reports from:
 *   - SchemaDiff objects (schema change reports)
 *   - BatchCompatibilityResult objects (pre-import validation reports)
 *
 * All report methods return plain strings suitable for display in the UI
 * or download as text/JSON files.
 */

import type {
  SchemaDiff,
  BatchCompatibilityResult,
  SchemaCompatibilityReport,
} from "./schema-types.js";
import { SchemaRegistry } from "./SchemaRegistry.js";

export class SchemaReporter {
  // ── Schema diff reports ───────────────────────────────────────────────────

  /**
   * Formats a SchemaDiff as a human-readable text report.
   */
  static formatDiff(diff: SchemaDiff): string {
    const lines: string[] = [
      `=== Schema Change Report ===`,
      `System       : ${diff.systemId}`,
      `Document     : ${diff.documentType}.${diff.subtype}`,
      `Previous Hash: ${diff.previousHash}`,
      `Current Hash : ${diff.currentHash}`,
      `Compared At  : ${diff.comparedAt}`,
      ``,
    ];

    if (diff.isCompatible) {
      lines.push("✓ No changes detected.");
      return lines.join("\n");
    }

    if (diff.addedFields.length > 0) {
      lines.push(`Added Fields (${diff.addedFields.length}):`);
      diff.addedFields.forEach((f) => lines.push(`  + ${f}`));
      lines.push("");
    }

    if (diff.removedFields.length > 0) {
      lines.push(`Removed Fields (${diff.removedFields.length}):`);
      diff.removedFields.forEach((f) => lines.push(`  - ${f}`));
      lines.push("");
    }

    if (diff.changedTypes.length > 0) {
      lines.push(`Type Changes (${diff.changedTypes.length}):`);
      diff.changedTypes.forEach((c) =>
        lines.push(`  ~ ${c.path}: ${c.from} → ${c.to}`)
      );
      lines.push("");
    }

    if (diff.newlyRequired.length > 0) {
      lines.push(`Newly Required Fields (${diff.newlyRequired.length}):`);
      diff.newlyRequired.forEach((f) => lines.push(`  ! ${f}`));
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Formats all diffs from the last scan as a combined text report.
   */
  static formatAllDiffs(): string {
    const diffs = SchemaRegistry.getLastDiffs();
    if (diffs.length === 0) {
      return "No schema changes detected since the last session.";
    }

    return diffs
      .map((d) => this.formatDiff(d))
      .join("\n" + "─".repeat(60) + "\n");
  }

  /**
   * Serializes a SchemaDiff to a JSON string.
   */
  static diffToJson(diff: SchemaDiff): string {
    return JSON.stringify(diff, null, 2);
  }

  // ── Compatibility reports ─────────────────────────────────────────────────

  /**
   * Formats a batch compatibility result as human-readable text.
   */
  static formatCompatibilityReport(result: BatchCompatibilityResult): string {
    const lines: string[] = [
      `=== Schema Compatibility Report ===`,
      `Generated  : ${result.generatedAt}`,
      `Total      : ${result.total}`,
      `Compatible : ${result.compatible}`,
      `Issues     : ${result.incompatible}`,
      ``,
    ];

    const incompatible = result.reports.filter((r) => !r.compatible);
    const compatible   = result.reports.filter((r) => r.compatible);

    if (incompatible.length > 0) {
      lines.push(`=== Records With Issues ===`);
      for (const report of incompatible) {
        lines.push(`\n✗ ${report.recordName} [${report.category}]`);

        if (report.missingRequiredFields.length > 0) {
          lines.push(`  Missing Required:`);
          report.missingRequiredFields.forEach((f) => lines.push(`    • ${f}`));
        }
        if (report.unknownFields.length > 0) {
          lines.push(`  Unknown Fields:`);
          report.unknownFields.forEach((f) => lines.push(`    ? ${f}`));
        }
        if (report.suggestions.length > 0) {
          lines.push(`  Suggestions:`);
          report.suggestions.forEach((s) =>
            lines.push(`    → ${s.field}: ${s.suggestion}`)
          );
        }
      }
      lines.push("");
    }

    if (compatible.length > 0) {
      lines.push(`=== Compatible Records (${compatible.length}) ===`);
      compatible.forEach((r) =>
        lines.push(`  ✓ ${r.recordName} [${r.category}]`)
      );
    }

    return lines.join("\n");
  }

  /**
   * Serializes a batch compatibility result to JSON.
   */
  static compatibilityToJson(result: BatchCompatibilityResult): string {
    return JSON.stringify(result, null, 2);
  }

  // ── Schema summary ────────────────────────────────────────────────────────

  /**
   * Returns a brief summary of all schemas in the registry.
   */
  static formatRegistrySummary(): string {
    const schemas = SchemaRegistry.getAll();
    if (schemas.length === 0) {
      return "No schemas registered. Run a schema scan first.";
    }

    const lines: string[] = [
      `=== Schema Registry Summary ===`,
      `Total schemas: ${schemas.length}`,
      "",
    ];

    const byType: Record<string, typeof schemas> = {};
    for (const s of schemas) {
      (byType[s.documentType] ??= []).push(s);
    }

    for (const [type, group] of Object.entries(byType)) {
      lines.push(`${type} (${group.length}):`);
      for (const s of group.sort((a, b) => a.subtype.localeCompare(b.subtype))) {
        lines.push(
          `  ${s.subtype.padEnd(20)} ${s.fields.length.toString().padStart(4)} fields` +
          `  [${s.source}]  hash: ${s.schemaHash}`
        );
      }
      lines.push("");
    }

    const diffs = SchemaRegistry.getLastDiffs();
    if (diffs.length > 0) {
      lines.push(`⚠ ${diffs.length} schema change(s) detected since last session.`);
      diffs.forEach((d) =>
        lines.push(`  ${d.documentType}.${d.subtype}: +${d.addedFields.length} -${d.removedFields.length} ~${d.changedTypes.length}`)
      );
    } else {
      lines.push("✓ No schema changes since last session.");
    }

    return lines.join("\n");
  }

  // ── Download helpers ──────────────────────────────────────────────────────

  /** Triggers a browser download for a text or JSON report. */
  static downloadReport(content: string, filename: string, mimeType = "text/plain"): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Downloads the registry summary as a text file. */
  static downloadRegistrySummary(): void {
    this.downloadReport(
      this.formatRegistrySummary(),
      `sf3pl-schema-summary-${Date.now()}.txt`
    );
  }

  /** Downloads all current schema diffs as JSON. */
  static downloadDiffsJson(): void {
    const diffs = SchemaRegistry.getLastDiffs();
    this.downloadReport(
      JSON.stringify(diffs, null, 2),
      `sf3pl-schema-diffs-${Date.now()}.json`,
      "application/json"
    );
  }

  /** Downloads a compatibility report as JSON. */
  static downloadCompatibilityReport(result: BatchCompatibilityResult): void {
    this.downloadReport(
      this.compatibilityToJson(result),
      `sf3pl-compatibility-${Date.now()}.json`,
      "application/json"
    );
  }

  /** Downloads a single record compatibility report as text. */
  static downloadSingleReport(report: SchemaCompatibilityReport): void {
    const lines = [
      `Record: ${report.recordName} [${report.category}]`,
      `Status: ${report.compatible ? "Compatible" : "Issues found"}`,
      `Generated: ${report.generatedAt}`,
      "",
    ];
    if (!report.compatible) {
      lines.push(`Missing Required: ${report.missingRequiredFields.join(", ") || "none"}`);
      lines.push(`Unknown Fields: ${report.unknownFields.join(", ") || "none"}`);
      report.suggestions.forEach((s) => lines.push(`→ ${s.field}: ${s.suggestion}`));
    }
    this.downloadReport(
      lines.join("\n"),
      `sf3pl-record-${report.recordId}.txt`
    );
  }
}
