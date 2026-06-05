/**
 * Template Manager Application — Milestone 4
 *
 * A Foundry V13 ApplicationV2 window for managing DocumentTemplate registrations.
 * Users select existing SFRPG documents (from world or compendium), mark them as
 * templates, and the module learns the field structure from their system data.
 *
 * Registered templates are used by:
 *   - RepairEngine  — to fill missing rawContent fields
 *   - SchemaDiscovery.discoverFromTemplate() — to refine the registry
 *
 * Features:
 *   - List all registered templates with subtype, field count, date added
 *   - "Add Template" — opens a UUID input dialog; fetches the document
 *   - "Refresh from Template" — re-snapshots a registered document's system data
 *   - "Remove" — removes a template from the store
 *   - "Learn Schema" — calls SchemaDiscovery.discoverFromTemplate() and updates registry
 *   - "Clear All" — removes all templates (with confirmation)
 */

import { TemplateStore } from "../schema/TemplateStore.js";
import { SchemaDiscovery } from "../schema/SchemaDiscovery.js";
import { SchemaRegistry } from "../schema/SchemaRegistry.js";
import { ModuleLogger } from "../utils/logger.js";
import type { DocumentTemplate } from "../schema/schema-types.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// ── View-model helpers ────────────────────────────────────────────────────────

interface TemplateRow {
  uuid: string;
  name: string;
  documentType: string;
  subtype: string;
  fieldCount: number;
  addedAt: string;
  notes: string;
  hasSchema: boolean;
}

// ── TemplateManagerApp ────────────────────────────────────────────────────────

export class TemplateManagerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-template-manager",
    title: "SF3PL: Template Manager",
    classes: ["sf3pl-app", "sf3pl-template-manager"],
    window: { resizable: true },
    position: { width: 720, height: 520 },
  };

  static override PARTS = {
    main: {
      template: "modules/starfinder-thirdparty/templates/template-manager.hbs",
    },
  };

  // ── Context ───────────────────────────────────────────────────────────────

  override async _prepareContext(
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const templates = TemplateStore.getAll();

    const rows: TemplateRow[] = templates.map((t) => ({
      uuid: t.uuid,
      name: t.name,
      documentType: t.documentType,
      subtype: t.subtype,
      fieldCount: Object.keys(t.systemDataSnapshot).length,
      addedAt: new Date(t.addedAt).toLocaleString(),
      notes: t.notes,
      hasSchema: SchemaRegistry.has(t.documentType, t.subtype),
    }));

    return {
      rows,
      templateCount: rows.length,
      isEmpty: rows.length === 0,
      subtypesSummary: TemplateStore.getSubtypes().join(", ") || "None",
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
      .querySelector<HTMLElement>("[data-action='add-template']")
      ?.addEventListener("click", () => void this.addTemplate());

    html
      .querySelector<HTMLElement>("[data-action='clear-all']")
      ?.addEventListener("click", () => void this.clearAll());

    html.querySelectorAll<HTMLElement>("[data-action='remove']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uuid = btn.closest<HTMLElement>("[data-uuid]")?.dataset.uuid;
        if (uuid) void this.removeTemplate(uuid);
      });
    });

    html.querySelectorAll<HTMLElement>("[data-action='refresh']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uuid = btn.closest<HTMLElement>("[data-uuid]")?.dataset.uuid;
        if (uuid) void this.refreshTemplate(uuid);
      });
    });

    html.querySelectorAll<HTMLElement>("[data-action='learn-schema']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const uuid = btn.closest<HTMLElement>("[data-uuid]")?.dataset.uuid;
        if (uuid) void this.learnSchema(uuid);
      });
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private async addTemplate(): Promise<void> {
    const uuid = await this.promptForUuid();
    if (!uuid) return;

    ui.notifications.info(`SF3PL: Fetching document ${uuid}…`);

    try {
      const doc = await fromUuid(uuid) as { uuid: string; name: string; type: string; system: unknown } | null;
      if (!doc) {
        ui.notifications.error(`SF3PL: No document found at UUID: ${uuid}`);
        return;
      }

      if (!doc.type) {
        ui.notifications.error("SF3PL: The selected document has no type property. Items and Actors are supported.");
        return;
      }

      const notes = await this.promptForNotes(doc.name);
      const template = TemplateStore.fromDocument(doc, notes);
      await TemplateStore.add(template);

      ui.notifications.info(
        `SF3PL: Template registered: ${template.name} (${template.subtype})`
      );
      void this.render();
    } catch (err: unknown) {
      ModuleLogger.error(`[TemplateManager] Failed to add template: ${String(err)}`);
      ui.notifications.error("SF3PL: Failed to add template. See console for details.");
    }
  }

  private async refreshTemplate(uuid: string): Promise<void> {
    const existing = TemplateStore.get(uuid);
    if (!existing) return;

    try {
      const doc = await fromUuid(uuid) as { uuid: string; name: string; type: string; system: unknown } | null;
      if (!doc) {
        ui.notifications.warn(`SF3PL: Document no longer exists at UUID: ${uuid}`);
        return;
      }

      const refreshed: DocumentTemplate = {
        ...existing,
        systemDataSnapshot: (doc.system as Record<string, unknown>) ?? {},
        addedAt: new Date().toISOString(),
      };

      await TemplateStore.add(refreshed);
      ui.notifications.info(`SF3PL: Template refreshed: ${existing.name}`);
      void this.render();
    } catch (err: unknown) {
      ModuleLogger.error(`[TemplateManager] Refresh failed: ${String(err)}`);
      ui.notifications.error("SF3PL: Failed to refresh template.");
    }
  }

  private async learnSchema(uuid: string): Promise<void> {
    const template = TemplateStore.get(uuid);
    if (!template) return;

    ui.notifications.info(
      `SF3PL: Learning schema from template: ${template.name}…`
    );

    try {
      const doc = await fromUuid(uuid) as {
        uuid: string;
        name: string;
        type: string;
        system: unknown;
      } | null;

      if (!doc) {
        ui.notifications.warn(`SF3PL: Document not found at UUID: ${uuid}`);
        return;
      }

      const docType = template.documentType;
      const schema = SchemaDiscovery.discoverFromTemplate(
        doc as { uuid: string; name: string; type: string; system: Record<string, unknown> },
        docType
      );
      if (!schema) {
        ui.notifications.warn(`SF3PL: Could not discover schema from template "${template.name}".`);
        return;
      }

      await SchemaRegistry.registerTemplate(schema);

      ui.notifications.info(
        `SF3PL: Schema learned from "${template.name}". ` +
        `${schema.fields.length} field(s) discovered.`
      );
      void this.render();
    } catch (err: unknown) {
      ModuleLogger.error(`[TemplateManager] Learn schema failed: ${String(err)}`);
      ui.notifications.error("SF3PL: Failed to learn schema from template.");
    }
  }

  private async removeTemplate(uuid: string): Promise<void> {
    const template = TemplateStore.get(uuid);
    if (!template) return;

    const confirmed = await Dialog.confirm({
      title: "Remove Template",
      content: `<p>Remove template "<strong>${template.name}</strong>" (${template.subtype})?</p>`,
    });
    if (!confirmed) return;

    await TemplateStore.remove(uuid);
    ui.notifications.info(`SF3PL: Template removed: ${template.name}`);
    void this.render();
  }

  private async clearAll(): Promise<void> {
    if (TemplateStore.count() === 0) {
      ui.notifications.info("SF3PL: No templates to clear.");
      return;
    }

    const confirmed = await Dialog.confirm({
      title: "Clear All Templates",
      content: "<p>Remove <strong>all</strong> registered templates? This cannot be undone.</p>",
    });
    if (!confirmed) return;

    await TemplateStore.clear();
    ui.notifications.info("SF3PL: All templates cleared.");
    void this.render();
  }

  // ── Dialogs ───────────────────────────────────────────────────────────────

  private promptForUuid(): Promise<string | null> {
    return new Promise((resolve) => {
      let inputEl: HTMLInputElement | null = null;

      const d = new Dialog({
        title: "Add Template — Enter Document UUID",
        content: `
          <div class="form-group">
            <label>Document UUID</label>
            <input type="text" id="sf3pl-uuid-input"
              placeholder="e.g. Item.abc123 or Compendium.sfrpg.items.Item.xyz"
              style="width:100%; font-size:0.85rem; font-family:monospace;" />
            <p class="hint">
              Right-click any Item or Actor in Foundry and choose
              <em>Copy UUID</em> to get its UUID.
            </p>
          </div>`,
        buttons: {
          ok: {
            label: "Add",
            callback: (html: HTMLElement) => {
              inputEl = html.querySelector<HTMLInputElement>("#sf3pl-uuid-input");
              const val = inputEl?.value?.trim() ?? "";
              resolve(val || null);
            },
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null),
          },
        },
        default: "ok",
      });
      void d.render(true);
    });
  }

  private promptForNotes(docName: string): Promise<string> {
    return new Promise((resolve) => {
      const d = new Dialog({
        title: `Notes for "${docName}"`,
        content: `
          <div class="form-group">
            <label>Notes (optional)</label>
            <input type="text" id="sf3pl-notes-input"
              placeholder="e.g. Standard ranged weapon template"
              style="width:100%;" />
          </div>`,
        buttons: {
          ok: {
            label: "Save",
            callback: (html: HTMLElement) => {
              const el = html.querySelector<HTMLInputElement>("#sf3pl-notes-input");
              resolve(el?.value?.trim() ?? "");
            },
          },
          skip: {
            label: "Skip",
            callback: () => resolve(""),
          },
        },
        default: "skip",
      });
      void d.render(true);
    });
  }
}

// ── Foundry globals ───────────────────────────────────────────────────────────

declare function fromUuid(
  uuid: string
): Promise<{ uuid: string; name: string; type: string; system: unknown } | null>;
