/**
 * Content Browser Application
 *
 * A Foundry V13 ApplicationV2 window that displays all SF3PL-imported
 * content with full search, filter, sort, and tagging support.
 *
 * The browser loads all documents from the SF3PL compendium packs and
 * builds a filterable/sortable in-memory index on first open.
 */

import type { BrowseEntry, BrowseFilter, ContentType } from "../types/module-types.js";
import { CompendiumManager } from "../compendium/compendium-manager.js";
import { MetadataManager } from "../metadata/metadata-manager.js";
import { ModuleLogger } from "../utils/logger.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type SortField = "name" | "publisher" | "sourceBook" | "contentType";

interface BrowserState {
  loaded: boolean;
  allEntries: BrowseEntry[];
  filter: BrowseFilter;
  sortBy: SortField;
  sortAscending: boolean;
  selectedEntry: BrowseEntry | null;
}

export class ContentBrowserApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: "sf3pl-content-browser",
    title: "SF3PL: Content Browser",
    classes: ["sf3pl-app", "sf3pl-content-browser"],
    window: { resizable: true },
    position: { width: 900, height: 650 },
  };

  static override PARTS = {
    main: { template: "modules/starfinder-thirdparty/templates/content-browser.hbs" },
  };

  private state: BrowserState = {
    loaded: false,
    allEntries: [],
    filter: {},
    sortBy: "name",
    sortAscending: true,
    selectedEntry: null,
  };

  // -------------------------------------------------------------------------
  // ApplicationV2 lifecycle
  // -------------------------------------------------------------------------

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.state.loaded) {
      await this.loadEntries();
    }

    const filtered = MetadataManager.applyFilter(this.state.allEntries, this.state.filter);
    const sorted = MetadataManager.sortEntries(filtered, this.state.sortBy, this.state.sortAscending);

    // Unique filter options
    const publishers = MetadataManager.getUniqueValues(this.state.allEntries, "publisher");
    const sourceBooks = MetadataManager.getUniqueValues(this.state.allEntries, "sourceBook");
    const tags = MetadataManager.getUniqueValues(this.state.allEntries, "tags");

    const contentTypes: { value: ContentType; label: string }[] = [
      { value: "weapon", label: "Weapons" },
      { value: "armor", label: "Armor" },
      { value: "equipment", label: "Equipment" },
      { value: "augmentation", label: "Augmentations" },
      { value: "feat", label: "Feats" },
      { value: "spell", label: "Spells" },
      { value: "race", label: "Species" },
      { value: "theme", label: "Themes" },
      { value: "class", label: "Classes" },
      { value: "archetypeFeature", label: "Archetypes" },
      { value: "npc", label: "NPCs" },
      { value: "vehicle", label: "Vehicles" },
      { value: "starship", label: "Starships" },
      { value: "hazard", label: "Hazards" },
      { value: "journal", label: "Journals" },
    ];

    return {
      loaded: this.state.loaded,
      totalCount: this.state.allEntries.length,
      filteredCount: sorted.length,
      entries: sorted.map((e) => ({
        ...e,
        typeLabel: this.humanizeContentType(e.contentType),
        typeIcon: this.getTypeIcon(e.contentType),
        isSelected: this.state.selectedEntry?.id === e.id,
      })),
      filter: {
        searchText: this.state.filter.searchText ?? "",
        activeContentTypes: this.state.filter.contentTypes ?? [],
        activePublishers: this.state.filter.publishers ?? [],
        activeSourceBooks: this.state.filter.sourceBooks ?? [],
        activeTags: this.state.filter.tags ?? [],
      },
      filterOptions: {
        contentTypes,
        publishers: publishers.map((p) => ({ value: p, label: p })),
        sourceBooks: sourceBooks.map((s) => ({ value: s, label: s })),
        tags: tags.map((t) => ({ value: t, label: t })),
      },
      sort: {
        field: this.state.sortBy,
        ascending: this.state.sortAscending,
      },
      selectedEntry: this.state.selectedEntry ? {
        ...this.state.selectedEntry,
        typeLabel: this.humanizeContentType(this.state.selectedEntry.contentType),
        tagsDisplay: this.state.selectedEntry.metadata.tags.join(", ") || "—",
        importDate: new Date(this.state.selectedEntry.metadata.importDate).toLocaleDateString(),
      } : null,
    };
  }

  override _onRender(_context: Record<string, unknown>, _options: Record<string, unknown>): void {
    const el = this.element;
    if (!el) return;

    // Search input
    const searchInput = el.querySelector<HTMLInputElement>("#sf3pl-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        this.state.filter.searchText = searchInput.value;
        void this.render(true);
      });
    }

    // Content type filter checkboxes
    el.querySelectorAll<HTMLInputElement>(".sf3pl-filter-type").forEach((cb) => {
      cb.addEventListener("change", () => {
        const selectedTypes = [...el.querySelectorAll<HTMLInputElement>(".sf3pl-filter-type:checked")]
          .map((c) => c.value as ContentType);
        this.state.filter.contentTypes = selectedTypes.length > 0 ? selectedTypes : undefined;
        void this.render(true);
      });
    });

    // Publisher filter
    const publisherSelect = el.querySelector<HTMLSelectElement>("#sf3pl-filter-publisher");
    if (publisherSelect) {
      publisherSelect.addEventListener("change", () => {
        this.state.filter.publishers = publisherSelect.value ? [publisherSelect.value] : undefined;
        void this.render(true);
      });
    }

    // Source book filter
    const sourceBookSelect = el.querySelector<HTMLSelectElement>("#sf3pl-filter-sourcebook");
    if (sourceBookSelect) {
      sourceBookSelect.addEventListener("change", () => {
        this.state.filter.sourceBooks = sourceBookSelect.value ? [sourceBookSelect.value] : undefined;
        void this.render(true);
      });
    }

    // Sort headers
    el.querySelectorAll<HTMLElement>("[data-sort-field]").forEach((header) => {
      header.addEventListener("click", () => {
        const field = header.dataset["sortField"] as SortField;
        if (this.state.sortBy === field) {
          this.state.sortAscending = !this.state.sortAscending;
        } else {
          this.state.sortBy = field;
          this.state.sortAscending = true;
        }
        void this.render(true);
      });
    });

    // Entry row click → show detail
    el.querySelectorAll<HTMLElement>(".sf3pl-entry-row").forEach((row) => {
      row.addEventListener("click", () => {
        const entryId = row.dataset["entryId"];
        this.state.selectedEntry = this.state.allEntries.find((e) => e.id === entryId) ?? null;
        void this.render(true);
      });
    });

    // Open in compendium button
    el.querySelector("#sf3pl-btn-open-pack")?.addEventListener("click", () => {
      this.openInCompendium();
    });

    // Refresh button
    el.querySelector("#sf3pl-btn-refresh")?.addEventListener("click", () => {
      this.state.loaded = false;
      void this.render(true);
    });

    // Clear filter button
    el.querySelector("#sf3pl-btn-clear-filter")?.addEventListener("click", () => {
      this.state.filter = {};
      void this.render(true);
    });
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async loadEntries(): Promise<void> {
    try {
      this.state.allEntries = await CompendiumManager.getAllImportedDocuments();
      this.state.loaded = true;
      ModuleLogger.info(`[ContentBrowser] Loaded ${this.state.allEntries.length} entries.`);
    } catch (err: unknown) {
      ModuleLogger.error(`[ContentBrowser] Failed to load entries: ${String(err)}`);
      this.state.loaded = true;
    }
  }

  private openInCompendium(): void {
    if (!this.state.selectedEntry) return;
    const packId = `starfinder-thirdparty.sftpl-${this.state.selectedEntry.contentType}s`;
    const pack = game.packs.get(packId) as { render?: (force: boolean) => void } | undefined;
    if (pack?.render) {
      pack.render(true);
    } else {
      ui.notifications.warn("Could not open compendium pack.");
    }
  }

  private humanizeContentType(type: ContentType): string {
    const labels: Record<ContentType, string> = {
      weapon: "Weapon", armor: "Armor", equipment: "Equipment",
      augmentation: "Augmentation", feat: "Feat", spell: "Spell",
      race: "Species", theme: "Theme", class: "Class",
      archetypeFeature: "Archetype", npc: "NPC", vehicle: "Vehicle",
      starship: "Starship", hazard: "Hazard", journal: "Journal",
    };
    return labels[type] ?? type;
  }

  private getTypeIcon(type: ContentType): string {
    const icons: Record<ContentType, string> = {
      weapon: "fa-sword", armor: "fa-shield-halved", equipment: "fa-toolbox",
      augmentation: "fa-microchip", feat: "fa-star", spell: "fa-wand-sparkles",
      race: "fa-person", theme: "fa-masks-theater", class: "fa-graduation-cap",
      archetypeFeature: "fa-puzzle-piece", npc: "fa-user-secret", vehicle: "fa-car",
      starship: "fa-rocket", hazard: "fa-triangle-exclamation", journal: "fa-book-open",
    };
    return icons[type] ?? "fa-box";
  }
}
