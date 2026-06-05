/**
 * Error Reporter
 *
 * Formats validation results, parse errors, and import reports into
 * human-readable strings and structured data for the UI and download.
 */

import type { ValidationReport, ValidationResult, ParseError, ParseWarning, ImportSession } from "../types/module-types.js";

export class ErrorReporter {

  /**
   * Formats a ValidationReport into a plain-text summary suitable for
   * display in the Import Report window or download as a .txt file.
   */
  static formatValidationReport(report: ValidationReport): string {
    const lines: string[] = [
      "=== Starfinder Third Party Library — Validation Report ===",
      `Generated: ${report.generatedAt}`,
      `Total Checked: ${report.totalChecked} | Passed: ${report.passed} | Failed: ${report.failed}`,
      "",
    ];

    if (report.failed === 0) {
      lines.push("✓ All entries passed validation.");
    } else {
      lines.push(`✗ ${report.failed} entries failed validation:`);
      lines.push("");

      for (const result of report.results) {
        if (result.valid) continue;
        const ref = result.entry.sourceReference ?? "unknown";
        const name = typeof result.entry.data["name"] === "string" ? result.entry.data["name"] : "(no name)";
        lines.push(`  [${ref}] ${name} (${result.entry.contentType})`);
        for (const err of result.errors) {
          lines.push(`    ERROR [${err.code}]: ${err.message}${err.field ? ` (field: ${err.field})` : ""}`);
        }
        for (const warn of result.warnings) {
          lines.push(`    WARN  [${warn.code}]: ${warn.message}${warn.field ? ` (field: ${warn.field})` : ""}`);
        }
        lines.push("");
      }
    }

    if (report.results.some((r) => r.warnings.length > 0)) {
      lines.push("--- Warnings ---");
      for (const result of report.results) {
        if (result.warnings.length === 0) continue;
        const ref = result.entry.sourceReference ?? "unknown";
        const name = typeof result.entry.data["name"] === "string" ? result.entry.data["name"] : "(no name)";
        lines.push(`  [${ref}] ${name}`);
        for (const warn of result.warnings) {
          lines.push(`    WARN  [${warn.code}]: ${warn.message}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Formats a complete ImportSession into a human-readable report string.
   */
  static formatImportSession(session: ImportSession): string {
    const lines: string[] = [
      "=== Starfinder Third Party Library — Import Report ===",
      `Session ID:   ${session.id}`,
      `Started:      ${session.startedAt}`,
      `Completed:    ${session.completedAt ?? "In progress"}`,
      `Status:       ${session.status.toUpperCase()}`,
      `Parser:       ${session.parserType}`,
      `System:       ${session.systemId}`,
      `Source:       ${session.sourceFile ?? "(manual)"}`,
      "",
      `Total Entries:  ${session.totalEntries}`,
      `  ✓ Success:  ${session.successCount}`,
      `  ✗ Failed:   ${session.failureCount}`,
      `  ⊘ Skipped:  ${session.skippedCount}`,
      "",
    ];

    if (session.createdDocuments.length > 0) {
      lines.push("--- Created Documents ---");
      for (const doc of session.createdDocuments) {
        lines.push(`  [${doc.documentType}] ${doc.name} → ${doc.packName} (id: ${doc.id})`);
      }
      lines.push("");
    }

    if (session.errors.length > 0) {
      lines.push("--- Errors ---");
      for (const err of session.errors) {
        lines.push(`  [${err.code}] ${err.message}${err.sourceReference ? ` (at ${err.sourceReference})` : ""}`);
      }
      lines.push("");
    }

    if (session.warnings.length > 0) {
      lines.push("--- Warnings ---");
      for (const warn of session.warnings) {
        lines.push(`  [${warn.code}] ${warn.message}${warn.sourceReference ? ` (at ${warn.sourceReference})` : ""}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Builds an HTML summary of a validation report for display in a Foundry dialog.
   */
  static formatValidationReportHtml(report: ValidationReport): string {
    const statusIcon = report.failed === 0 ? "✓" : "✗";
    const statusClass = report.failed === 0 ? "sf3pl-success" : "sf3pl-failure";

    const failureRows = report.results
      .filter((r) => !r.valid)
      .map((r) => {
        const name = typeof r.entry.data["name"] === "string" ? r.entry.data["name"] : "(no name)";
        const ref = r.entry.sourceReference ?? "";
        const errorHtml = r.errors
          .map((e) => `<li class="sf3pl-error"><strong>${e.code}</strong>: ${this.escapeHtml(e.message)}${e.field ? ` <em>(${e.field})</em>` : ""}</li>`)
          .join("");
        const warnHtml = r.warnings
          .map((w) => `<li class="sf3pl-warning"><strong>${w.code}</strong>: ${this.escapeHtml(w.message)}</li>`)
          .join("");
        return `
          <div class="sf3pl-result-entry">
            <strong>${this.escapeHtml(name)}</strong> <span class="sf3pl-ref">${ref}</span>
            <ul>${errorHtml}${warnHtml}</ul>
          </div>`;
      })
      .join("");

    return `
      <div class="sf3pl-validation-report">
        <div class="sf3pl-summary ${statusClass}">
          <span class="sf3pl-status-icon">${statusIcon}</span>
          Checked: <strong>${report.totalChecked}</strong> &nbsp;
          Passed: <strong>${report.passed}</strong> &nbsp;
          Failed: <strong>${report.failed}</strong>
        </div>
        ${failureRows || "<p>All entries passed validation.</p>"}
      </div>`;
  }

  /**
   * Converts a list of errors/warnings into a downloadable JSON string.
   */
  static toJsonReport(errors: ParseError[], warnings: ParseWarning[]): string {
    return JSON.stringify({ errors, warnings }, null, 2);
  }

  /**
   * Triggers a browser download of the report as a text file.
   * @param content The text content to download.
   * @param filename The suggested filename.
   */
  static downloadReport(content: string, filename = "sf3pl-import-report.txt"): void {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  /**
   * Builds a plain-text summary of a single ValidationResult for logging.
   */
  static summarizeResult(result: ValidationResult): string {
    const name = typeof result.entry.data["name"] === "string" ? result.entry.data["name"] : "(no name)";
    const status = result.valid ? "PASS" : "FAIL";
    const errs = result.errors.length;
    const warns = result.warnings.length;
    return `[${status}] ${name} (${result.entry.contentType}) — ${errs} error(s), ${warns} warning(s)`;
  }

  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
