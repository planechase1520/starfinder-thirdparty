/**
 * Extraction Report Application — Milestone 5
 *
 * Displays a detailed per-run extraction report for a completed PDF import:
 *   - Pages processed, OCR pages, AI usage
 *   - Per-record table with name, category, status, confidence, detection method
 *   - Error log
 *   - Export as JSON button
 *
 * Opened from ExtractionReviewApp → "Open Report" or directly from PdfImportWizard history.
 */

import type { ExtractionResult, ExtractedRecord } from "../pdf/pdf-types.js";
import { ModuleLogger } from "../utils/logger.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// ── ExtractionReportApp ───────────────────────────────────────────────────────

export class ExtractionReportApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-extraction-report",
    title: "SF3PL: Extraction Report",
    classes: ["sf3pl-app", "sf3pl-extraction-report"],
    window: { resizable: true },
    position: { width: 820, height: 580 },
  };

  static override PARTS = {
    main: {
      template: "modules/starfinder-thirdparty/templates/extraction-report.hbs",
    },
  };

  private result: ExtractionResult;
  /** Working-copy records with updated statuses from review. */
  private records: ExtractedRecord[];

  constructor(result: ExtractionResult, records?: ExtractedRecord[]) {
    super({});
    this.result = result;
    this.records = records ?? result.records;
  }

  // ── Context ───────────────────────────────────────────────────────────────

  override async _prepareContext(
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const r = this.result;
    const records = this.records;

    const statusCounts = records.reduce<Record<string, number>>(
      (acc, rec) => {
        acc[rec.status] = (acc[rec.status] ?? 0) + 1;
        return acc;
      },
      { pending: 0, accepted: 0, rejected: 0, edited: 0 }
    );

    const methodCounts = records.reduce<Record<string, number>>(
      (acc, rec) => {
        acc[rec.detectionMethod] = (acc[rec.detectionMethod] ?? 0) + 1;
        return acc;
      },
      { regex: 0, ai: 0, manual: 0 }
    );

    const categoryCounts: Record<string, number> = {};
    for (const rec of records) {
      categoryCounts[rec.category] = (categoryCounts[rec.category] ?? 0) + 1;
    }

    const categoryRows = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => ({ category: cat, count }));

    const recordRows = records.map((rec) => ({
      id: rec.id,
      name: rec.name,
      category: rec.category,
      status: rec.status,
      confidence: `${Math.round(rec.confidence * 100)}%`,
      confidenceNum: rec.confidence,
      confidenceClass: rec.confidence >= 0.8 ? "high" : rec.confidence >= 0.5 ? "medium" : "low",
      method: rec.detectionMethod,
      page: rec.sourcePageNumber,
    }));

    const errorRows = r.errors.map((e) => ({
      page: e.page,
      phase: e.phase,
      message: e.message,
      code: e.code,
    }));

    return {
      runId: r.runId,
      sourceFile: r.sourceFile,
      sourceBook: r.sourceBook,
      publisher: r.publisher,
      extractedAt: new Date(r.extractedAt).toLocaleString(),
      durationSec: (r.durationMs / 1000).toFixed(1),

      pages: {
        total: r.totalPages,
        processed: r.pagesProcessed,
        ocr: r.ocrPages,
        ocrPct: r.totalPages > 0
          ? Math.round((r.ocrPages / r.totalPages) * 100)
          : 0,
        avgOcrConfidence: Math.round(r.averageOcrConfidence),
      },

      ai: {
        used: r.aiUsed,
      },

      records: {
        total: records.length,
        rows: recordRows,
        statusCounts,
        methodCounts,
        categoryRows,
      },

      errors: {
        rows: errorRows,
        hasErrors: errorRows.length > 0,
      },
    };
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  override _onRender(
    context: Record<string, unknown>,
    options: Record<string, unknown>
  ): void {
    super._onRender(context, options);
    const html = this.element as HTMLElement;

    html
      .querySelector<HTMLElement>("[data-action='export-json']")
      ?.addEventListener("click", () => this.exportJson());
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private exportJson(): void {
    const payload = {
      runId: this.result.runId,
      sourceFile: this.result.sourceFile,
      sourceBook: this.result.sourceBook,
      publisher: this.result.publisher,
      extractedAt: this.result.extractedAt,
      durationMs: this.result.durationMs,
      totalPages: this.result.totalPages,
      pagesProcessed: this.result.pagesProcessed,
      ocrPages: this.result.ocrPages,
      aiUsed: this.result.aiUsed,
      records: this.records.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        status: r.status,
        confidence: r.confidence,
        method: r.detectionMethod,
        page: r.sourcePageNumber,
        autoTags: r.autoTags,
      })),
      errors: this.result.errors,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sf3pl-extraction-report-${this.result.runId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    ModuleLogger.info(`[ExtractionReport] Exported report for run ${this.result.runId}`);
    ui.notifications.info("SF3PL: Extraction report downloaded.");
  }
}
