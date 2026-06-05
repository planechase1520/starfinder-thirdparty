/**
 * End-to-End Import Wizard — Milestone 6
 *
 * A single five-step ApplicationV2 wizard that chains every previous subsystem
 * into one seamless workflow:
 *
 *   Step 0: Source     — select PDFs, enter source book / publisher, configure AI
 *   Step 1: Extract    — process PDFs through PdfImportManager, live progress
 *   Step 2: Review     — accept / reject / edit extracted records
 *   Step 3: Convert    — choose duplicate policy, run ConversionPipeline, show progress
 *   Step 4: Done       — summary card with stats and compendium links
 *
 * After "Done" the user can open any compendium pack directly from the wizard.
 * All five steps are rendered from a single Handlebars template using {{#eq step N}}.
 */

import type { ExtractionResult, ExtractedRecord } from "../pdf/pdf-types.js";
import type { ContentRecord } from "../database/content-record.js";
import type { PipelineReport } from "../pipeline/pipeline-report.js";
import { PdfImportManager } from "../pdf/PdfImportManager.js";
import { ContentDatabase } from "../database/content-database.js";
import { isValidCategory, CATEGORY_LABELS } from "../database/content-record.js";
import { ConverterRegistry } from "../adapters/starfinder/converter-registry.js";
import { ConversionPipeline } from "../pipeline/conversion-pipeline.js";
import { DuplicateResolver } from "../pipeline/duplicate-resolver.js";
import { ModuleLogger } from "../utils/logger.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "starfinder-thirdparty";

// ── Step constants ─────────────────────────────────────────────────────────────

type WizardStep = 0 | 1 | 2 | 3 | 4;
type DuplicatePolicy = "skip" | "replace" | "new-version";

// ── Internal types ─────────────────────────────────────────────────────────────

interface StagedFile {
  file: File;
  sourceBook: string;
  publisher: string;
}

interface ReviewEntry {
  record: ExtractedRecord;
  status: "pending" | "accepted" | "rejected" | "edited";
  editedName?: string;
  editedCategory?: string;
  editedNotes?: string;
}

// ── EndToEndWizardApp ─────────────────────────────────────────────────────────

export class EndToEndWizardApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-e2e-wizard",
    title: "SF3PL: Import Wizard (End-to-End)",
    classes: ["sf3pl-app", "sf3pl-e2e-wizard"],
    window: { resizable: true },
    position: { width: 900, height: 720 },
  };

  static override PARTS = {
    main: {
      template: "modules/starfinder-thirdparty/templates/end-to-end-wizard.hbs",
      scrollable: [".sf3pl-e2e-body"],
    },
  };

  // ── Wizard state ─────────────────────────────────────────────────────────────

  private step: WizardStep = 0;

  /** Step 0 state */
  private stagedFiles: StagedFile[] = [];
  private globalSourceBook = "";
  private globalPublisher = "";
  private enableAi = false;

  /** Step 1 state */
  private extractionResults: ExtractionResult[] = [];
  private extractionProgress = 0;
  private extractionPhase = "";
  private isExtracting = false;

  /** Step 2 state */
  private reviewEntries: ReviewEntry[] = [];
  private reviewFilter: "all" | "pending" | "accepted" | "rejected" = "all";

  /** Step 3 state */
  private duplicatePolicy: DuplicatePolicy = "replace";
  private isConverting = false;
  private conversionProgress = 0;
  private conversionCurrent = "";

  /** Step 4 state */
  private pipelineReport: PipelineReport | null = null;

  // ── Context ───────────────────────────────────────────────────────────────────

  override async _prepareContext(
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const reviewFiltered = this.buildFilteredEntries();
    const reviewStatusCounts = this.buildStatusCounts();

    const resultRows = this.pipelineReport?.results.map((r) => ({
      name: r.recordName,
      category: r.category,
      disposition: r.disposition,
      packId: r.packId,
      errors: r.errors.join("; "),
      warnings: r.warnings.join("; "),
    })) ?? [];

    const stats = this.pipelineReport?.stats ?? null;

    return {
      step: this.step,
      steps: [0, 1, 2, 3, 4],
      isStep0: this.step === 0,
      isStep1: this.step === 1,
      isStep2: this.step === 2,
      isStep3: this.step === 3,
      isStep4: this.step === 4,

      // Step 0
      stagedRows: this.stagedFiles.map((f, i) => ({
        index: i,
        filename: f.file.name,
        sizeKb: (f.file.size / 1024).toFixed(0),
        sourceBook: f.sourceBook,
        publisher: f.publisher,
      })),
      hasStaged: this.stagedFiles.length > 0,
      stagedCount: this.stagedFiles.length,
      globalSourceBook: this.globalSourceBook,
      globalPublisher: this.globalPublisher,
      enableAi: this.enableAi,

      // Step 1
      isExtracting: this.isExtracting,
      extractionProgress: this.extractionProgress,
      extractionPhase: this.extractionPhase,
      extractionResultSummaries: this.extractionResults.map((r) => ({
        filename: r.sourceFile,
        totalPages: r.totalPages,
        records: r.records.length,
        ocrPages: r.ocrPages,
        errors: r.errors.length,
      })),
      totalExtracted: this.extractionResults.reduce((s, r) => s + r.records.length, 0),

      // Step 2
      reviewFilter: this.reviewFilter,
      reviewStatusCounts,
      reviewRows: reviewFiltered.map((entry, pos) => ({
        globalIndex: this.reviewEntries.indexOf(entry),
        pos,
        id: entry.record.id,
        name: entry.editedName ?? entry.record.name,
        category: CATEGORY_LABELS[
          (isValidCategory(entry.editedCategory ?? entry.record.category)
            ? (entry.editedCategory ?? entry.record.category)
            : "equipment") as keyof typeof CATEGORY_LABELS
        ],
        rawCategory: entry.editedCategory ?? entry.record.category,
        sourceBook: entry.record.sourceBook,
        confidence: Math.round(entry.record.confidence * 100),
        status: entry.status,
        notes: entry.editedNotes ?? entry.record.notes,
      })),
      totalReview: this.reviewEntries.length,
      acceptedCount: reviewStatusCounts.accepted,
      categories: Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v })),

      // Step 3
      duplicatePolicy: this.duplicatePolicy,
      isConverting: this.isConverting,
      conversionProgress: this.conversionProgress,
      conversionCurrent: this.conversionCurrent,
      acceptedForConversion: this.reviewEntries.filter(
        (e) => e.status === "accepted" || e.status === "edited"
      ).length,

      // Step 4
      hasPipelineReport: this.pipelineReport !== null,
      stats,
      resultRows,
      failedRows: resultRows.filter((r) => r.disposition === "failed"),
      hasFailures: resultRows.some((r) => r.disposition === "failed"),
    };
  }

  // ── Render events ──────────────────────────────────────────────────────────────

  override _onRender(
    context: Record<string, unknown>,
    options: Record<string, unknown>
  ): void {
    super._onRender(context, options);
    const html = this.element as HTMLElement;

    this.bindCommonControls(html);

    switch (this.step) {
      case 0: this.bindStep0(html); break;
      case 1: break;
      case 2: this.bindStep2(html); break;
      case 3: this.bindStep3(html); break;
      case 4: this.bindStep4(html); break;
    }
  }

  // ── Common controls ───────────────────────────────────────────────────────────

  private bindCommonControls(html: HTMLElement): void {
    html.querySelector<HTMLElement>("[data-action='prev-step']")?.addEventListener("click", () => {
      if (this.step > 0 && !this.isExtracting && !this.isConverting) {
        this.step = (this.step - 1) as WizardStep;
        void this.render();
      }
    });

    html.querySelector<HTMLElement>("[data-action='next-step']")?.addEventListener("click", () => {
      void this.advanceStep();
    });

    html.querySelector<HTMLElement>("[data-action='restart']")?.addEventListener("click", () => {
      this.reset();
      void this.render();
    });
  }

  // ── Step 0 bindings ───────────────────────────────────────────────────────────

  private bindStep0(html: HTMLElement): void {
    const dropZone = html.querySelector<HTMLElement>(".sf3pl-e2e-dropzone");
    if (dropZone) {
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
      });
      dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        const files = Array.from(e.dataTransfer?.files ?? []).filter(
          (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
        );
        files.forEach((f) => this.stageFile(f));
        if (files.length > 0) void this.render();
      });
    }

    html.querySelector<HTMLInputElement>("#sf3pl-e2e-file-input")?.addEventListener("change", (e) => {
      const input = e.target as HTMLInputElement;
      Array.from(input.files ?? []).forEach((f) => this.stageFile(f));
      input.value = "";
      void this.render();
    });

    html.querySelector<HTMLInputElement>("#sf3pl-e2e-source-book")?.addEventListener("input", (e) => {
      this.globalSourceBook = (e.target as HTMLInputElement).value;
      this.stagedFiles.forEach((f) => { if (!f.sourceBook) f.sourceBook = this.globalSourceBook; });
    });

    html.querySelector<HTMLInputElement>("#sf3pl-e2e-publisher")?.addEventListener("input", (e) => {
      this.globalPublisher = (e.target as HTMLInputElement).value;
      this.stagedFiles.forEach((f) => { if (!f.publisher) f.publisher = this.globalPublisher; });
    });

    html.querySelector<HTMLInputElement>("#sf3pl-e2e-enable-ai")?.addEventListener("change", (e) => {
      this.enableAi = (e.target as HTMLInputElement).checked;
    });

    html.querySelectorAll<HTMLInputElement>("[data-staged-source-book]").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const idx = parseInt(inp.dataset.stagedSourceBook ?? "0", 10);
        if (this.stagedFiles[idx]) {
          this.stagedFiles[idx].sourceBook = (e.target as HTMLInputElement).value;
        }
      });
    });

    html.querySelectorAll<HTMLInputElement>("[data-staged-publisher]").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const idx = parseInt(inp.dataset.stagedPublisher ?? "0", 10);
        if (this.stagedFiles[idx]) {
          this.stagedFiles[idx].publisher = (e.target as HTMLInputElement).value;
        }
      });
    });

    html.querySelectorAll<HTMLElement>("[data-action='remove-staged']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index ?? "0", 10);
        this.stagedFiles.splice(idx, 1);
        void this.render();
      });
    });

    html.querySelector<HTMLElement>("[data-action='apply-defaults']")?.addEventListener("click", () => {
      this.stagedFiles.forEach((f) => {
        if (this.globalSourceBook) f.sourceBook = this.globalSourceBook;
        if (this.globalPublisher) f.publisher = this.globalPublisher;
      });
      void this.render();
    });
  }

  // ── Step 2 bindings ───────────────────────────────────────────────────────────

  private bindStep2(html: HTMLElement): void {
    html.querySelectorAll<HTMLElement>("[data-filter-status]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.reviewFilter = btn.dataset.filterStatus as "all" | "pending" | "accepted" | "rejected";
        void this.render();
      });
    });

    html.querySelector<HTMLElement>("[data-action='accept-all']")?.addEventListener("click", () => {
      this.reviewEntries.forEach((e) => { if (e.status === "pending") e.status = "accepted"; });
      void this.render();
    });

    html.querySelector<HTMLElement>("[data-action='reject-all']")?.addEventListener("click", () => {
      this.reviewEntries.forEach((e) => { if (e.status === "pending") e.status = "rejected"; });
      void this.render();
    });

    html.querySelectorAll<HTMLElement>("[data-action='accept-record']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.globalIndex ?? "0", 10);
        const entry = this.reviewEntries[idx];
        if (entry) entry.status = "accepted";
        void this.render();
      });
    });

    html.querySelectorAll<HTMLElement>("[data-action='reject-record']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.globalIndex ?? "0", 10);
        const entry = this.reviewEntries[idx];
        if (entry) entry.status = "rejected";
        void this.render();
      });
    });

    html.querySelectorAll<HTMLSelectElement>("[data-edit-category]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const idx = parseInt(sel.dataset.globalIndex ?? "0", 10);
        const entry = this.reviewEntries[idx];
        if (entry) {
          entry.editedCategory = (e.target as HTMLSelectElement).value;
          entry.status = "edited";
        }
      });
    });

    html.querySelectorAll<HTMLInputElement>("[data-edit-name]").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const idx = parseInt(inp.dataset.globalIndex ?? "0", 10);
        const entry = this.reviewEntries[idx];
        if (entry) {
          entry.editedName = (e.target as HTMLInputElement).value;
          entry.status = "edited";
        }
      });
    });
  }

  // ── Step 3 bindings ───────────────────────────────────────────────────────────

  private bindStep3(html: HTMLElement): void {
    html.querySelectorAll<HTMLInputElement>("[name='duplicate-policy']").forEach((radio) => {
      radio.addEventListener("change", () => {
        this.duplicatePolicy = radio.value as DuplicatePolicy;
      });
    });
  }

  // ── Step 4 bindings ───────────────────────────────────────────────────────────

  private bindStep4(html: HTMLElement): void {
    html.querySelector<HTMLElement>("[data-action='export-report']")?.addEventListener("click", () => {
      this.exportReport();
    });
  }

  // ── Step advancement ──────────────────────────────────────────────────────────

  private async advanceStep(): Promise<void> {
    switch (this.step) {
      case 0: await this.runExtraction(); break;
      case 1: this.buildReviewEntries(); this.step = 2; void this.render(); break;
      case 2: this.step = 3; void this.render(); break;
      case 3: await this.runConversion(); break;
      default: break;
    }
  }

  // ── Step 1: Extraction ────────────────────────────────────────────────────────

  private async runExtraction(): Promise<void> {
    if (this.stagedFiles.length === 0) {
      ui.notifications.warn("SF3PL: Add at least one PDF before proceeding.");
      return;
    }

    this.step = 1;
    this.isExtracting = true;
    this.extractionResults = [];
    this.extractionProgress = 0;
    this.extractionPhase = "Preparing…";

    await PdfImportManager.initialize();

    for (const staged of this.stagedFiles) {
      PdfImportManager.enqueue(
        staged.file,
        staged.sourceBook || "Unknown Source",
        staged.publisher || "Unknown Publisher"
      );
    }

    void this.render();

    let aiApiKey = "";
    if (this.enableAi) {
      try {
        aiApiKey = (game.settings.get(MODULE_ID, "aiApiKey") as string) ?? "";
      } catch {
        aiApiKey = "";
      }
    }

    let ocrEnabled = false;
    try {
      ocrEnabled = (game.settings.get(MODULE_ID, "ocrEnabled") as boolean) ?? false;
    } catch {
      ocrEnabled = false;
    }

    try {
      await PdfImportManager.processAll({
        enableOcr: ocrEnabled,
        enableAi: this.enableAi && !!aiApiKey,
        aiApiKey,
        onProgress: (progress) => {
          this.extractionProgress = progress.percent;
          this.extractionPhase = progress.message;
          void this.render();
        },
      });

      const queue = PdfImportManager.getQueue();
      this.extractionResults = queue
        .filter((q) => q.status === "done" && q.result)
        .map((q) => q.result!);

      const totalRecords = this.extractionResults.reduce((s, r) => s + r.records.length, 0);
      ModuleLogger.info(`[E2EWizard] Extraction done. ${totalRecords} record(s) found.`);
    } catch (err: unknown) {
      ModuleLogger.error(`[E2EWizard] Extraction failed: ${String(err)}`);
      ui.notifications.error("SF3PL: PDF extraction encountered an error. See console for details.");
    }

    this.isExtracting = false;
    void this.render();
  }

  // ── Step 2: Review building ───────────────────────────────────────────────────

  private buildReviewEntries(): void {
    this.reviewEntries = this.extractionResults.flatMap((result) =>
      result.records.map((record) => ({
        record,
        status: "pending" as const,
      }))
    );
    ModuleLogger.info(`[E2EWizard] Built ${this.reviewEntries.length} review entries.`);
  }

  private buildFilteredEntries(): ReviewEntry[] {
    if (this.reviewFilter === "all") return this.reviewEntries;
    return this.reviewEntries.filter((e) => e.status === this.reviewFilter);
  }

  private buildStatusCounts(): Record<string, number> {
    return this.reviewEntries.reduce<Record<string, number>>(
      (acc, e) => {
        acc[e.status] = (acc[e.status] ?? 0) + 1;
        return acc;
      },
      { pending: 0, accepted: 0, rejected: 0, edited: 0 }
    );
  }

  // ── Step 3: Conversion ────────────────────────────────────────────────────────

  private async runConversion(): Promise<void> {
    const toConvert = this.reviewEntries.filter(
      (e) => e.status === "accepted" || e.status === "edited"
    );

    if (toConvert.length === 0) {
      ui.notifications.warn("SF3PL: No records accepted. Accept records in Step 2 first.");
      return;
    }

    this.isConverting = true;
    this.conversionProgress = 0;
    this.conversionCurrent = "Saving records to database…";
    void this.render();

    await ContentDatabase.initialize();

    const contentRecords: ContentRecord[] = toConvert.map((entry) =>
      this.entryToContentRecord(entry)
    );

    try {
      await ContentDatabase.importBatch(contentRecords, this.duplicatePolicy === "replace");
    } catch (err: unknown) {
      ModuleLogger.error(`[E2EWizard] Database import failed: ${String(err)}`);
      ui.notifications.error("SF3PL: Failed to save records to database.");
      this.isConverting = false;
      return;
    }

    const recordIds = contentRecords.map((r) => r.id);

    const overwrite = this.duplicatePolicy !== "skip";
    const registry = ConverterRegistry.build();
    const pipeline = new ConversionPipeline(registry);

    let processed = 0;
    const total = recordIds.length;

    try {
      this.pipelineReport = await pipeline.run({
        recordIds,
        overwriteExisting: overwrite,
        onProgress: (progress) => {
          processed = progress.processed;
          this.conversionProgress = total > 0 ? Math.round((processed / total) * 100) : 0;
          this.conversionCurrent = progress.currentRecord;
          void this.render();
        },
      });

      const stats = this.pipelineReport.stats;
      ui.notifications.info(
        `SF3PL: Import complete! ${stats.imported} new, ${stats.updated} updated, ` +
        `${stats.skipped} skipped, ${stats.failed} failed.`
      );
      ModuleLogger.info(`[E2EWizard] Pipeline done: ${JSON.stringify(stats)}`);
    } catch (err: unknown) {
      ModuleLogger.error(`[E2EWizard] Conversion pipeline failed: ${String(err)}`);
      ui.notifications.error("SF3PL: Conversion pipeline encountered an error. See console.");
    }

    this.isConverting = false;
    this.step = 4;
    void this.render();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private stageFile(file: File): void {
    if (this.stagedFiles.some((f) => f.file.name === file.name)) return;
    this.stagedFiles.push({
      file,
      sourceBook: this.globalSourceBook,
      publisher: this.globalPublisher,
    });
  }

  private entryToContentRecord(entry: ReviewEntry): ContentRecord {
    const r = entry.record;
    const rawCat = entry.editedCategory ?? r.category;
    const category = isValidCategory(rawCat) ? rawCat : ("equipment" as const);

    const baseName = entry.editedName ?? r.name;
    const name =
      this.duplicatePolicy === "new-version"
        ? DuplicateResolver.makeVersionedName(baseName, ContentDatabase)
        : baseName;

    return {
      id: r.id,
      name,
      category,
      sourceBook: r.sourceBook,
      publisher: r.publisher,
      author: "",
      pageNumber: r.sourcePageNumber,
      tags: [...r.autoTags],
      notes: entry.editedNotes ?? r.notes,
      rawContent: { ...r.structuredData, _rawText: r.rawText },
      importedDate: new Date().toISOString(),
      importMethod: "txt",
      schemaVersion: "2.0.0",
    };
  }

  private exportReport(): void {
    if (!this.pipelineReport) return;
    const json = JSON.stringify(this.pipelineReport, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sf3pl-import-report-${this.pipelineReport.runId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private reset(): void {
    this.step = 0;
    this.stagedFiles = [];
    this.globalSourceBook = "";
    this.globalPublisher = "";
    this.enableAi = false;
    this.extractionResults = [];
    this.extractionProgress = 0;
    this.isExtracting = false;
    this.reviewEntries = [];
    this.reviewFilter = "all";
    this.duplicatePolicy = "replace";
    this.isConverting = false;
    this.conversionProgress = 0;
    this.pipelineReport = null;
    PdfImportManager.clearCompleted();
  }
}
