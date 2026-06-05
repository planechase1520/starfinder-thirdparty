/**
 * Import Wizard Application — Milestone 2
 *
 * A multi-step Foundry V13 ApplicationV2 window that guides the GM through
 * the Milestone 2 content-management import pipeline:
 *
 *   Step 1 — Select Source  : Choose format (JSON/CSV/TXT/Paste) and provide data
 *   Step 2 — Preview        : Inspect parsed record drafts before validating
 *   Step 3 — Validate       : Review errors and warnings per record
 *   Step 4 — Save to DB     : Commit valid records to the ContentDatabase
 *
 * Records are staged in the ContentDatabase — not yet converted to Foundry
 * documents. That conversion is planned for a future milestone.
 */

import type { ContentCategory, ContentRecord } from "../database/content-record.js";
import {
  CONTENT_CATEGORIES,
  CATEGORY_LABELS,
  IMPORT_METHOD_LABELS,
} from "../database/content-record.js";
import type { ContentDraft, BatchValidationReport } from "../validation/import-validator.js";
import { ImportValidator } from "../validation/import-validator.js";
import { ContentDatabase } from "../database/content-database.js";
import { ContentExporter } from "../export/content-exporter.js";
import { ParserRegistry } from "../parsers/parser-registry.js";
import type { ParserType } from "../types/module-types.js";
import { ModuleLogger } from "../utils/logger.js";

type Step = 1 | 2 | 3 | 4;

// ── Shared defaults ──────────────────────────────────────────────────────────

const DEFAULT_METADATA = {
  sourceBook: "",
  publisher: "",
  author: "",
  pageNumber: 0,
  tags: [] as string[],
  notes: "",
};

// ── Wizard state ─────────────────────────────────────────────────────────────

interface WizardState {
  step: Step;
  /** Format chosen by the user (determines which parser to use). */
  importMethod: "json" | "csv" | "txt" | "paste";
  /** Raw text (file contents or pasted text). */
  rawInput: string;
  /** Name of the uploaded file, if any. */
  fileName: string;
  /** Default category applied when the parsed record has no category field. */
  defaultCategory: ContentCategory;
  /** Global metadata applied to all records that don't provide their own. */
  globalMetadata: typeof DEFAULT_METADATA;
  /** Whether to overwrite existing records with the same name. */
  overwriteDuplicates: boolean;

  /** Drafts produced by the parser — one per row/entry. */
  drafts: ContentDraft[];
  /** Validation report for the current batch of drafts. */
  validationReport: BatchValidationReport | null;
  /** Number of records successfully saved in Step 4. */
  savedCount: number;
  /** Error messages from the save operation. */
  saveErrors: string[];
}

// ── ApplicationV2 class ──────────────────────────────────────────────────────

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ImportWizardApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-import-wizard",
    title: "SF3PL: Import Wizard",
    classes: ["sf3pl-app", "sf3pl-import-wizard"],
    window: { resizable: true },
    position: { width: 720, height: 640 },
  };

  static override PARTS = {
    main: { template: "modules/starfinder-thirdparty/templates/import-wizard.hbs" },
  };

  private state: WizardState = {
    step: 1,
    importMethod: "json",
    rawInput: "",
    fileName: "",
    defaultCategory: "weapon",
    globalMetadata: { ...DEFAULT_METADATA },
    overwriteDuplicates: false,
    drafts: [],
    validationReport: null,
    savedCount: 0,
    saveErrors: [],
  };

  // ── Context preparation ───────────────────────────────────────────────────

  override async _prepareContext(
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { step, importMethod, drafts, validationReport } = this.state;

    // Build category select options
    const categoryOptions = CONTENT_CATEGORIES.map((c) => ({
      value: c,
      label: CATEGORY_LABELS[c],
      selected: c === this.state.defaultCategory,
    }));

    // Build import method options
    const methodOptions = (["json", "csv", "txt", "paste"] as const).map((m) => ({
      value: m,
      label: IMPORT_METHOD_LABELS[m],
      selected: m === importMethod,
    }));

    // Preview table — show up to 10 drafts in Step 2
    const previewRows = drafts.slice(0, 50).map((d, i) => ({
      index: i + 1,
      name: String(d["name"] ?? "(no name)"),
      category: String(d["category"] ?? this.state.defaultCategory),
      sourceBook: String((d["sourceBook"] ?? this.state.globalMetadata.sourceBook) || "—"),
      publisher: String((d["publisher"] ?? this.state.globalMetadata.publisher) || "—"),
    }));

    // Validation summary
    let validationSummary: Record<string, unknown> | null = null;
    if (validationReport) {
      validationSummary = {
        totalChecked: validationReport.totalChecked,
        valid: validationReport.valid,
        invalid: validationReport.invalid,
        withWarnings: validationReport.withWarnings,
        passRate: validationReport.totalChecked > 0
          ? Math.round((validationReport.valid / validationReport.totalChecked) * 100)
          : 0,
        results: validationReport.results.map((r) => ({
          index: r.index + 1,
          name: r.name || "(no name)",
          valid: r.valid,
          issueCount: r.issues.length,
          errorCount: r.errors.length,
          warnCount: r.warnings.length,
          issues: r.issues.map((iss) => ({
            level: iss.level,
            code: iss.code,
            message: iss.message,
            field: iss.field ?? "",
            isError: iss.level === "error",
          })),
        })),
      };
    }

    // Step 4 — save results
    const saveResults =
      step === 4
        ? {
            savedCount: this.state.savedCount,
            errorCount: this.state.saveErrors.length,
            errors: this.state.saveErrors,
          }
        : null;

    return {
      step,
      isStep1: step === 1,
      isStep2: step === 2,
      isStep3: step === 3,
      isStep4: step === 4,
      canGoBack: step > 1 && step < 4,
      canGoNext: this.canAdvance(),
      methodOptions,
      categoryOptions,
      globalMetadata: this.state.globalMetadata,
      overwriteDuplicates: this.state.overwriteDuplicates,
      fileName: this.state.fileName,
      draftCount: drafts.length,
      previewRows,
      showMoreCount: drafts.length > 50 ? drafts.length - 50 : 0,
      validationSummary,
      saveResults,
    };
  }

  // ── Render binding ────────────────────────────────────────────────────────

  override _onRender(
    _context: Record<string, unknown>,
    _options: Record<string, unknown>
  ): void {
    const el = this.element;
    if (!el) return;

    // --- Step 1 controls ---
    const fileInput = el.querySelector<HTMLInputElement>("#sf3pl-file-input");
    if (fileInput) {
      fileInput.addEventListener("change", (evt) => void this.onFileChange(evt));
    }

    const textarea = el.querySelector<HTMLTextAreaElement>("#sf3pl-paste-input");
    if (textarea) {
      textarea.addEventListener("input", () => {
        this.state.rawInput = textarea.value;
      });
    }

    const methodSelect = el.querySelector<HTMLSelectElement>("#sf3pl-import-method");
    if (methodSelect) {
      methodSelect.addEventListener("change", () => {
        this.state.importMethod = methodSelect.value as WizardState["importMethod"];
        void this.render(true);
      });
    }

    const categorySelect = el.querySelector<HTMLSelectElement>("#sf3pl-default-category");
    if (categorySelect) {
      categorySelect.addEventListener("change", () => {
        this.state.defaultCategory = categorySelect.value as ContentCategory;
      });
    }

    // Global metadata fields
    this.bindMetadataInputs(el);

    const overwriteCheck = el.querySelector<HTMLInputElement>("#sf3pl-overwrite");
    if (overwriteCheck) {
      overwriteCheck.addEventListener("change", () => {
        this.state.overwriteDuplicates = overwriteCheck.checked;
      });
    }

    // --- Navigation buttons ---
    el.querySelector("#sf3pl-btn-next")?.addEventListener("click", () => void this.goNext());
    el.querySelector("#sf3pl-btn-back")?.addEventListener("click", () => void this.goBack());
    el.querySelector("#sf3pl-btn-save")?.addEventListener("click", () => void this.saveToDatabase());

    // --- Download buttons ---
    el.querySelector("#sf3pl-btn-download-report")?.addEventListener("click", () => {
      this.downloadValidationReport();
    });
    el.querySelector("#sf3pl-btn-download-json")?.addEventListener("click", () => {
      this.downloadValidJson();
    });

    // --- Dismiss / start over ---
    el.querySelector("#sf3pl-btn-start-over")?.addEventListener("click", () => {
      this.resetWizard();
      void this.render(true);
    });
  }

  // ── Navigation logic ──────────────────────────────────────────────────────

  private async goNext(): Promise<void> {
    if (!this.canAdvance()) return;

    switch (this.state.step) {
      case 1:
        await this.parseInput();
        if (this.state.drafts.length === 0) {
          ui.notifications.warn("No records were parsed from the input. Check the format.");
          return;
        }
        break;
      case 2:
        await this.validateDrafts();
        break;
      default:
        break;
    }

    this.state.step = (this.state.step + 1) as Step;
    await this.render(true);
  }

  private async goBack(): Promise<void> {
    if (this.state.step > 1 && this.state.step < 4) {
      this.state.step = (this.state.step - 1) as Step;
      await this.render(true);
    }
  }

  private canAdvance(): boolean {
    switch (this.state.step) {
      case 1: return this.state.rawInput.trim().length > 0;
      case 2: return this.state.drafts.length > 0;
      case 3: return this.state.validationReport !== null;
      case 4: return false;
    }
  }

  // ── Pipeline steps ────────────────────────────────────────────────────────

  /**
   * Step 1 → Step 2: Parse raw input into ContentDraft objects.
   * Each parser returns an array of ParsedEntry objects. We flatten them
   * into the generic ContentDraft shape that the ImportValidator expects.
   */
  private async parseInput(): Promise<void> {
    const parserTypeMap: Record<WizardState["importMethod"], ParserType> = {
      json: "json",
      csv: "csv",
      txt: "ocr",
      paste: "json",
    };

    const parserType = parserTypeMap[this.state.importMethod];
    const parser = ParserRegistry.get(parserType);

    if (!parser) {
      ui.notifications.error(`No parser registered for type: ${parserType}`);
      return;
    }

    try {
      const parseResult = parser.parse(this.state.rawInput, {
        defaultContentType: this.state.defaultCategory,
        sourceMetadata: {
          sourceBook: this.state.globalMetadata.sourceBook,
          publisher: this.state.globalMetadata.publisher,
          author: this.state.globalMetadata.author,
          pageNumber: this.state.globalMetadata.pageNumber,
        },
      });

      // Convert ParsedEntry → ContentDraft, merging global metadata as defaults
      this.state.drafts = parseResult.entries.map((entry) => {
        const draft: ContentDraft = {
          name: entry.data["name"] ?? entry.data["Name"],
          category: entry.data["category"] ?? entry.data["type"] ?? entry.contentType,
          sourceBook: entry.metadata?.sourceBook ?? this.state.globalMetadata.sourceBook,
          publisher: entry.metadata?.publisher ?? this.state.globalMetadata.publisher,
          author: entry.metadata?.author ?? this.state.globalMetadata.author,
          pageNumber:
            entry.metadata?.pageNumber ??
            entry.data["pageNumber"] ??
            this.state.globalMetadata.pageNumber,
          rawContent: { ...entry.data },
        };
        return draft;
      });

      if (parseResult.errors.length > 0) {
        ui.notifications.warn(
          `Parsing completed with ${parseResult.errors.length} error(s). Some records may be incomplete.`
        );
      }

      ModuleLogger.info(
        `[ImportWizard] Parsed ${this.state.drafts.length} draft(s) from ${parserType} input.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ui.notifications.error(`Parsing failed: ${message}`);
      ModuleLogger.error(`[ImportWizard] Parse error: ${message}`);
      this.state.drafts = [];
    }
  }

  /**
   * Step 2 → Step 3: Run the ImportValidator on all drafts.
   * Duplicate detection uses the live ContentDatabase.
   */
  private async validateDrafts(): Promise<void> {
    if (this.state.overwriteDuplicates) {
      this.state.validationReport = ImportValidator.validateBatchWithOverwrite(this.state.drafts, this.state.overwriteDuplicates);
    } else {
      this.state.validationReport = ImportValidator.validateBatch(this.state.drafts);
    }

    const { valid, invalid } = this.state.validationReport;
    ModuleLogger.info(`[ImportWizard] Validation: ${valid} valid, ${invalid} invalid.`);

    if (invalid > 0) {
      ui.notifications.warn(
        `${invalid} record(s) failed validation and will be skipped unless you go back and fix the input.`
      );
    }
  }

  /**
   * Step 3 → Step 4: Save valid records to ContentDatabase.
   * Invalid records (with errors) are skipped automatically.
   */
  private async saveToDatabase(): Promise<void> {
    if (!this.state.validationReport) return;

    // Extract only drafts that passed validation
    const validDrafts = this.state.validationReport.results
      .filter((r) => r.valid)
      .map((r) => this.state.drafts[r.index])
      .filter(Boolean);

    if (validDrafts.length === 0) {
      ui.notifications.warn("No valid records to save.");
      return;
    }

    const importMethod = this.state.importMethod;
    const globalMeta = this.state.globalMetadata;

    // Build ContentRecord drafts from validated ContentDrafts
    const now = new Date().toISOString();
    const records: ContentRecord[] = validDrafts.map((d) => ({
      id: `record_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      importedDate: now,
      schemaVersion: "2.0.0",
      name: String(d["name"] ?? ""),
      category: (isValidCategoryValue(d["category"])
        ? d["category"]
        : this.state.defaultCategory) as ContentCategory,
      sourceBook: String(d["sourceBook"] ?? globalMeta.sourceBook ?? ""),
      publisher: String(d["publisher"] ?? globalMeta.publisher ?? ""),
      author: String(d["author"] ?? globalMeta.author ?? ""),
      pageNumber: Number(d["pageNumber"] ?? globalMeta.pageNumber ?? 0),
      tags: parseTags(d["tags"] ?? globalMeta.tags),
      notes: String(d["notes"] ?? globalMeta.notes ?? ""),
      rawContent: (d["rawContent"] as Record<string, unknown>) ?? {},
      importMethod: importMethod as "json" | "csv" | "txt" | "paste",
    }));

    try {
      const result = await ContentDatabase.importBatch(records, this.state.overwriteDuplicates);
      this.state.savedCount = result.added.length + result.overwritten.length;
      this.state.saveErrors = result.failed.map((e) => e.reason);

      ui.notifications.info(
        `Saved ${result.added.length} new record(s)${result.overwritten.length > 0 ? `, updated ${result.overwritten.length}` : ""}` +
        `${result.skipped.length > 0 ? `, skipped ${result.skipped.length} duplicate(s)` : ""}.`
      );

      ModuleLogger.info(
        `[ImportWizard] DB save: ${result.added.length} created, ${result.overwritten.length} updated, ` +
        `${result.skipped.length} skipped, ${result.failed.length} error(s).`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.state.saveErrors = [message];
      ui.notifications.error(`Save failed: ${message}`);
      ModuleLogger.error(`[ImportWizard] Save error: ${message}`);
    }

    this.state.step = 4;
    await this.render(true);
  }

  // ── File handling ─────────────────────────────────────────────────────────

  private async onFileChange(evt: Event): Promise<void> {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.state.fileName = file.name;

    // Auto-detect import method from file extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "json") this.state.importMethod = "json";
    else if (ext === "csv") this.state.importMethod = "csv";
    else if (ext === "txt") this.state.importMethod = "txt";

    this.state.rawInput = await file.text();
    await this.render(true);
  }

  // ── Metadata binding ──────────────────────────────────────────────────────

  private bindMetadataInputs(el: HTMLElement): void {
    const textFields = ["sourceBook", "publisher", "author", "notes"] as const;
    for (const field of textFields) {
      const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[name="meta.${field}"]`
      );
      if (input) {
        input.addEventListener("input", () => {
          this.state.globalMetadata[field] = input.value;
        });
      }
    }

    const pageInput = el.querySelector<HTMLInputElement>('[name="meta.pageNumber"]');
    if (pageInput) {
      pageInput.addEventListener("input", () => {
        this.state.globalMetadata.pageNumber = parseInt(pageInput.value, 10) || 0;
      });
    }

    const tagsInput = el.querySelector<HTMLInputElement>('[name="meta.tags"]');
    if (tagsInput) {
      tagsInput.addEventListener("input", () => {
        this.state.globalMetadata.tags = tagsInput.value
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      });
    }
  }

  // ── Download helpers ──────────────────────────────────────────────────────

  private downloadValidationReport(): void {
    if (!this.state.validationReport) return;
    const text = ImportValidator.formatReportText(this.state.validationReport);
    ContentExporter.downloadText(text, "sf3pl-validation-report.txt");
  }

  private downloadValidJson(): void {
    if (!this.state.validationReport) return;
    const validDrafts = this.state.validationReport.results
      .filter((r) => r.valid)
      .map((r) => this.state.drafts[r.index])
      .filter(Boolean);
    const json = JSON.stringify(validDrafts, null, 2);
    ContentExporter.downloadText(json, "sf3pl-valid-records.json");
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  private resetWizard(): void {
    this.state = {
      step: 1,
      importMethod: "json",
      rawInput: "",
      fileName: "",
      defaultCategory: "weapon",
      globalMetadata: { ...DEFAULT_METADATA },
      overwriteDuplicates: false,
      drafts: [],
      validationReport: null,
      savedCount: 0,
      saveErrors: [],
    };
  }
}

// ── Module-level helpers ─────────────────────────────────────────────────────

function isValidCategoryValue(value: unknown): value is ContentCategory {
  return (
    typeof value === "string" &&
    (CONTENT_CATEGORIES as readonly string[]).includes(value)
  );
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return (value as unknown[]).map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}
