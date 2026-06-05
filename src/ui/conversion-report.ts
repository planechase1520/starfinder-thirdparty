/**
 * Conversion Report Application — Milestone 3
 *
 * A Foundry V13 ApplicationV2 window that displays the results of a
 * ConversionPipeline run. Shows aggregate statistics (imported / updated /
 * skipped / failed) and a full per-record result table with warnings and
 * error details.
 *
 * The report can be exported as JSON for archiving or debugging.
 */

import type { PipelineReport, PipelineRecordResult, RecordDisposition } from "../pipeline/pipeline-report.js";
import { reportToJson } from "../pipeline/pipeline-report.js";
import { ModuleLogger } from "../utils/logger.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// ── Icons per disposition ─────────────────────────────────────────────────────

const DISPOSITION_ICONS: Readonly<Record<RecordDisposition, string>> = {
  imported: "fa-circle-check",
  updated: "fa-rotate",
  skipped: "fa-minus-circle",
  failed: "fa-circle-xmark",
};

const DISPOSITION_CSS: Readonly<Record<RecordDisposition, string>> = {
  imported: "success",
  updated: "info",
  skipped: "warning",
  failed: "error",
};

// ── ApplicationV2 class ───────────────────────────────────────────────────────

export class ConversionReportApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-conversion-report",
    title: "SF3PL: Conversion Report",
    classes: ["sf3pl-app", "sf3pl-conversion-report"],
    window: { resizable: true },
    position: { width: 800, height: 600 },
  };

  static override PARTS = {
    main: { template: "modules/starfinder-thirdparty/templates/conversion-report.hbs" },
  };

  private readonly report: PipelineReport;
  /** Active disposition filter. "all" = show everything. */
  private filter: RecordDisposition | "all" = "all";

  constructor(report: PipelineReport) {
    super();
    this.report = report;
  }

  // ── Context preparation ───────────────────────────────────────────────────

  override async _prepareContext(
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { stats, results } = this.report;

    const filtered: PipelineRecordResult[] =
      this.filter === "all"
        ? results
        : results.filter((r) => r.disposition === this.filter);

    const rows = filtered.map((r) => ({
      recordId: r.recordId,
      recordName: r.recordName,
      category: r.category,
      disposition: r.disposition,
      dispositionLabel: r.disposition.charAt(0).toUpperCase() + r.disposition.slice(1),
      dispositionIcon: DISPOSITION_ICONS[r.disposition],
      dispositionCss: DISPOSITION_CSS[r.disposition],
      packId: r.packId,
      documentName: r.documentName,
      warnings: r.warnings,
      errors: r.errors,
      hasWarnings: r.warnings.length > 0,
      hasErrors: r.errors.length > 0,
      hasDetails: r.warnings.length > 0 || r.errors.length > 0,
    }));

    return {
      runId: this.report.runId,
      startedAt: this.report.startedAt,
      finishedAt: this.report.finishedAt,
      elapsedMs: stats.elapsedMs,
      stats: {
        total: stats.total,
        imported: stats.imported,
        updated: stats.updated,
        skipped: stats.skipped,
        failed: stats.failed,
      },
      filterOptions: [
        { value: "all",      label: `All (${stats.total})`,           active: this.filter === "all" },
        { value: "imported", label: `Imported (${stats.imported})`,   active: this.filter === "imported" },
        { value: "updated",  label: `Updated (${stats.updated})`,     active: this.filter === "updated" },
        { value: "skipped",  label: `Skipped (${stats.skipped})`,     active: this.filter === "skipped" },
        { value: "failed",   label: `Failed (${stats.failed})`,       active: this.filter === "failed" },
      ],
      rows,
      isEmpty: rows.length === 0,
      hasFailed: stats.failed > 0,
    };
  }

  // ── Render event binding ──────────────────────────────────────────────────

  override _onRender(
    _context: Record<string, unknown>,
    _options: Record<string, unknown>
  ): void {
    const el = this.element;
    if (!el) return;

    // --- Filter tabs ---
    el.querySelectorAll<HTMLElement>("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.filter = (btn.dataset["filter"] as RecordDisposition | "all") ?? "all";
        void this.render(true);
      });
    });

    // --- Export JSON ---
    el.querySelector("#sf3pl-report-export-json")?.addEventListener("click", () => {
      this.exportReport();
    });

    // --- Copy to clipboard ---
    el.querySelector("#sf3pl-report-copy")?.addEventListener("click", () => {
      void this.copyToClipboard();
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private exportReport(): void {
    const json = reportToJson(this.report);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sf3pl-conversion-report-${this.report.runId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ModuleLogger.info(`[ConversionReport] Exported report ${this.report.runId} as JSON.`);
  }

  private async copyToClipboard(): Promise<void> {
    const json = reportToJson(this.report);
    try {
      await navigator.clipboard.writeText(json);
      ui.notifications.info("Report copied to clipboard.");
    } catch {
      ui.notifications.warn("Clipboard copy failed. Use Export instead.");
    }
  }
}
