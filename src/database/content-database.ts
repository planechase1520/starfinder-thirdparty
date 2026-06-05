/**
 * Content Database — Milestone 2
 *
 * Manages a world-scoped database of ContentRecord objects persisted
 * in Foundry's settings API. Maintains an in-memory cache for fast
 * synchronous reads while async writes go to the server.
 *
 * Storage key: game.settings → "starfinder-thirdparty" → "contentDatabase"
 *
 * Usage:
 *   await ContentDatabase.initialize();          // call once on ready
 *   await ContentDatabase.add(record);
 *   const all = ContentDatabase.getAll();
 *   const results = ContentDatabase.query({ categories: ["weapon"] });
 *   await ContentDatabase.delete(id);
 */

import type {
  ContentRecord,
  ContentFilter,
  SortConfig,
  SortField,
  SaveResult,
  ContentCategory,
} from "./content-record.js";
import { isValidCategory } from "./content-record.js";
import { ModuleLogger } from "../utils/logger.js";

const MODULE_ID = "starfinder-thirdparty";
const DB_SETTING_KEY = "contentDatabase";
const SCHEMA_VERSION = "2.0.0";

export class ContentDatabase {
  /** In-memory record store. Key = record.id. */
  private static cache = new Map<string, ContentRecord>();
  private static initialized = false;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Loads all records from Foundry settings into the in-memory cache.
   * Must be called once during the `ready` hook before any reads or writes.
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const raw = game.settings.get(MODULE_ID, DB_SETTING_KEY) as unknown;
      const records = this.deserializeRecords(raw);
      this.cache.clear();
      for (const rec of records) {
        this.cache.set(rec.id, rec);
      }
      this.initialized = true;
      ModuleLogger.info(`[ContentDatabase] Initialized with ${this.cache.size} records.`);
    } catch (err: unknown) {
      ModuleLogger.error(`[ContentDatabase] Failed to initialize: ${String(err)}`);
      this.cache.clear();
      this.initialized = true;
    }
  }

  /** Resets the in-memory cache (useful for testing). */
  static reset(): void {
    this.cache.clear();
    this.initialized = false;
  }

  // ── Read operations ──────────────────────────────────────────────────────

  /** Returns true once initialize() has been called. */
  static isReady(): boolean {
    return this.initialized;
  }

  /**
   * Returns all records as an array, sorted by name ascending by default.
   */
  static getAll(): ContentRecord[] {
    return [...this.cache.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Returns a single record by id, or undefined if not found.
   */
  static get(id: string): ContentRecord | undefined {
    return this.cache.get(id);
  }

  /**
   * Returns the first record whose name matches exactly (case-insensitive).
   */
  static getByName(name: string): ContentRecord | undefined {
    const lower = name.toLowerCase();
    for (const rec of this.cache.values()) {
      if (rec.name.toLowerCase() === lower) return rec;
    }
    return undefined;
  }

  /**
   * Returns true if any record in the database has the given name (case-insensitive).
   */
  static hasName(name: string): boolean {
    return this.getByName(name) !== undefined;
  }

  /** Returns the total number of records in the database. */
  static count(): number {
    return this.cache.size;
  }

  /** Returns counts broken down by category. */
  static countByCategory(): Record<ContentCategory, number> {
    const counts: Partial<Record<ContentCategory, number>> = {};
    for (const rec of this.cache.values()) {
      counts[rec.category] = (counts[rec.category] ?? 0) + 1;
    }
    return counts as Record<ContentCategory, number>;
  }

  // ── Query ────────────────────────────────────────────────────────────────

  /**
   * Filters and sorts the database. All active filter conditions are ANDed.
   * @param filter Optional filter criteria.
   * @param sort Optional sort configuration.
   */
  static query(filter?: ContentFilter, sort?: SortConfig): ContentRecord[] {
    let records = [...this.cache.values()];

    if (filter) {
      records = records.filter((rec) => this.matchesFilter(rec, filter));
    }

    const sortConfig: SortConfig = sort ?? { field: "name", ascending: true };
    records = this.applySorting(records, sortConfig);

    return records;
  }

  /**
   * Returns all unique values for a given field across all records.
   * Useful for populating filter dropdown options.
   */
  static getUniqueValues(field: "publisher" | "sourceBook" | "tags" | "importMethod"): string[] {
    const values = new Set<string>();
    for (const rec of this.cache.values()) {
      if (field === "tags") {
        for (const tag of rec.tags) values.add(tag);
      } else {
        const v = rec[field];
        if (typeof v === "string" && v !== "") values.add(v);
      }
    }
    return [...values].sort();
  }

  // ── Write operations ─────────────────────────────────────────────────────

  /**
   * Adds a single record to the database and persists to settings.
   * Throws if a record with the same name already exists (use addOrUpdate instead).
   */
  static async add(record: ContentRecord): Promise<void> {
    if (this.cache.has(record.id)) {
      throw new Error(`[ContentDatabase] Record with id '${record.id}' already exists.`);
    }
    this.cache.set(record.id, { ...record, schemaVersion: SCHEMA_VERSION });
    await this.persist();
  }

  /**
   * Updates an existing record. The record must already exist.
   */
  static async update(record: ContentRecord): Promise<void> {
    if (!this.cache.has(record.id)) {
      throw new Error(`[ContentDatabase] Record '${record.id}' not found for update.`);
    }
    this.cache.set(record.id, { ...record, schemaVersion: SCHEMA_VERSION });
    await this.persist();
  }

  /**
   * Adds a record if no record with that name exists; otherwise updates
   * the existing record by id (if found) or by name match.
   */
  static async addOrUpdate(record: ContentRecord): Promise<"added" | "updated"> {
    const existing = this.getByName(record.name);
    if (existing) {
      await this.update({ ...record, id: existing.id });
      return "updated";
    }
    await this.add(record);
    return "added";
  }

  /**
   * Deletes a record by id. No-op if the record does not exist.
   */
  static async delete(id: string): Promise<boolean> {
    if (!this.cache.has(id)) return false;
    this.cache.delete(id);
    await this.persist();
    ModuleLogger.info(`[ContentDatabase] Deleted record: ${id}`);
    return true;
  }

  /**
   * Deletes all records from the database.
   */
  static async deleteAll(): Promise<void> {
    this.cache.clear();
    await this.persist();
    ModuleLogger.info("[ContentDatabase] All records deleted.");
  }

  /**
   * Updates only the `notes` and `tags` fields of an existing record.
   * Used by the Content Browser's quick-edit panel.
   */
  static async updateNotesAndTags(id: string, notes: string, tags: string[]): Promise<void> {
    const rec = this.cache.get(id);
    if (!rec) throw new Error(`[ContentDatabase] Record '${id}' not found.`);
    this.cache.set(id, { ...rec, notes, tags });
    await this.persist();
  }

  // ── Batch import ─────────────────────────────────────────────────────────

  /**
   * Imports a batch of records into the database in a single settings write.
   * Checks for duplicate names and respects the overwrite flag.
   *
   * @param records Records to import.
   * @param overwriteDuplicates When true, existing records with matching names are overwritten.
   */
  static async importBatch(
    records: ContentRecord[],
    overwriteDuplicates = false
  ): Promise<SaveResult> {
    const result: SaveResult = {
      added: [],
      skipped: [],
      overwritten: [],
      failed: [],
    };

    for (const record of records) {
      try {
        const existing = this.getByName(record.name);
        if (existing) {
          if (overwriteDuplicates) {
            const updated = { ...record, id: existing.id, schemaVersion: SCHEMA_VERSION };
            this.cache.set(existing.id, updated);
            result.overwritten.push(updated);
          } else {
            result.skipped.push(record.name);
          }
        } else {
          const newRecord = { ...record, schemaVersion: SCHEMA_VERSION };
          this.cache.set(newRecord.id, newRecord);
          result.added.push(newRecord);
        }
      } catch (err: unknown) {
        result.failed.push({ name: record.name, reason: String(err) });
      }
    }

    // Single persist call for the whole batch
    await this.persist();

    ModuleLogger.info(
      `[ContentDatabase] Batch import: +${result.added.length} added, ` +
      `${result.overwritten.length} overwritten, ${result.skipped.length} skipped, ` +
      `${result.failed.length} failed.`
    );

    return result;
  }

  // ── Serialization / Persistence ──────────────────────────────────────────

  /**
   * Writes the current in-memory cache to Foundry settings.
   * This is an async operation that round-trips to the Foundry server.
   */
  private static async persist(): Promise<void> {
    const records = [...this.cache.values()];
    await game.settings.set(MODULE_ID, DB_SETTING_KEY, records);
    ModuleLogger.debug(`[ContentDatabase] Persisted ${records.length} records to settings.`);
  }

  /**
   * Deserializes raw settings data into typed ContentRecord objects.
   * Handles missing/extra fields gracefully for forward/backward compatibility.
   */
  private static deserializeRecords(raw: unknown): ContentRecord[] {
    if (!Array.isArray(raw)) return [];

    const records: ContentRecord[] = [];
    for (const item of raw) {
      if (typeof item !== "object" || item === null) continue;
      const obj = item as Record<string, unknown>;

      // Validate and normalize category
      const category = isValidCategory(obj["category"])
        ? obj["category"]
        : "equipment" as ContentCategory;

      records.push({
        id: typeof obj["id"] === "string" ? obj["id"] : this.generateId(),
        name: typeof obj["name"] === "string" ? obj["name"] : "Unknown",
        category,
        sourceBook: typeof obj["sourceBook"] === "string" ? obj["sourceBook"] : "",
        publisher: typeof obj["publisher"] === "string" ? obj["publisher"] : "",
        author: typeof obj["author"] === "string" ? obj["author"] : "",
        pageNumber: typeof obj["pageNumber"] === "number" ? obj["pageNumber"] : 0,
        tags: Array.isArray(obj["tags"]) ? (obj["tags"] as string[]) : [],
        notes: typeof obj["notes"] === "string" ? obj["notes"] : "",
        rawContent: typeof obj["rawContent"] === "object" && obj["rawContent"] !== null
          ? (obj["rawContent"] as Record<string, unknown>)
          : {},
        importedDate: typeof obj["importedDate"] === "string"
          ? obj["importedDate"]
          : new Date().toISOString(),
        importMethod: (["json", "csv", "txt", "paste"] as const).includes(obj["importMethod"] as never)
          ? (obj["importMethod"] as ContentRecord["importMethod"])
          : "json",
        schemaVersion: typeof obj["schemaVersion"] === "string" ? obj["schemaVersion"] : SCHEMA_VERSION,
      });
    }

    return records;
  }

  // ── Filter / Sort helpers ─────────────────────────────────────────────────

  private static matchesFilter(rec: ContentRecord, filter: ContentFilter): boolean {
    if (filter.searchText) {
      const needle = filter.searchText.toLowerCase();
      const inName = rec.name.toLowerCase().includes(needle);
      const inTags = rec.tags.some((t) => t.toLowerCase().includes(needle));
      const inNotes = rec.notes.toLowerCase().includes(needle);
      const inSource = rec.sourceBook.toLowerCase().includes(needle);
      if (!inName && !inTags && !inNotes && !inSource) return false;
    }
    if (filter.categories && filter.categories.length > 0) {
      if (!filter.categories.includes(rec.category)) return false;
    }
    if (filter.publishers && filter.publishers.length > 0) {
      if (!filter.publishers.includes(rec.publisher)) return false;
    }
    if (filter.sourceBooks && filter.sourceBooks.length > 0) {
      if (!filter.sourceBooks.includes(rec.sourceBook)) return false;
    }
    if (filter.tags && filter.tags.length > 0) {
      const recTagSet = new Set(rec.tags);
      if (!filter.tags.every((t) => recTagSet.has(t))) return false;
    }
    if (filter.importMethod) {
      if (rec.importMethod !== filter.importMethod) return false;
    }
    return true;
  }

  private static applySorting(records: ContentRecord[], sort: SortConfig): ContentRecord[] {
    const { field, ascending } = sort;
    return [...records].sort((a, b) => {
      let aVal: string;
      let bVal: string;
      switch (field as SortField) {
        case "category": aVal = a.category; bVal = b.category; break;
        case "sourceBook": aVal = a.sourceBook; bVal = b.sourceBook; break;
        case "publisher": aVal = a.publisher; bVal = b.publisher; break;
        case "importedDate": aVal = a.importedDate; bVal = b.importedDate; break;
        default: aVal = a.name; bVal = b.name;
      }
      const cmp = aVal.localeCompare(bVal);
      return ascending ? cmp : -cmp;
    });
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  /**
   * Generates a random ID string for a new record.
   * Uses foundry.utils.randomID when available, falls back to crypto.
   */
  static generateId(): string {
    if (typeof foundry !== "undefined" && foundry?.utils?.randomID) {
      return foundry.utils.randomID(16);
    }
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }

  /**
   * Builds a ContentRecord from a raw data object (e.g. from a parser).
   * Fills in defaults for any missing fields.
   */
  static buildRecord(
    raw: Record<string, unknown>,
    category: ContentCategory,
    importMethod: ContentRecord["importMethod"],
    metadataOverrides?: Partial<Pick<ContentRecord, "sourceBook" | "publisher" | "author" | "pageNumber" | "tags" | "notes">>
  ): ContentRecord {
    return {
      id: this.generateId(),
      name: typeof raw["name"] === "string" ? raw["name"] : "Unnamed",
      category,
      sourceBook: metadataOverrides?.sourceBook ?? (typeof raw["sourceBook"] === "string" ? raw["sourceBook"] : ""),
      publisher: metadataOverrides?.publisher ?? (typeof raw["publisher"] === "string" ? raw["publisher"] : ""),
      author: metadataOverrides?.author ?? (typeof raw["author"] === "string" ? raw["author"] : ""),
      pageNumber: metadataOverrides?.pageNumber ?? (typeof raw["pageNumber"] === "number" ? raw["pageNumber"] : 0),
      tags: metadataOverrides?.tags ?? (Array.isArray(raw["tags"]) ? (raw["tags"] as string[]) : []),
      notes: metadataOverrides?.notes ?? (typeof raw["notes"] === "string" ? raw["notes"] : ""),
      rawContent: raw,
      importedDate: new Date().toISOString(),
      importMethod,
      schemaVersion: SCHEMA_VERSION,
    };
  }
}
