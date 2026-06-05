/**
 * Validation Results Application
 *
 * Displays detailed validation results for a parsed import batch.
 * Shows per-entry pass/fail status with field-level error details.
 */

import type { ValidationReport } from "../types/module-types.js";
import { ErrorReporter } from "../validation/error-reporter.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ValidationResultsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-validation-results",
    title: "SF3PL: Validation Results",
    classes: ["sf3pl-app", "sf3pl-validation-results"],
    window: { resizable: true },
    position: { width: 680, height: 520 },
  };

  static override PARTS = {
    main: { template: "modules/starfinder-thirdparty/templates/validation-results.hbs" },
  };

  private report: ValidationReport;
  private showOnlyFailed = false;

  constructor(report: ValidationReport, options: Record<string, unknown> = {}) {
    super(options);
    this.report = report;
  }

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const results = this.showOnlyFailed
      ? this.report.results.filter((r) => !r.valid)
      : this.report.results;

    return {
      generatedAt: new Date(this.report.generatedAt).toLocaleString(),
      totalChecked: this.report.totalChecked,
      passed: this.report.passed,
      failed: this.report.failed,
      passRate: this.report.totalChecked > 0
        ? Math.round((this.report.passed / this.report.totalChecked) * 100)
        : 0,
      allPassed: this.report.failed === 0,
      showOnlyFailed: this.showOnlyFailed,
      results: results.map((r) => ({
        valid: r.valid,
        statusClass: r.valid ? "sf3pl-pass" : "sf3pl-fail",
        statusIcon: r.valid ? "fa-check" : "fa-xmark",
        name: typeof r.entry.data["name"] === "string" ? r.entry.data["name"] : "(no name)",
        contentType: r.entry.contentType,
        ref: r.entry.sourceReference ?? "",
        errorCount: r.errors.length,
        warnCount: r.warnings.length,
        errors: r.errors.map((e) => ({
          code: e.code,
          message: e.message,
          field: e.field ?? "",
        })),
        warnings: r.warnings.map((w) => ({
          code: w.code,
          message: w.message,
          field: w.field ?? "",
        })),
        summary: ErrorReporter.summarizeResult(r),
      })),
    };
  }

  override _onRender(_context: Record<string, unknown>, _options: Record<string, unknown>): void {
    const el = this.element;
    if (!el) return;

    el.querySelector("#sf3pl-toggle-failed")?.addEventListener("click", () => {
      this.showOnlyFailed = !this.showOnlyFailed;
      void this.render(true);
    });

    el.querySelector("#sf3pl-btn-download-validation")?.addEventListener("click", () => {
      const text = ErrorReporter.formatValidationReport(this.report);
      ErrorReporter.downloadReport(text, `sf3pl-validation-${new Date().toISOString().slice(0, 10)}.txt`);
    });
  }
}
