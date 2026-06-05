/**
 * Content Browser Application — Milestone 2
 *
 * A Foundry V13 ApplicationV2 window that provides a searchable,
 * filterable, and sortable browser over the SF3PL ContentDatabase.
 *
 * Features:
 *   - Full-text search across name, publisher, sourceBook, tags
 *   - Category / publisher / sourceBook filter sidebars
 *   - Sortable column headers (name, category, publisher, sourceBook, level)
 *   - Detail panel showing all fields of a selected record
 *   - Inline notes/tags editing
 *   - Delete confirmation dialog
 *   - JSON and CSV export for selected or all records
 */

import type { ContentRecord, ContentFilter, SortConfig, SortField, ContentCategory } from "../database/content-record.js";
import { CONTENT_CATEGORIES, CATEGORY_LABELS } from "../database/content-record.js";
import { ContentDatabase } from "../database/content-database.js";
import { ContentExporter } from "../export/content-exporter.js";
import { ConversionPipeline } from "../pipeline/conversion-pipeline.js";
import type { PipelineReport } from "../pipeline/pipeline-report.js";
import { ModuleLogger } from "../utils/logger.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// ── Icons per category ────────────────────────────────────────────────────────

const CATEGORY_ICONS: Readonly<Record<ContentCategory, string>> = {
  weapon: "fa-sword",
  armor: "fa-shield-halved",
  equipment: "fa-toolbox",
  augmentation: "fa-microchip",
  feat: "fa-star",
  spell: "fa-wand-sparkles",
  race: "fa-person",
  theme: "fa-masks-theater",
  class: "fa-graduation-cap",
  archetypeFeature: "fa-puzzle-piece",
  vehicle: "fa-car",
  starship: "fa-rocket",
  npc: "fa-user-secret",
  hazard: "fa-triangle-exclamation",
  journal: "fa-book-open",
};

// ── Browser state ─────────────────────────────────────────────────────────────

interface BrowserState {
  /** True after the first load from the database. */
  loaded: boolean;
  /** Full record set loaded from ContentDatabase. */
  allRecords: ContentRecord[];
  /** Search + filter config. */
  filter: ContentFilter;
  /** Sort config. */
  sort: SortConfig;
  /** Currently selected record id (null = none). */
  selectedId: string | null;
  /** IDs of records with their checkboxes ticked (for bulk operations). */
  selectedIds: Set<string>;
  /** Whether the inline notes editor is open. */
  editingNotes: boolean;
  /** Working copy of notes being edited. */
  notesBuffer: string;
  /** Working copy of tags being edited. */
  tagsBuffer: string;
}

// ── ApplicationV2 class ──────────────────────────────────────────────────────

export class ContentBrowserApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-content-browser",
    title: "SF3PL: Content Browser",
    classes: ["sf3pl-app", "sf3pl-content-browser"],
    window: { resizable: true },
    position: { width: 960, height: 680 },
  };

  static override PARTS = {
    main: { template: "modules/starfinder-thirdparty/templates/content-browser.hbs" },
  };

  private state: BrowserState = {
    loaded: false,
    allRecords: [],
    filter: {},
    sort: { field: "name", ascending: true },
    selectedId: null,
    selectedIds: new Set(),
    editingNotes: false,
    notesBuffer: "",
    tagsBuffer: "",
  };

  // ── Context preparation ───────────────────────────────────────────────────

  override async _prepareContext(
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!this.state.loaded) {
      await this.loadRecords();
    }

    const { allRecords, filter, sort, selectedId } = this.state;

    // Apply filter + sort from database
    const filtered = ContentDatabase.query(filter, sort);
    const selected = selectedId ? ContentDatabase.get(selectedId) ?? null : null;

    // Unique values for filter dropdowns
    const publishers = ContentDatabase.getUniqueValues("publisher");
    const sourceBooks = ContentDatabase.getUniqueValues("sourceBook");
    const allTags = ContentDatabase.getUniqueValues("tags");

    // Category filter options with counts
    const categoryCounts = new Map<string, number>();
    for (const rec of allRecords) {
      categoryCounts.set(rec.category, (categoryCounts.get(rec.category) ?? 0) + 1);
    }

    const categoryFilterOptions = CONTENT_CATEGORIES.map((c) => ({
      value: c,
      label: CATEGORY_LABELS[c],
      count: categoryCounts.get(c) ?? 0,
      active: (filter.categories ?? []).includes(c),
    })).filter((opt) => opt.count > 0);

    // Table rows
    const rows = filtered.map((rec) => ({
      id: rec.id,
      name: rec.name,
      category: rec.category,
      categoryLabel: CATEGORY_LABELS[rec.category] ?? rec.category,
      categoryIcon: CATEGORY_ICONS[rec.category] ?? "fa-box",
      sourceBook: rec.sourceBook || "—",
      publisher: rec.publisher || "—",
      level: String(rec.rawContent["level"] ?? "—"),
      tags: rec.tags.slice(0, 3).join(", "),
      isSelected: rec.id === selectedId,
      isChecked: this.state.selectedIds.has(rec.id),
      importedDate: new Date(rec.importedDate).toLocaleDateString(),
    }));

    // Detail panel for the selected record
    let detailPanel: Record<string, unknown> | null = null;
    if (selected) {
      detailPanel = {
        id: selected.id,
        name: selected.name,
        category: selected.category,
        categoryLabel: CATEGORY_LABELS[selected.category],
        categoryIcon: CATEGORY_ICONS[selected.category] ?? "fa-box",
        sourceBook: selected.sourceBook || "—",
        publisher: selected.publisher || "—",
        author: selected.author || "—",
        pageNumber: selected.pageNumber > 0 ? selected.pageNumber : "—",
        tags: selected.tags.join(", ") || "—",
        notes: selected.notes || "",
        importedDate: new Date(selected.importedDate).toLocaleDateString(),
        importMethod: selected.importMethod,
        rawContentJson: JSON.stringify(selected.rawContent, null, 2),
        editingNotes: this.state.editingNotes,
        notesBuffer: this.state.notesBuffer,
        tagsBuffer: this.state.tagsBuffer,
      };
    }

    const checkedCount = this.state.selectedIds.size;

    return {
      loaded: this.state.loaded,
      totalCount: allRecords.length,
      filteredCount: filtered.length,
      rows,
      filter: {
        searchText: filter.searchText ?? "",
        publisher: (filter.publishers ?? [])[0] ?? "",
        sourceBook: (filter.sourceBooks ?? [])[0] ?? "",
        tag: (filter.tags ?? [])[0] ?? "",
      },
      sort: {
        field: sort.field,
        ascending: sort.ascending,
        isAscName: sort.field === "name" && sort.ascending,
        isDescName: sort.field === "name" && !sort.ascending,
      },
      categoryFilterOptions,
      publisherOptions: publishers.map((p) => ({ value: p, label: p })),
      sourceBookOptions: sourceBooks.map((s) => ({ value: s, label: s })),
      tagOptions: allTags.map((t) => ({ value: t, label: t })),
      detailPanel,
      hasSelection: selectedId !== null,
      checkedCount,
      hasChecked: checkedCount > 0,
      isEmpty: allRecords.length === 0,
    };
  }

  // ── Render binding ────────────────────────────────────────────────────────

  override _onRender(
    _context: Record<string, unknown>,
    _options: Record<string, unknown>
  ): void {
    const el = this.element;
    if (!el) return;

    // --- Search ---
    el.querySelector<HTMLInputElement>("#sf3pl-search")?.addEventListener("input", (e) => {
      this.state.filter.searchText = (e.target as HTMLInputElement).value;
      void this.render(true);
    });

    // --- Category checkboxes ---
    el.querySelectorAll<HTMLInputElement>(".sf3pl-category-filter").forEach((cb) => {
      cb.addEventListener("change", () => {
        const checked = Array.from(el.querySelectorAll<HTMLInputElement>(".sf3pl-category-filter:checked"))
          .map((c) => c.value as ContentCategory);
        this.state.filter.categories = checked.length > 0 ? checked : undefined;
        void this.render(true);
      });
    });

    // --- Publisher / SourceBook / Tag filter selects ---
    el.querySelector<HTMLSelectElement>("#sf3pl-filter-publisher")?.addEventListener("change", (e) => {
      const v = (e.target as HTMLSelectElement).value;
      this.state.filter.publishers = v ? [v] : undefined;
      void this.render(true);
    });

    el.querySelector<HTMLSelectElement>("#sf3pl-filter-sourcebook")?.addEventListener("change", (e) => {
      const v = (e.target as HTMLSelectElement).value;
      this.state.filter.sourceBooks = v ? [v] : undefined;
      void this.render(true);
    });

    el.querySelector<HTMLSelectElement>("#sf3pl-filter-tag")?.addEventListener("change", (e) => {
      const v = (e.target as HTMLSelectElement).value;
      this.state.filter.tags = v ? [v] : undefined;
      void this.render(true);
    });

    // --- Clear filters ---
    el.querySelector("#sf3pl-btn-clear-filter")?.addEventListener("click", () => {
      this.state.filter = {};
      void this.render(true);
    });

    // --- Sort headers ---
    el.querySelectorAll<HTMLElement>("[data-sort]").forEach((header) => {
      header.addEventListener("click", () => {
        const field = header.dataset["sort"] as SortField;
        if (this.state.sort.field === field) {
          this.state.sort.ascending = !this.state.sort.ascending;
        } else {
          this.state.sort = { field, ascending: true };
        }
        void this.render(true);
      });
    });

    // --- Row click → select record ---
    el.querySelectorAll<HTMLElement>(".sf3pl-row[data-id]").forEach((row) => {
      row.addEventListener("click", (evt) => {
        if ((evt.target as HTMLElement).matches("input[type='checkbox']")) return;
        const id = row.dataset["id"] ?? null;
        if (this.state.selectedId === id) {
          this.state.selectedId = null;
        } else {
          this.state.selectedId = id;
          this.state.editingNotes = false;
        }
        void this.render(true);
      });
    });

    // --- Row checkboxes (bulk select) ---
    el.querySelectorAll<HTMLInputElement>(".sf3pl-row-check").forEach((cb) => {
      cb.addEventListener("change", () => {
        const id = cb.dataset["id"] ?? "";
        if (cb.checked) {
          this.state.selectedIds.add(id);
        } else {
          this.state.selectedIds.delete(id);
        }
        void this.render(true);
      });
    });

    // --- Select all ---
    el.querySelector<HTMLInputElement>("#sf3pl-select-all")?.addEventListener("change", (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      const filtered = ContentDatabase.query(this.state.filter, this.state.sort);
      if (checked) {
        filtered.forEach((r) => this.state.selectedIds.add(r.id));
      } else {
        filtered.forEach((r) => this.state.selectedIds.delete(r.id));
      }
      void this.render(true);
    });

    // --- Refresh ---
    el.querySelector("#sf3pl-btn-refresh")?.addEventListener("click", () => {
      this.state.loaded = false;
      void this.render(true);
    });

    // --- Export buttons ---
    el.querySelector("#sf3pl-btn-export-json")?.addEventListener("click", () => {
      this.exportJson();
    });

    el.querySelector("#sf3pl-btn-export-csv")?.addEventListener("click", () => {
      this.exportCsv();
    });

    // --- Detail panel actions ---
    el.querySelector("#sf3pl-btn-delete")?.addEventListener("click", () => {
      void this.deleteSelected();
    });

    el.querySelector("#sf3pl-btn-edit-notes")?.addEventListener("click", () => {
      if (this.state.selectedId) {
        const rec = ContentDatabase.get(this.state.selectedId);
        if (rec) {
          this.state.editingNotes = true;
          this.state.notesBuffer = rec.notes;
          this.state.tagsBuffer = rec.tags.join(", ");
          void this.render(true);
        }
      }
    });

    el.querySelector("#sf3pl-btn-save-notes")?.addEventListener("click", () => {
      void this.saveNotes();
    });

    el.querySelector("#sf3pl-btn-cancel-notes")?.addEventListener("click", () => {
      this.state.editingNotes = false;
      void this.render(true);
    });

    // Sync notes/tags buffers as user types
    el.querySelector<HTMLTextAreaElement>("#sf3pl-notes-editor")?.addEventListener("input", (e) => {
      this.state.notesBuffer = (e.target as HTMLTextAreaElement).value;
    });

    el.querySelector<HTMLInputElement>("#sf3pl-tags-editor")?.addEventListener("input", (e) => {
      this.state.tagsBuffer = (e.target as HTMLInputElement).value;
    });

    // --- Bulk delete ---
    el.querySelector("#sf3pl-btn-bulk-delete")?.addEventListener("click", () => {
      void this.bulkDelete();
    });

    // --- Download raw content of selected ---
    el.querySelector("#sf3pl-btn-download-raw")?.addEventListener("click", () => {
      if (!this.state.selectedId) return;
      const rec = ContentDatabase.get(this.state.selectedId);
      if (rec) ContentExporter.downloadRawContent(rec);
    });

    // --- M3: Convert Selected ---
    el.querySelector("#sf3pl-btn-convert-selected")?.addEventListener("click", () => {
      void this.convertSelected();
    });

    // --- M3: Convert Category (category of the currently selected row) ---
    el.querySelector("#sf3pl-btn-convert-category")?.addEventListener("click", () => {
      void this.convertCurrentCategory();
    });

    // --- M3: Build Compendium (all records in current filter set) ---
    el.querySelector("#sf3pl-btn-build-compendium")?.addEventListener("click", () => {
      void this.buildCompendium();
    });

    // --- M3: Rebuild Compendium (all records, force overwrite) ---
    el.querySelector("#sf3pl-btn-rebuild-compendium")?.addEventListener("click", () => {
      void this.buildCompendium(true);
    });
  }

  // ── Private operations ────────────────────────────────────────────────────

  private async loadRecords(): Promise<void> {
    try {
      this.state.allRecords = ContentDatabase.getAll();
      this.state.loaded = true;
      ModuleLogger.info(`[ContentBrowser] Loaded ${this.state.allRecords.length} record(s).`);
    } catch (err: unknown) {
      ModuleLogger.error(`[ContentBrowser] Load failed: ${String(err)}`);
      this.state.allRecords = [];
      this.state.loaded = true;
    }
  }

  private exportJson(): void {
    const ids = [...this.state.selectedIds];
    const records = ids.length > 0
      ? this.state.allRecords.filter((r) => ids.includes(r.id))
      : ContentDatabase.query(this.state.filter, this.state.sort);

    ContentExporter.downloadJson(
      records,
      `sf3pl-export-${ids.length > 0 ? `${ids.length}-records` : "filtered"}.json`
    );
    ModuleLogger.info(`[ContentBrowser] Exported ${records.length} record(s) as JSON.`);
  }

  private exportCsv(): void {
    const ids = [...this.state.selectedIds];
    const records = ids.length > 0
      ? this.state.allRecords.filter((r) => ids.includes(r.id))
      : ContentDatabase.query(this.state.filter, this.state.sort);

    ContentExporter.downloadCsv(
      records,
      `sf3pl-export-${ids.length > 0 ? `${ids.length}-records` : "filtered"}.csv`
    );
    ModuleLogger.info(`[ContentBrowser] Exported ${records.length} record(s) as CSV.`);
  }

  private async deleteSelected(): Promise<void> {
    if (!this.state.selectedId) return;

    const rec = ContentDatabase.get(this.state.selectedId);
    if (!rec) return;

    const confirmed = await Dialog.confirm({
      title: "Delete Record",
      content: `<p>Delete "<strong>${rec.name}</strong>" from the database? This cannot be undone.</p>`,
    });

    if (!confirmed) return;

    await ContentDatabase.delete(this.state.selectedId);
    this.state.selectedId = null;
    this.state.allRecords = ContentDatabase.getAll();
    ui.notifications.info(`Deleted "${rec.name}".`);
    await this.render(true);
  }

  private async bulkDelete(): Promise<void> {
    const ids = [...this.state.selectedIds];
    if (ids.length === 0) return;

    const confirmed = await Dialog.confirm({
      title: "Bulk Delete",
      content: `<p>Delete <strong>${ids.length}</strong> selected record(s)? This cannot be undone.</p>`,
    });

    if (!confirmed) return;

    for (const id of ids) {
      await ContentDatabase.delete(id);
    }

    this.state.selectedIds.clear();
    if (this.state.selectedId && ids.includes(this.state.selectedId)) {
      this.state.selectedId = null;
    }
    this.state.allRecords = ContentDatabase.getAll();
    ui.notifications.info(`Deleted ${ids.length} record(s).`);
    await this.render(true);
  }

  private async saveNotes(): Promise<void> {
    if (!this.state.selectedId) return;

    const tags = this.state.tagsBuffer
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await ContentDatabase.updateNotesAndTags(
      this.state.selectedId,
      this.state.notesBuffer,
      tags
    );

    this.state.editingNotes = false;
    this.state.allRecords = ContentDatabase.getAll();
    ui.notifications.info("Notes and tags saved.");
    await this.render(true);
  }

  // ── M3: Conversion operations ─────────────────────────────────────────────

  private async convertSelected(): Promise<void> {
    const ids = [...this.state.selectedIds];
    if (ids.length === 0) {
      ui.notifications.warn("No records selected. Use the checkboxes to select records first.");
      return;
    }

    ui.notifications.info(`Converting ${ids.length} selected record(s)…`);
    const pipeline = new ConversionPipeline();
    const report = await pipeline.run({ recordIds: ids });
    this.openConversionReport(report);
  }

  private async convertCurrentCategory(): Promise<void> {
    if (!this.state.selectedId) {
      ui.notifications.warn("Select a record first to determine the category to convert.");
      return;
    }

    const rec = ContentDatabase.get(this.state.selectedId);
    if (!rec) return;

    ui.notifications.info(`Converting all "${CATEGORY_LABELS[rec.category]}" records…`);
    const pipeline = new ConversionPipeline();
    const report = await pipeline.run({ categories: [rec.category] });
    this.openConversionReport(report);
  }

  private async buildCompendium(forceRebuild = false): Promise<void> {
    const records = ContentDatabase.query(this.state.filter, this.state.sort);
    if (records.length === 0) {
      ui.notifications.warn("No records to convert. Import content first.");
      return;
    }

    const label = forceRebuild ? "Rebuilding" : "Building";
    ui.notifications.info(`${label} compendium for ${records.length} record(s)…`);

    const pipeline = new ConversionPipeline();
    const report = await pipeline.run({
      recordIds: records.map((r) => r.id),
      overwriteExisting: forceRebuild || true,
    });

    this.openConversionReport(report);
  }

  private openConversionReport(report: PipelineReport): void {
    import("./conversion-report.js")
      .then(({ ConversionReportApp }) => {
        void new ConversionReportApp(report).render(true);
      })
      .catch((err: unknown) => {
        ModuleLogger.error(`[ContentBrowser] Could not open ConversionReportApp: ${String(err)}`);
      });
  }
}

// Declare Dialog globally (Foundry global)
declare const Dialog: {
  confirm(options: { title: string; content: string }): Promise<boolean>;
};
