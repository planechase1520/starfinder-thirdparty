/**
 * PDF Import Wizard — Milestone 5
 *
 * A Foundry V13 ApplicationV2 window for uploading and processing PDF files.
 * Provides drag-and-drop upload, per-file metadata input, a processing queue
 * with live progress, and a history of completed imports.
 *
 * Workflow:
 *   1. User drops one or more PDF files onto the drop zone.
 *   2. User fills in Source Book and Publisher for each file (or global defaults).
 *   3. User clicks "Process PDFs".
 *   4. Each PDF is queued through PdfImportManager; progress is shown live.
 *   5. On completion, "Review Extracted Records" button opens ExtractionReviewApp.
 */

import type { ExtractionResult, QueueItem } from "../pdf/pdf-types.js";
import { PdfImportManager } from "../pdf/PdfImportManager.js";
import { ModuleLogger } from "../utils/logger.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODULE_ID = "starfinder-thirdparty";

// ── Phase labels ──────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  loading:          "Loading PDF…",
  "extracting-text":"Extracting text…",
  ocr:              "Running OCR…",
  detecting:        "Detecting content…",
  "ai-refining":    "AI refinement…",
  "building-records":"Building records…",
  done:             "Complete",
  cancelled:        "Cancelled",
  error:            "Error",
};

// ── PdfImportWizardApp ────────────────────────────────────────────────────────

export class PdfImportWizardApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-pdf-import-wizard",
    title: "SF3PL: PDF Import Wizard",
    classes: ["sf3pl-app", "sf3pl-pdf-wizard"],
    window: { resizable: true },
    position: { width: 760, height: 620 },
  };

  static override PARTS = {
    main: {
      template: "modules/starfinder-thirdparty/templates/pdf-import-wizard.hbs",
    },
  };

  /** Active tab: "queue" | "history" */
  private activeTab: "queue" | "history" = "queue";
  /** Pending files staged before processing. */
  private stagedFiles: StagedFile[] = [];
  /** Global defaults applied to all staged files. */
  private globalSourceBook = "";
  private globalPublisher = "";
  /** Last completed ExtractionResult available for review. */
  private lastResult: ExtractionResult | null = null;
  /** Whether a processing run is active. */
  private isProcessing = false;

  // ── Context ───────────────────────────────────────────────────────────────

  override async _prepareContext(
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    await PdfImportManager.initialize();

    const queue = PdfImportManager.getQueue();
    const history = PdfImportManager.getHistory();

    const queueRows = queue.map((item) => this.buildQueueRow(item));
    const historyRows = history
      .slice()
      .reverse()
      .map((h) => ({
        ...h,
        date: new Date(h.extractedAt).toLocaleString(),
        durationSec: (h.durationMs / 1000).toFixed(1),
      }));

    const stagedRows = this.stagedFiles.map((f, i) => ({
      index: i,
      filename: f.file.name,
      sizeKb: (f.file.size / 1024).toFixed(0),
      sourceBook: f.sourceBook,
      publisher: f.publisher,
    }));

    return {
      activeTab: this.activeTab,
      isProcessing: this.isProcessing,
      hasStaged: this.stagedFiles.length > 0,
      stagedCount: this.stagedFiles.length,
      stagedRows,
      globalSourceBook: this.globalSourceBook,
      globalPublisher: this.globalPublisher,

      queue: {
        rows: queueRows,
        isEmpty: queueRows.length === 0,
        hasDone: queueRows.some((r) => r.status === "done"),
        hasResult: this.lastResult !== null,
        resultRecords: this.lastResult?.records.length ?? 0,
      },

      history: {
        rows: historyRows,
        isEmpty: historyRows.length === 0,
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

    // Tabs
    html.querySelectorAll<HTMLElement>("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab as "queue" | "history";
        if (tab) { this.activeTab = tab; void this.render(); }
      });
    });

    // Drag-and-drop zone
    const dropZone = html.querySelector<HTMLElement>(".sf3pl-pdf-dropzone");
    if (dropZone) {
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
      });
      dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("drag-over");
      });
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

    // File picker
    html
      .querySelector<HTMLInputElement>("#sf3pl-pdf-file-input")
      ?.addEventListener("change", (e) => {
        const input = e.target as HTMLInputElement;
        Array.from(input.files ?? []).forEach((f) => this.stageFile(f));
        input.value = "";
        void this.render();
      });

    // Global defaults
    html
      .querySelector<HTMLInputElement>("#sf3pl-global-source-book")
      ?.addEventListener("input", (e) => {
        this.globalSourceBook = (e.target as HTMLInputElement).value;
        this.stagedFiles.forEach((f) => { if (!f.sourceBook) f.sourceBook = this.globalSourceBook; });
      });

    html
      .querySelector<HTMLInputElement>("#sf3pl-global-publisher")
      ?.addEventListener("input", (e) => {
        this.globalPublisher = (e.target as HTMLInputElement).value;
        this.stagedFiles.forEach((f) => { if (!f.publisher) f.publisher = this.globalPublisher; });
      });

    // Per-file source book / publisher edits
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

    // Remove staged file
    html.querySelectorAll<HTMLElement>("[data-action='remove-staged']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index ?? "0", 10);
        this.stagedFiles.splice(idx, 1);
        void this.render();
      });
    });

    // Apply global defaults to all staged
    html
      .querySelector<HTMLElement>("[data-action='apply-global']")
      ?.addEventListener("click", () => {
        this.stagedFiles.forEach((f) => {
          if (this.globalSourceBook) f.sourceBook = this.globalSourceBook;
          if (this.globalPublisher) f.publisher = this.globalPublisher;
        });
        void this.render();
      });

    // Process button
    html
      .querySelector<HTMLElement>("[data-action='process']")
      ?.addEventListener("click", () => void this.processStagedFiles());

    // Cancel
    html
      .querySelector<HTMLElement>("[data-action='cancel']")
      ?.addEventListener("click", () => {
        PdfImportManager.cancel();
        this.isProcessing = false;
        void this.render();
      });

    // Clear completed
    html
      .querySelector<HTMLElement>("[data-action='clear-completed']")
      ?.addEventListener("click", () => {
        PdfImportManager.clearCompleted();
        void this.render();
      });

    // Review extracted records
    html
      .querySelector<HTMLElement>("[data-action='review-results']")
      ?.addEventListener("click", () => this.openReview());
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private stageFile(file: File): void {
    if (this.stagedFiles.some((f) => f.file.name === file.name)) return;
    this.stagedFiles.push({
      file,
      sourceBook: this.globalSourceBook,
      publisher: this.globalPublisher,
    });
  }

  private async processStagedFiles(): Promise<void> {
    if (this.stagedFiles.length === 0) {
      ui.notifications.warn("SF3PL: No PDF files staged. Drop files onto the import area first.");
      return;
    }

    this.isProcessing = true;
    this.activeTab = "queue";

    // Enqueue all staged files
    for (const staged of this.stagedFiles) {
      PdfImportManager.enqueue(
        staged.file,
        staged.sourceBook || "Unknown Source",
        staged.publisher || "Unknown Publisher"
      );
    }
    this.stagedFiles = [];

    // Get AI settings from module settings
    const aiApiKey = this.getAiApiKey();

    // Kick off processing
    void this.render();

    try {
      await PdfImportManager.processAll({
        enableOcr: this.getOcrEnabled(),
        enableAi: !!aiApiKey,
        aiApiKey,
        onProgress: (progress) => {
          void this.render();
        },
      });

      // Find the last successful result
      const queue = PdfImportManager.getQueue();
      const lastDone = queue.filter((q) => q.status === "done").pop();
      this.lastResult = lastDone?.result ?? null;

      ui.notifications.info(
        `SF3PL: PDF processing complete. ` +
        `${this.lastResult?.records.length ?? 0} record(s) extracted.`
      );
    } catch (err: unknown) {
      ModuleLogger.error(`[PdfImportWizard] Processing failed: ${String(err)}`);
      ui.notifications.error("SF3PL: PDF processing encountered an error. See console for details.");
    } finally {
      this.isProcessing = false;
      void this.render();
    }
  }

  private openReview(): void {
    if (!this.lastResult) return;

    import("./extraction-review.js")
      .then(({ ExtractionReviewApp }) => {
        void new ExtractionReviewApp(this.lastResult!).render(true);
      })
      .catch((err: unknown) => {
        ModuleLogger.error(`[PdfImportWizard] Could not open review: ${String(err)}`);
      });
  }

  // ── Settings helpers ──────────────────────────────────────────────────────

  private getAiApiKey(): string {
    try {
      return game.settings.get(MODULE_ID, "aiApiKey") as string ?? "";
    } catch {
      return "";
    }
  }

  private getOcrEnabled(): boolean {
    try {
      return game.settings.get(MODULE_ID, "ocrEnabled") as boolean ?? false;
    } catch {
      return false;
    }
  }

  // ── Row builders ──────────────────────────────────────────────────────────

  private buildQueueRow(item: QueueItem): QueueRow {
    const pct = item.progress?.percent ?? 0;
    const phaseLabel = PHASE_LABELS[item.progress?.phase ?? ""] ?? "Queued";
    return {
      id: item.id,
      filename: item.filename,
      sizeKb: (item.fileSize / 1024).toFixed(0),
      status: item.status,
      sourceBook: item.sourceBook,
      publisher: item.publisher,
      percent: pct,
      phaseLabel,
      recordsFound: item.progress?.recordsFound ?? 0,
      resultRecords: item.result?.records.length ?? 0,
      errorMessage: item.errorMessage ?? "",
      queuedAt: new Date(item.queuedAt).toLocaleTimeString(),
    };
  }
}

// ── Local types ───────────────────────────────────────────────────────────────

interface StagedFile {
  file: File;
  sourceBook: string;
  publisher: string;
}

interface QueueRow {
  id: string;
  filename: string;
  sizeKb: string;
  status: string;
  sourceBook: string;
  publisher: string;
  percent: number;
  phaseLabel: string;
  recordsFound: number;
  resultRecords: number;
  errorMessage: string;
  queuedAt: string;
}
