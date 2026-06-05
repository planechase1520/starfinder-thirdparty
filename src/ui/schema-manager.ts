/**
 * Schema Manager Application — Milestone 4
 *
 * A Foundry V13 ApplicationV2 window that exposes schema discovery and
 * mapping management features to the GM:
 *
 *   Registry tab  — All discovered document schemas with field counts.
 *   Diffs tab     — Schema changes detected since the last session.
 *   Mappings tab  — Auto-generated mapping profiles per content category.
 *   Repair tab    — Run RepairEngine against the content database.
 *
 * Buttons:
 *   Scan Current System    — Live-scans game system; updates registry.
 *   Rebuild Schema Registry — Clears cache then rescans.
 *   Export Diffs           — Downloads diff report as .txt.
 *   Repair All Records     — Runs RepairEngine on every database record and
 *                            saves the repaired copies back to the database.
 *   Open Template Manager  — Opens the companion Template Manager window.
 */

import { SchemaRegistry } from "../schema/SchemaRegistry.js";
import { SchemaReporter } from "../schema/SchemaReporter.js";
import { MappingProfiles } from "../mapping/MappingProfiles.js";
import { MappingValidator } from "../mapping/MappingValidator.js";
import { RepairEngine } from "../repair/RepairEngine.js";
import { ContentDatabase } from "../database/content-database.js";
import { ModuleLogger } from "../utils/logger.js";
import type { DiscoveredSchema, SchemaDiff } from "../schema/schema-types.js";
import type { MappingProfile } from "../mapping/MappingProfiles.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// ── Active tab type ───────────────────────────────────────────────────────────

type SchemaTab = "registry" | "diffs" | "mappings" | "repair";

// ── View-model helpers ────────────────────────────────────────────────────────

interface SchemaRow {
  key: string;
  documentType: string;
  subtype: string;
  fieldCount: number;
  requiredCount: number;
  source: string;
  schemaHash: string;
  discoveredAt: string;
}

interface DiffRow {
  key: string;
  documentType: string;
  subtype: string;
  isCompatible: boolean;
  added: number;
  removed: number;
  changed: number;
  newlyRequired: number;
  comparedAt: string;
}

interface MappingRow {
  category: string;
  documentType: string;
  subtype: string;
  ruleCount: number;
  schemaHash: string;
  builtAt: string;
  isValid: boolean;
  gapCount: number;
  staleCount: number;
}

interface RepairRow {
  recordId: string;
  name: string;
  category: string;
  actionCount: number;
  issueCount: number;
  wasModified: boolean;
}

// ── SchemaManagerApp ──────────────────────────────────────────────────────────

export class SchemaManagerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-schema-manager",
    title: "SF3PL: Schema Manager",
    classes: ["sf3pl-app", "sf3pl-schema-manager"],
    window: { resizable: true },
    position: { width: 900, height: 640 },
  };

  static override PARTS = {
    main: {
      template: "modules/starfinder-thirdparty/templates/schema-manager.hbs",
    },
  };

  private activeTab: SchemaTab = "registry";
  private isScanning = false;
  private repairRows: RepairRow[] = [];

  // ── Context ───────────────────────────────────────────────────────────────

  override async _prepareContext(
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const schemas = SchemaRegistry.getAll();
    const diffs = SchemaRegistry.getLastDiffs();
    MappingProfiles.buildAll();
    const profiles = MappingProfiles.getAllProfiles();

    const schemaRows: SchemaRow[] = schemas.map((s) => this.schemaToRow(s));
    const diffRows: DiffRow[] = diffs.map((d) => this.diffToRow(d));
    const mappingRows: MappingRow[] = profiles.map((p) => this.profileToRow(p, schemas));

    const changesFound = diffs.some((d) => !d.isCompatible);
    const totalFields = schemas.reduce((sum, s) => sum + s.fields.length, 0);

    return {
      activeTab: this.activeTab,
      isScanning: this.isScanning,

      registry: {
        schemas: schemaRows,
        totalSchemas: schemaRows.length,
        totalFields,
        systemId: schemas[0]?.systemId ?? (game as unknown as { system: { id: string } }).system?.id ?? "—",
      },

      diffs: {
        rows: diffRows,
        changesFound,
        noDiffs: diffs.length === 0,
      },

      mappings: {
        rows: mappingRows,
        noProfiles: profiles.length === 0,
      },

      repair: {
        rows: this.repairRows,
        noneRun: this.repairRows.length === 0,
        modifiedCount: this.repairRows.filter((r) => r.wasModified).length,
        totalCount: this.repairRows.length,
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

    // Tab switching
    html.querySelectorAll<HTMLElement>("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab as SchemaTab;
        if (tab) {
          this.activeTab = tab;
          void this.render();
        }
      });
    });

    // Scan button
    html
      .querySelector<HTMLElement>("[data-action='scan']")
      ?.addEventListener("click", () => void this.scanSystem());

    // Rebuild button
    html
      .querySelector<HTMLElement>("[data-action='rebuild']")
      ?.addEventListener("click", () => void this.rebuildRegistry());

    // Export diffs button
    html
      .querySelector<HTMLElement>("[data-action='export-diffs']")
      ?.addEventListener("click", () => this.exportDiffs());

    // Repair all button
    html
      .querySelector<HTMLElement>("[data-action='repair-all']")
      ?.addEventListener("click", () => void this.repairAll());

    // Open template manager
    html
      .querySelector<HTMLElement>("[data-action='open-template-manager']")
      ?.addEventListener("click", () => this.openTemplateManager());
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private async scanSystem(): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;
    void this.render();

    try {
      ui.notifications.info("SF3PL: Scanning game system schemas…");
      const diffs = await SchemaRegistry.rescan();
      const changed = diffs.filter((d) => !d.isCompatible).length;
      ui.notifications.info(
        `SF3PL: Schema scan complete. ${SchemaRegistry.getAll().length} schema(s) found, ` +
        `${changed} change(s) detected.`
      );
    } catch (err: unknown) {
      ModuleLogger.error(`[SchemaManager] Scan failed: ${String(err)}`);
      ui.notifications.error(`SF3PL: Schema scan failed. See console for details.`);
    } finally {
      this.isScanning = false;
      void this.render();
    }
  }

  private async rebuildRegistry(): Promise<void> {
    if (this.isScanning) return;

    const confirmed = await Dialog.confirm({
      title: "Rebuild Schema Registry",
      content:
        "<p>This will clear the cached schema data and run a full rescan. " +
        "Mapping profiles will be regenerated. Continue?</p>",
    });
    if (!confirmed) return;

    this.isScanning = true;
    void this.render();

    try {
      MappingProfiles.clear();
      const diffs = await SchemaRegistry.rescan();
      ui.notifications.info(
        `SF3PL: Schema registry rebuilt. ${diffs.length} schema(s) processed.`
      );
    } catch (err: unknown) {
      ModuleLogger.error(`[SchemaManager] Rebuild failed: ${String(err)}`);
      ui.notifications.error("SF3PL: Rebuild failed. See console for details.");
    } finally {
      this.isScanning = false;
      void this.render();
    }
  }

  private exportDiffs(): void {
    const report = SchemaReporter.formatAllDiffs();
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sf3pl-schema-diffs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    ui.notifications.info("SF3PL: Schema diff report downloaded.");
  }

  private async repairAll(): Promise<void> {
    const records = ContentDatabase.getAll();
    if (records.length === 0) {
      ui.notifications.warn("SF3PL: No records in the database to repair.");
      return;
    }

    ui.notifications.info(`SF3PL: Repairing ${records.length} record(s)…`);

    try {
      const batchResult = RepairEngine.repairBatch(records);

      // Persist repaired records back to the database
      let saved = 0;
      for (const result of batchResult.results) {
        if (result.wasModified) {
          await ContentDatabase.update(result.repairedRecord);
          saved++;
        }
      }

      this.repairRows = batchResult.results.map((r) => ({
        recordId: r.recordId,
        name: r.recordName,
        category: r.category,
        actionCount: r.actionsApplied.filter(
          (a) => a.action !== "skipped"
        ).length,
        issueCount: r.remainingIssues.length,
        wasModified: r.wasModified,
      }));

      this.activeTab = "repair";
      void this.render();

      ui.notifications.info(
        `SF3PL: Repair complete. ${saved} record(s) updated, ` +
        `${batchResult.unchanged} unchanged.`
      );
    } catch (err: unknown) {
      ModuleLogger.error(`[SchemaManager] Repair failed: ${String(err)}`);
      ui.notifications.error("SF3PL: Repair failed. See console for details.");
    }
  }

  private openTemplateManager(): void {
    import("./template-manager.js")
      .then(({ TemplateManagerApp }) => {
        void new TemplateManagerApp().render(true);
      })
      .catch((err: unknown) => {
        ModuleLogger.error(`[SchemaManager] Could not open TemplateManager: ${String(err)}`);
      });
  }

  // ── Row builders ──────────────────────────────────────────────────────────

  private schemaToRow(schema: DiscoveredSchema): SchemaRow {
    const requiredCount = schema.fields.filter((f) => f.required).length;
    return {
      key: `${schema.documentType}.${schema.subtype}`,
      documentType: schema.documentType,
      subtype: schema.subtype,
      fieldCount: schema.fields.length,
      requiredCount,
      source: schema.source,
      schemaHash: schema.schemaHash,
      discoveredAt: new Date(schema.discoveredAt).toLocaleString(),
    };
  }

  private diffToRow(diff: SchemaDiff): DiffRow {
    return {
      key: `${diff.documentType}.${diff.subtype}`,
      documentType: diff.documentType,
      subtype: diff.subtype,
      isCompatible: diff.isCompatible,
      added: diff.addedFields.length,
      removed: diff.removedFields.length,
      changed: diff.changedTypes.length,
      newlyRequired: diff.newlyRequired.length,
      comparedAt: new Date(diff.comparedAt).toLocaleString(),
    };
  }

  private profileToRow(
    profile: MappingProfile,
    schemas: DiscoveredSchema[]
  ): MappingRow {
    const schema = schemas.find(
      (s) => s.documentType === profile.documentType && s.subtype === profile.sfrpgSubtype
    );

    let isValid = true;
    let gapCount = 0;
    let staleCount = 0;

    if (schema) {
      const validationReport = MappingValidator.validate(profile, schema);
      isValid = validationReport.isValid;
      gapCount = validationReport.missingRequiredRules.length;
      staleCount = validationReport.staleRules.length;
    }

    return {
      category: profile.category,
      documentType: profile.documentType,
      subtype: profile.sfrpgSubtype,
      ruleCount: profile.rules.length,
      schemaHash: profile.schemaHash,
      builtAt: new Date(profile.builtAt).toLocaleString(),
      isValid,
      gapCount,
      staleCount,
    };
  }
}

// Declare Dialog globally (Foundry global)
declare const Dialog: {
  confirm(options: { title: string; content: string }): Promise<boolean>;
};
