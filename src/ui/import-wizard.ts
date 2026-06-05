/**
 * Import Wizard Application
 *
 * A multi-step Foundry V13 ApplicationV2 window that guides the GM through
 * the full import pipeline:
 *   Step 1: Select parser type and provide source data
 *   Step 2: Configure metadata (source book, publisher, etc.)
 *   Step 3: Review validation results
 *   Step 4: Confirm and execute import
 *
 * Uses HandlebarsApplicationMixin for template rendering.
 */

import type { ParseResult, ImportSession, ParserType, ContentType, ImportMetadata, ValidationReport } from "../types/module-types.js";
import { ParserRegistry } from "../parsers/parser-registry.js";
import { AdapterRegistry } from "../adapters/adapter-registry.js";
import { ContentValidator } from "../validation/validator.js";
import { CompendiumManager } from "../compendium/compendium-manager.js";
import { ErrorReporter } from "../validation/error-reporter.js";
import { ModuleLogger } from "../utils/logger.js";
import { ImportReportApp } from "./import-report.js";
import { ValidationResultsApp } from "./validation-results.js";

type Step = 1 | 2 | 3 | 4;

interface WizardState {
  step: Step;
  parserType: ParserType;
  rawInput: string;
  fileName: string;
  defaultContentType: ContentType;
  metadata: Partial<ImportMetadata>;
  parseResult: ParseResult | null;
  validationReport: ValidationReport | null;
  session: ImportSession | null;
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ImportWizardApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-import-wizard",
    title: "SF3PL: Import Wizard",
    classes: ["sf3pl-app", "sf3pl-import-wizard"],
    window: { resizable: true },
    position: { width: 700, height: 620 },
  };

  static override PARTS = {
    main: { template: "modules/starfinder-thirdparty/templates/import-wizard.hbs" },
  };

  private state: WizardState = {
    step: 1,
    parserType: "json",
    rawInput: "",
    fileName: "",
    defaultContentType: "weapon",
    metadata: {},
    parseResult: null,
    validationReport: null,
    session: null,
  };

  // -------------------------------------------------------------------------
  // ApplicationV2 lifecycle
  // -------------------------------------------------------------------------

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { step, parserType, parseResult, validationReport, session } = this.state;

    const parsers = ParserRegistry.getAll().map((p) => ({
      type: p.type,
      label: p.displayName,
      selected: p.type === parserType,
    }));

    const contentTypes: ContentType[] = [
      "weapon", "armor", "equipment", "augmentation", "feat", "spell",
      "race", "theme", "class", "archetypeFeature", "npc", "vehicle",
      "starship", "hazard", "journal",
    ];

    return {
      step,
      isStep1: step === 1,
      isStep2: step === 2,
      isStep3: step === 3,
      isStep4: step === 4,
      parsers,
      contentTypes: contentTypes.map((t) => ({
        value: t,
        label: this.humanizeContentType(t),
        selected: t === this.state.defaultContentType,
      })),
      metadata: this.state.metadata,
      fileName: this.state.fileName,
      parseResult: parseResult ? {
        entryCount: parseResult.entries.length,
        errorCount: parseResult.errors.length,
        warnCount: parseResult.warnings.length,
        preview: parseResult.entries.slice(0, 5).map((e) => ({
          name: String(e.data["name"] ?? "(no name)"),
          type: e.contentType,
          ref: e.sourceReference ?? "",
        })),
      } : null,
      validationReport: validationReport ? {
        passed: validationReport.passed,
        failed: validationReport.failed,
        total: validationReport.totalChecked,
        reportHtml: ErrorReporter.formatValidationReportHtml(validationReport),
      } : null,
      session: session ? {
        status: session.status,
        success: session.successCount,
        failed: session.failureCount,
        skipped: session.skippedCount,
        total: session.totalEntries,
      } : null,
      canProceed: this.canProceedFromStep(step),
    };
  }

  override _onRender(_context: Record<string, unknown>, _options: Record<string, unknown>): void {
    const el = this.element;
    if (!el) return;

    // Step 1 — File upload handler
    const fileInput = el.querySelector<HTMLInputElement>("#sf3pl-file-input");
    if (fileInput) {
      fileInput.addEventListener("change", (evt) => void this.handleFileUpload(evt));
    }

    // Textarea raw input
    const textarea = el.querySelector<HTMLTextAreaElement>("#sf3pl-raw-input");
    if (textarea) {
      textarea.addEventListener("input", () => {
        this.state.rawInput = textarea.value;
      });
    }

    // Parser type select
    const parserSelect = el.querySelector<HTMLSelectElement>("#sf3pl-parser-type");
    if (parserSelect) {
      parserSelect.addEventListener("change", () => {
        this.state.parserType = parserSelect.value as ParserType;
      });
    }

    // Content type select
    const contentTypeSelect = el.querySelector<HTMLSelectElement>("#sf3pl-content-type");
    if (contentTypeSelect) {
      contentTypeSelect.addEventListener("change", () => {
        this.state.defaultContentType = contentTypeSelect.value as ContentType;
      });
    }

    // Metadata inputs
    this.bindMetadataInputs(el);

    // Navigation buttons
    el.querySelector("#sf3pl-btn-next")?.addEventListener("click", () => void this.goNext());
    el.querySelector("#sf3pl-btn-back")?.addEventListener("click", () => void this.goBack());
    el.querySelector("#sf3pl-btn-import")?.addEventListener("click", () => void this.executeImport());
    el.querySelector("#sf3pl-btn-view-report")?.addEventListener("click", () => void this.showImportReport());
    el.querySelector("#sf3pl-btn-view-validation")?.addEventListener("click", () => void this.showValidationResults());
    el.querySelector("#sf3pl-btn-download-report")?.addEventListener("click", () => this.downloadReport());
  }

  // -------------------------------------------------------------------------
  // Step navigation
  // -------------------------------------------------------------------------

  private async goNext(): Promise<void> {
    if (!this.canProceedFromStep(this.state.step)) return;

    if (this.state.step === 1) {
      await this.runParsing();
    } else if (this.state.step === 2) {
      await this.runValidation();
    }

    if (this.state.step < 4) {
      this.state.step = (this.state.step + 1) as Step;
      await this.render(true);
    }
  }

  private async goBack(): Promise<void> {
    if (this.state.step > 1) {
      this.state.step = (this.state.step - 1) as Step;
      await this.render(true);
    }
  }

  private canProceedFromStep(step: Step): boolean {
    switch (step) {
      case 1: return this.state.rawInput.trim().length > 0 || this.state.parseResult !== null;
      case 2: return true;
      case 3: return this.state.validationReport !== null;
      case 4: return false;
    }
  }

  // -------------------------------------------------------------------------
  // Pipeline steps
  // -------------------------------------------------------------------------

  private async runParsing(): Promise<void> {
    const parser = ParserRegistry.get(this.state.parserType);
    if (!parser) {
      ui.notifications.error(`No parser registered for type: ${this.state.parserType}`);
      return;
    }

    try {
      this.state.parseResult = parser.parse(this.state.rawInput, {
        defaultContentType: this.state.defaultContentType,
        sourceMetadata: this.state.metadata as Partial<ImportMetadata>,
      });

      const { entries, errors } = this.state.parseResult;
      ModuleLogger.info(`[ImportWizard] Parsed ${entries.length} entries with ${errors.length} error(s).`);

      if (errors.length > 0) {
        ui.notifications.warn(`Parsing completed with ${errors.length} error(s). Review before continuing.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ui.notifications.error(`Parsing failed: ${message}`);
      ModuleLogger.error(`[ImportWizard] Parsing error: ${message}`);
    }
  }

  private async runValidation(): Promise<void> {
    if (!this.state.parseResult) return;

    const { entries } = this.state.parseResult;
    this.state.validationReport = ContentValidator.validateBatch(entries);

    const { passed, failed } = this.state.validationReport;
    ModuleLogger.info(`[ImportWizard] Validation: ${passed} passed, ${failed} failed.`);

    if (failed > 0) {
      ui.notifications.warn(`${failed} entries failed validation. Review results before importing.`);
    }
  }

  private async executeImport(): Promise<void> {
    if (!this.state.parseResult || !this.state.validationReport) return;

    const adapter = AdapterRegistry.getForCurrentSystem();
    if (!adapter) {
      ui.notifications.error("No adapter registered for the current Foundry system.");
      return;
    }

    // Filter to valid entries only
    const validEntries = this.state.validationReport.results
      .filter((r) => r.valid)
      .map((r) => r.entry);

    // Transform entries
    const documents = [];
    for (const entry of validEntries) {
      const result = adapter.transform(entry);
      if (result.document) documents.push(result.document);
    }

    // Build session
    const session: ImportSession = {
      id: foundry.utils.randomID(),
      startedAt: new Date().toISOString(),
      status: "importing",
      sourceFile: this.state.fileName || undefined,
      parserType: this.state.parserType,
      systemId: game.system?.id ?? "unknown",
      totalEntries: documents.length,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      errors: [],
      warnings: [],
      createdDocuments: [],
    };

    this.state.session = session;
    await this.render(true);

    await CompendiumManager.importDocuments(documents, session, {
      skipDuplicates: true,
      onProgress: (current, total, name) => {
        ModuleLogger.info(`[ImportWizard] Importing ${current}/${total}: ${name}`);
      },
    });

    session.completedAt = new Date().toISOString();
    session.status = session.failureCount === 0 ? "done" : "failed";

    this.state.step = 4;
    await this.render(true);

    ui.notifications.info(
      `Import complete: ${session.successCount} created, ${session.failureCount} failed, ${session.skippedCount} skipped.`
    );
  }

  // -------------------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------------------

  private async handleFileUpload(evt: Event): Promise<void> {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.state.fileName = file.name;

    // Auto-detect parser from extension
    const detected = ParserRegistry.getForFile(file.name);
    if (detected) {
      this.state.parserType = detected.type;
    }

    const text = await file.text();
    this.state.rawInput = text;
    await this.render(true);
  }

  private bindMetadataInputs(el: HTMLElement): void {
    const fields: (keyof ImportMetadata)[] = ["sourceBook", "publisher", "author", "pageNumber", "notes"];
    for (const field of fields) {
      const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="metadata.${field}"]`);
      if (input) {
        input.addEventListener("input", () => {
          const rawVal = input.value;
          if (field === "pageNumber") {
            (this.state.metadata as Record<string, unknown>)[field] = parseInt(rawVal, 10) || 0;
          } else {
            (this.state.metadata as Record<string, unknown>)[field] = rawVal;
          }
        });
      }
    }

    // Tags input (comma-separated)
    const tagsInput = el.querySelector<HTMLInputElement>('[name="metadata.tags"]');
    if (tagsInput) {
      tagsInput.addEventListener("input", () => {
        this.state.metadata.tags = tagsInput.value.split(",").map((t) => t.trim()).filter(Boolean);
      });
    }
  }

  private async showImportReport(): Promise<void> {
    if (!this.state.session) return;
    const reportApp = new ImportReportApp(this.state.session);
    await reportApp.render(true);
  }

  private async showValidationResults(): Promise<void> {
    if (!this.state.validationReport) return;
    const validationApp = new ValidationResultsApp(this.state.validationReport);
    await validationApp.render(true);
  }

  private downloadReport(): void {
    if (!this.state.session) return;
    const text = ErrorReporter.formatImportSession(this.state.session);
    ErrorReporter.downloadReport(text, `sf3pl-import-${this.state.session.id}.txt`);
  }

  private humanizeContentType(type: ContentType): string {
    const labels: Record<ContentType, string> = {
      weapon: "Weapon",
      armor: "Armor",
      equipment: "Equipment",
      augmentation: "Augmentation",
      feat: "Feat",
      spell: "Spell",
      race: "Species",
      theme: "Theme",
      class: "Class",
      archetypeFeature: "Archetype",
      npc: "NPC",
      vehicle: "Vehicle",
      starship: "Starship",
      hazard: "Hazard",
      journal: "Journal Entry",
    };
    return labels[type] ?? type;
  }
}
