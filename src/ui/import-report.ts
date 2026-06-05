/**
 * Import Report Application
 *
 * Displays the results of a completed import session in a Foundry V13
 * ApplicationV2 window. Shows success/failure counts, created documents,
 * errors and warnings, and allows downloading the report.
 */

import type { ImportSession } from "../types/module-types.js";
import { ErrorReporter } from "../validation/error-reporter.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ImportReportApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-import-report",
    title: "SF3PL: Import Report",
    classes: ["sf3pl-app", "sf3pl-import-report"],
    window: { resizable: true },
    position: { width: 620, height: 500 },
  };

  static override PARTS = {
    main: { template: "modules/starfinder-thirdparty/templates/import-report.hbs" },
  };

  private session: ImportSession;

  constructor(session: ImportSession, options: Record<string, unknown> = {}) {
    super(options);
    this.session = session;
  }

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { session } = this;

    const successRate = session.totalEntries > 0
      ? Math.round((session.successCount / session.totalEntries) * 100)
      : 0;

    return {
      session: {
        id: session.id,
        startedAt: session.startedAt,
        completedAt: session.completedAt ?? "N/A",
        status: session.status,
        statusClass: session.status === "done" ? "sf3pl-success" : "sf3pl-failure",
        parserType: session.parserType,
        systemId: session.systemId,
        sourceFile: session.sourceFile ?? "(manual entry)",
        totalEntries: session.totalEntries,
        successCount: session.successCount,
        failureCount: session.failureCount,
        skippedCount: session.skippedCount,
        successRate,
      },
      createdDocuments: session.createdDocuments.map((doc) => ({
        ...doc,
        typeIcon: this.getDocTypeIcon(doc.documentType),
      })),
      errors: session.errors,
      warnings: session.warnings,
      hasErrors: session.errors.length > 0,
      hasWarnings: session.warnings.length > 0,
      hasCreatedDocs: session.createdDocuments.length > 0,
    };
  }

  override _onRender(_context: Record<string, unknown>, _options: Record<string, unknown>): void {
    const el = this.element;
    if (!el) return;

    el.querySelector("#sf3pl-btn-download-session")?.addEventListener("click", () => {
      const text = ErrorReporter.formatImportSession(this.session);
      ErrorReporter.downloadReport(text, `sf3pl-import-${this.session.id}.txt`);
    });

    el.querySelector("#sf3pl-btn-download-json")?.addEventListener("click", () => {
      const json = ErrorReporter.toJsonReport(this.session.errors, this.session.warnings);
      ErrorReporter.downloadReport(json, `sf3pl-import-${this.session.id}-errors.json`);
    });
  }

  private getDocTypeIcon(documentType: "Item" | "Actor" | "JournalEntry"): string {
    switch (documentType) {
      case "Item": return "fa-suitcase";
      case "Actor": return "fa-dragon";
      case "JournalEntry": return "fa-book-open";
    }
  }
}
