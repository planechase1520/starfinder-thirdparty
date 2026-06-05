/**
 * Extraction Review Application — Milestone 5
 *
 * A Foundry V13 ApplicationV2 window that presents extracted PDF records for
 * user review before they are committed to the content database.
 *
 * Layout (split pane):
 *   Left   — Original extracted text block (read-only)
 *   Right  — Editable structured fields derived from the text
 *
 * Record navigation: Prev / Next with record counter.
 *
 * Per-record actions:
 *   Accept      — Marks record as "accepted"; will be saved to database.
 *   Reject      — Marks record as "rejected"; will be skipped.
 *   Edit        — Opens field editors in the right pane.
 *   Save Draft  — Saves current edits without changing status.
 *
 * Toolbar:
 *   Accept All      — Accept every pending record.
 *   Reject All      — Reject every pending record.
 *   Save to Database — Commits all "accepted" records to ContentDatabase.
 *   Open Report     — Opens ExtractionReportApp for this run.
 *   Filter          — Show all / pending / accepted / rejected.
 *
 * After "Save to Database", records are passed to ContentDatabase.addBatch()
 * and converted to ContentRecord format.
 */

import type {
  ExtractionResult,
  ExtractedRecord,
  ExtractedRecordStatus,
} from "../pdf/pdf-types.js";
import { ContentDatabase } from "../database/content-database.js";
import type { ContentRecord } from "../database/content-record.js";
import { isValidCategory } from "../database/content-record.js";
import { ModuleLogger } from "../utils/logger.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// ── Filter type ───────────────────────────────────────────────────────────────

type ReviewFilter = "all" | "pending" | "accepted" | "rejected" | "edited";

// ── ExtractionReviewApp ───────────────────────────────────────────────────────

export class ExtractionReviewApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-extraction-review",
    title: "SF3PL: Extraction Review",
    classes: ["sf3pl-app", "sf3pl-extraction-review"],
    window: { resizable: true },
    position: { width: 1100, height: 720 },
  };

  static override PARTS = {
    main: {
      template: "modules/starfinder-thirdparty/templates/extraction-review.hbs",
    },
  };

  /** The extraction result being reviewed. */
  private result: ExtractionResult;
  /** Working copy of records — mutations here don't touch the original. */
  private records: ExtractedRecord[];
  /** Index of the currently displayed record. */
  private currentIndex = 0;
  /** Whether the right pane is in edit mode. */
  private editMode = false;
  /** Current filter. */
  private filter: ReviewFilter = "all";
  /** Filtered record index list. */
  private filteredIndices: number[] = [];

  constructor(result: ExtractionResult) {
    super({});
    this.result = result;
    this.records = result.records.map((r) => ({ ...r }));
    this.rebuildFilter();
  }

  // ── Context ───────────────────────────────────────────────────────────────

  override async _prepareContext(
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    this.rebuildFilter();

    const filtered = this.filteredIndices;
    const filteredPos = filtered.indexOf(this.currentIndex);
    const safePos = filteredPos === -1 ? 0 : filteredPos;
    const safeGlobalIdx = filtered[safePos] ?? -1;

    const current: ExtractedRecord | null =
      safeGlobalIdx >= 0 ? (this.records[safeGlobalIdx] ?? null) : null;

    const statusCounts = this.buildStatusCounts();
    const structuredRows = current
      ? Object.entries(current.structuredData).map(([k, v]) => ({
          key: k,
          value: typeof v === "object" ? JSON.stringify(v) : String(v ?? ""),
          isEditable: this.editMode,
        }))
      : [];

    const categories = [
      "weapon","armor","equipment","augmentation","feat","spell",
      "race","theme","class","archetypeFeature","vehicle","starship",
      "npc","hazard","journal",
    ];

    return {
      runId: this.result.runId,
      sourceFile: this.result.sourceFile,
      sourceBook: this.result.sourceBook,
      publisher: this.result.publisher,
      totalRecords: this.records.length,
      filteredCount: filtered.length,
      filter: this.filter,
      editMode: this.editMode,

      navigation: {
        current: safePos + 1,
        total: filtered.length,
        hasPrev: safePos > 0,
        hasNext: safePos < filtered.length - 1,
        globalIndex: safeGlobalIdx,
      },

      statusCounts,

      current: current
        ? {
            ...current,
            structuredRows,
            autoTagsJoined: current.autoTags.join(", "),
            confidencePct: Math.round(current.confidence * 100),
          }
        : null,

      categories,
    };
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  override _onRender(
    context: Record<string, unknown>,
    options: Record<string, unknown>
  ): void {
    super._onRender(context, options);
    const html = this.element as HTMLElement;

    // Filter buttons
    html.querySelectorAll<HTMLElement>("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.filter = btn.dataset.filter as ReviewFilter;
        this.currentIndex = this.filteredIndices[0] ?? 0;
        void this.render();
      });
    });

    // Navigation
    html
      .querySelector<HTMLElement>("[data-action='prev']")
      ?.addEventListener("click", () => this.navigate(-1));

    html
      .querySelector<HTMLElement>("[data-action='next']")
      ?.addEventListener("click", () => this.navigate(1));

    // Per-record actions
    html
      .querySelector<HTMLElement>("[data-action='accept']")
      ?.addEventListener("click", () => this.setStatus("accepted"));

    html
      .querySelector<HTMLElement>("[data-action='reject']")
      ?.addEventListener("click", () => this.setStatus("rejected"));

    html
      .querySelector<HTMLElement>("[data-action='edit']")
      ?.addEventListener("click", () => {
        this.editMode = !this.editMode;
        void this.render();
      });

    html
      .querySelector<HTMLElement>("[data-action='save-draft']")
      ?.addEventListener("click", () => {
        this.editMode = false;
        this.saveEditedFields(html);
        void this.render();
      });

    // Merge: copy raw text into notes
    html
      .querySelector<HTMLElement>("[data-action='merge']")
      ?.addEventListener("click", () => this.mergeRawIntoNotes());

    // Bulk actions
    html
      .querySelector<HTMLElement>("[data-action='accept-all']")
      ?.addEventListener("click", () => {
        this.records.forEach((r) => { if (r.status === "pending") r.status = "accepted"; });
        void this.render();
      });

    html
      .querySelector<HTMLElement>("[data-action='reject-all']")
      ?.addEventListener("click", () => {
        this.records.forEach((r) => { if (r.status === "pending") r.status = "rejected"; });
        void this.render();
      });

    // Save to database
    html
      .querySelector<HTMLElement>("[data-action='save-to-db']")
      ?.addEventListener("click", () => void this.saveToDatabase());

    // Open report
    html
      .querySelector<HTMLElement>("[data-action='open-report']")
      ?.addEventListener("click", () => this.openReport());

    // Inline field editing
    if (this.editMode) {
      html.querySelectorAll<HTMLInputElement>("[data-field-key]").forEach((inp) => {
        inp.addEventListener("change", () => this.saveEditedFields(html));
      });

      html
        .querySelector<HTMLSelectElement>("[data-edit-category]")
        ?.addEventListener("change", (e) => {
          const rec = this.currentRecord();
          if (rec) rec.category = (e.target as HTMLSelectElement).value as ExtractedRecord["category"];
        });

      html
        .querySelector<HTMLTextAreaElement>("[data-edit-notes]")
        ?.addEventListener("change", (e) => {
          const rec = this.currentRecord();
          if (rec) rec.notes = (e.target as HTMLTextAreaElement).value;
        });

      html
        .querySelector<HTMLInputElement>("[data-edit-name]")
        ?.addEventListener("change", (e) => {
          const rec = this.currentRecord();
          if (rec) rec.name = (e.target as HTMLInputElement).value;
        });
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private navigate(delta: number): void {
    const pos = this.filteredIndices.indexOf(this.currentIndex);
    const nextPos = Math.max(0, Math.min(this.filteredIndices.length - 1, pos + delta));
    this.currentIndex = this.filteredIndices[nextPos] ?? this.currentIndex;
    void this.render();
  }

  private setStatus(status: ExtractedRecordStatus): void {
    const rec = this.currentRecord();
    if (!rec) return;
    rec.status = status;
    // Auto-advance to next pending
    const pos = this.filteredIndices.indexOf(this.currentIndex);
    const next = this.filteredIndices[pos + 1];
    if (next !== undefined) this.currentIndex = next;
    void this.render();
  }

  private mergeRawIntoNotes(): void {
    const rec = this.currentRecord();
    if (!rec) return;
    rec.notes = rec.notes
      ? `${rec.notes}\n\n--- Raw Text ---\n${rec.rawText}`
      : `--- Raw Text ---\n${rec.rawText}`;
    void this.render();
  }

  private saveEditedFields(html: HTMLElement): void {
    const rec = this.currentRecord();
    if (!rec) return;

    html.querySelectorAll<HTMLInputElement>("[data-field-key]").forEach((inp) => {
      const key = inp.dataset.fieldKey;
      if (!key) return;
      const existing = rec.structuredData[key];
      const rawVal = inp.value;
      // Preserve numeric types if the original was a number
      rec.structuredData[key] =
        typeof existing === "number" && !isNaN(parseFloat(rawVal))
          ? parseFloat(rawVal)
          : rawVal;
    });

    rec.status = "edited";
  }

  private async saveToDatabase(): Promise<void> {
    const accepted = this.records.filter(
      (r) => r.status === "accepted" || r.status === "edited"
    );

    if (accepted.length === 0) {
      ui.notifications.warn("SF3PL: No records are marked as accepted. Accept records before saving.");
      return;
    }

    const records: ContentRecord[] = accepted.map((r) =>
      this.extractedToContentRecord(r)
    );

    try {
      const result = await ContentDatabase.addBatch(records, { overwriteDuplicates: false });
      const saved = result.added.length;
      const skipped = result.skipped.length;
      ui.notifications.info(
        `SF3PL: Saved ${saved} record(s) to the database.` +
        (skipped > 0 ? ` ${skipped} duplicate(s) skipped.` : "")
      );
      ModuleLogger.info(`[ExtractionReview] Saved ${saved} records, skipped ${skipped}.`);
    } catch (err: unknown) {
      ModuleLogger.error(`[ExtractionReview] Database save failed: ${String(err)}`);
      ui.notifications.error("SF3PL: Database save failed. See console for details.");
    }
  }

  private openReport(): void {
    import("./extraction-report.js")
      .then(({ ExtractionReportApp }) => {
        void new ExtractionReportApp(this.result, this.records).render(true);
      })
      .catch((err: unknown) => {
        ModuleLogger.error(`[ExtractionReview] Could not open report: ${String(err)}`);
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private currentRecord(): ExtractedRecord | null {
    return this.records[this.currentIndex] ?? null;
  }

  private rebuildFilter(): void {
    this.filteredIndices = this.records
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => this.filter === "all" || r.status === this.filter)
      .map(({ i }) => i);
  }

  private buildStatusCounts(): Record<string, number> {
    return this.records.reduce<Record<string, number>>(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      { pending: 0, accepted: 0, rejected: 0, edited: 0 }
    );
  }

  private extractedToContentRecord(r: ExtractedRecord): ContentRecord {
    const category = isValidCategory(r.category) ? r.category : "equipment";
    return {
      id: r.id,
      name: r.name,
      category,
      sourceBook: r.sourceBook,
      publisher: r.publisher,
      author: "",
      pageNumber: r.sourcePageNumber,
      tags: [...r.autoTags],
      notes: r.notes,
      rawContent: { ...r.structuredData, _rawText: r.rawText },
      importedDate: new Date().toISOString(),
      importMethod: "txt",
      schemaVersion: "2.0.0",
    };
  }
}
