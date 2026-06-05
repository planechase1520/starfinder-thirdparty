import type {
  QueueItem,
  ImportHistoryEntry,
  ProcessingProgress,
} from "./pdf-types.js";
import { ModuleLogger } from "../utils/logger.js";

declare const game: any;

const MODULE_ID = "starfinder-thirdparty";
const HISTORY_SETTING_KEY = "pdfImportHistory";
const MAX_HISTORY_ENTRIES = 50;

function makeQueueId(): string {
  return `qi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeInitialProgress(): ProcessingProgress {
  return {
    phase: "loading",
    currentPage: 0,
    totalPages: 0,
    recordsFound: 0,
    message: "Queued",
    percent: 0,
  };
}

/**
 * Manages a queue of PDF import jobs and persists import history to Foundry
 * world settings. Supports batch processing with pause and cancel controls.
 */
export class PdfImportManager {
  private static queue: QueueItem[] = [];
  private static history: ImportHistoryEntry[] = [];
  private static activeItemId: string | null = null;
  private static cancelled = false;
  private static paused = false;
  private static initialized = false;
  private static abortController: AbortController | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Loads import history from Foundry settings and marks the manager as ready.
   * Safe to call multiple times.
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadHistory();
    this.initialized = true;
    ModuleLogger.info(
      `[PdfImportManager] Initialized. History entries: ${this.history.length}.`
    );
  }

  // ── Queue management ─────────────────────────────────────────────────────

  /**
   * Adds a PDF file to the processing queue and returns the new QueueItem's id.
   *
   * @param file - The PDF File to enqueue.
   * @param sourceBook - Source book name pre-filled from user input.
   * @param publisher - Publisher name pre-filled from user input.
   * @returns The newly created QueueItem's ID.
   */
  static enqueue(
    file: File,
    sourceBook: string,
    publisher: string
  ): string {
    const item: QueueItem = {
      id: makeQueueId(),
      filename: file.name,
      fileSize: file.size,
      file,
      status: "queued",
      queuedAt: new Date().toISOString(),
      sourceBook,
      publisher,
      progress: makeInitialProgress(),
    };
    this.queue.push(item);
    ModuleLogger.info(
      `[PdfImportManager] Enqueued "${file.name}" (${item.id}).`
    );
    return item.id;
  }

  /**
   * Returns the current queue including all items regardless of status.
   */
  static getQueue(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Returns all import history entries, most recent first.
   */
  static getHistory(): ImportHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Removes all items from the queue that have a terminal status
   * (done, failed, cancelled). Items in "queued" or "processing" are kept.
   */
  static clearCompleted(): void {
    const before = this.queue.length;
    this.queue = this.queue.filter(
      (item) =>
        item.status === "queued" ||
        item.status === "processing" ||
        item.status === "paused"
    );
    ModuleLogger.info(
      `[PdfImportManager] Cleared ${before - this.queue.length} completed items.`
    );
  }

  /**
   * Signals the manager to stop after the current item finishes processing.
   * Any queued items are moved to "cancelled" status.
   */
  static cancel(): void {
    this.cancelled = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    for (const item of this.queue) {
      if (item.status === "queued" || item.status === "paused") {
        item.status = "cancelled";
      }
    }
    ModuleLogger.info("[PdfImportManager] Cancelled — all queued items marked cancelled.");
  }

  /**
   * Pauses queue processing after the current item finishes.
   * Queued items remain in the queue with "paused" status.
   */
  static pause(): void {
    this.paused = true;
    for (const item of this.queue) {
      if (item.status === "queued") {
        item.status = "paused";
      }
    }
    ModuleLogger.info("[PdfImportManager] Paused.");
  }

  /**
   * Resumes a paused queue, restoring paused items to "queued" status.
   */
  static resume(): void {
    this.paused = false;
    for (const item of this.queue) {
      if (item.status === "paused") {
        item.status = "queued";
      }
    }
    ModuleLogger.info("[PdfImportManager] Resumed.");
  }

  // ── Processing ───────────────────────────────────────────────────────────

  /**
   * Processes the next queued item, if any.
   */
  private static async processNext(options: {
    enableOcr?: boolean;
    enableAi?: boolean;
    aiApiKey?: string;
    onProgress?: (progress: ProcessingProgress) => void;
  }): Promise<void> {
    if (this.cancelled || this.paused) return;
    if (this.activeItemId !== null) return;

    const item = this.queue.find((i) => i.status === "queued");
    if (!item || !item.file) return;

    this.activeItemId = item.id;
    item.status = "processing";
    item.startedAt = new Date().toISOString();

    ModuleLogger.info(
      `[PdfImportManager] Processing "${item.filename}" (${item.id}).`
    );

    let processorModule: { PdfProcessor: typeof import("./PdfProcessor.js").PdfProcessor };
    try {
      processorModule = (await import("./PdfProcessor.js")) as typeof processorModule;
    } catch (err: unknown) {
      item.status = "failed";
      item.errorMessage = `Failed to load PdfProcessor: ${String(err)}`;
      item.completedAt = new Date().toISOString();
      this.activeItemId = null;
      ModuleLogger.error(`[PdfImportManager] ${item.errorMessage}`);
      return;
    }

    const runOptions: any = {
      onProgress: (progress: ProcessingProgress) => {
        item.progress = progress;
        options.onProgress?.(progress);
      },
    };

    if (options.enableOcr !== undefined) runOptions.enableOcr = options.enableOcr;
    if (options.enableAi !== undefined) runOptions.enableAi = options.enableAi;
    if (options.aiApiKey !== undefined) runOptions.aiApiKey = options.aiApiKey;
    if (this.abortController?.signal !== undefined) runOptions.abortSignal = this.abortController.signal;

    try {
      const result = await processorModule.PdfProcessor.process(
        item.file,
        item.sourceBook,
        item.publisher,
        runOptions
      );

      item.status = "done";
      item.result = result;
      item.completedAt = new Date().toISOString();
      item.file = null;

      const entry: ImportHistoryEntry = {
        runId: result.runId,
        filename: result.sourceFile,
        sourceBook: result.sourceBook,
        publisher: result.publisher,
        extractedAt: result.extractedAt,
        totalPages: result.totalPages,
        recordsFound: result.records.length,
        recordsAccepted: 0,
        durationMs: result.durationMs,
        ocrUsed: result.ocrPages > 0,
        aiUsed: result.aiUsed,
      };

      await this.addToHistory(entry);

      ModuleLogger.info(
        `[PdfImportManager] Finished "${item.filename}": ` +
          `${result.records.length} records, ${result.durationMs}ms.`
      );
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg === "Cancelled") {
        item.status = "cancelled";
        item.progress.phase = "cancelled";
        item.progress.message = "Cancelled by user";
        ModuleLogger.info(`[PdfImportManager] Cancelled processing "${item.filename}".`);
      } else {
        item.status = "failed";
        item.errorMessage = errMsg;
        item.completedAt = new Date().toISOString();
        ModuleLogger.error(
          `[PdfImportManager] Failed to process "${item.filename}": ${errMsg}`
        );
      }
      item.file = null;
    } finally {
      this.activeItemId = null;
    }
  }

  /**
   * Processes all queued items sequentially until the queue is empty or the
   * manager is paused or cancelled.
   */
  static async processAll(options: {
    enableOcr?: boolean;
    enableAi?: boolean;
    aiApiKey?: string;
    onProgress?: (progress: ProcessingProgress) => void;
  }): Promise<void> {
    this.cancelled = false;
    this.paused = false;
    this.abortController = new AbortController();

    while (true) {
      if (this.cancelled || this.paused) break;

      const hasQueued = this.queue.some((i) => i.status === "queued");
      if (!hasQueued) break;

      await this.processNext(options);

      if (this.cancelled) break;
    }

    this.abortController = null;
    ModuleLogger.info("[PdfImportManager] processAll complete.");
  }

  // ── History ───────────────────────────────────────────────────────────────

  /**
   * Appends an import history entry and persists to Foundry settings.
   * Caps the history at 50 entries.
   *
   * @param entry - The ImportHistoryEntry to add.
   */
  static async addToHistory(entry: ImportHistoryEntry): Promise<void> {
    this.history.unshift(entry);

    if (this.history.length > MAX_HISTORY_ENTRIES) {
      this.history = this.history.slice(0, MAX_HISTORY_ENTRIES);
    }

    await this.persistHistory();
  }

  /**
   * Writes the current history array to Foundry world settings.
   */
  private static async persistHistory(): Promise<void> {
    try {
      await game.settings.set(MODULE_ID, HISTORY_SETTING_KEY, this.history);
      ModuleLogger.debug(
        `[PdfImportManager] Persisted ${this.history.length} history entries.`
      );
    } catch (err: unknown) {
      ModuleLogger.error(
        `[PdfImportManager] Failed to persist history: ${String(err)}`
      );
    }
  }

  /**
   * Loads import history from Foundry world settings into the in-memory cache.
   */
  private static async loadHistory(): Promise<void> {
    try {
      const raw = game.settings.get(
        MODULE_ID,
        HISTORY_SETTING_KEY
      ) as unknown;

      if (Array.isArray(raw)) {
        this.history = (raw as ImportHistoryEntry[]).slice(
          0,
          MAX_HISTORY_ENTRIES
        );
      } else {
        this.history = [];
      }
    } catch (err: unknown) {
      ModuleLogger.warn(
        `[PdfImportManager] Could not load history from settings: ${String(err)}`
      );
      this.history = [];
    }
  }

  // ── Serialization helpers ─────────────────────────────────────────────────

  /**
   * Returns a copy of the queue with File references removed.
   */
  static getQueueSummary(): QueueItem[] {
    return this.queue.map((item) => ({ ...item, file: null }));
  }

  /**
   * Returns the QueueItem currently being processed, or null.
   */
  static getActiveItem(): QueueItem | null {
    if (this.activeItemId === null) return null;
    return this.queue.find((i) => i.id === this.activeItemId) ?? null;
  }

  /**
   * Returns the number of items waiting in the queue with "queued" status.
   */
  static getPendingCount(): number {
    return this.queue.filter((i) => i.status === "queued").length;
  }

  /**
   * Returns true once `initialize()` has been called successfully.
   */
  static isReady(): boolean {
    return this.initialized;
  }

  /**
   * Resets all in-memory state. Intended for testing only.
   */
  static reset(): void {
    this.queue = [];
    this.history = [];
    this.activeItemId = null;
    this.cancelled = false;
    this.paused = false;
    this.initialized = false;
    this.abortController = null;
  }
}
