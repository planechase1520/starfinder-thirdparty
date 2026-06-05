/**
 * Template Store — Milestone 4
 *
 * Stores and retrieves user-selected DocumentTemplate entries in Foundry
 * world settings. Templates are used by the Template Manager UI and by
 * SchemaDiscovery.discoverFromTemplate() to learn Starfinder field structures
 * without depending solely on hard-coded mappings.
 *
 * Storage key: game.settings → "starfinder-thirdparty" → "documentTemplates"
 *
 * Lifecycle:
 *   1. TemplateStore.initialize() is called in the `ready` hook.
 *   2. Users register templates via the Template Manager UI.
 *   3. RepairEngine reads templates to fill missing rawContent fields.
 *   4. SchemaDiscovery.discoverFromTemplate() learns field paths from snapshots.
 */

import type { DocumentTemplate } from "./schema-types.js";
import { ModuleLogger } from "../utils/logger.js";

const MODULE_ID = "starfinder-thirdparty";
const SETTING_KEY = "documentTemplates";
const SCHEMA_VERSION = "4.0.0";

// ── Storage payload ───────────────────────────────────────────────────────────

interface TemplatePayload {
  schemaVersion: string;
  savedAt: string;
  templates: DocumentTemplate[];
}

// ── TemplateStore ─────────────────────────────────────────────────────────────

export class TemplateStore {
  /** In-memory map keyed by document UUID. */
  private static readonly templates = new Map<string, DocumentTemplate>();
  private static initialized = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Loads persisted templates into memory. Call once during `ready`. */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const raw = game.settings.get(MODULE_ID, SETTING_KEY) as unknown;
      const payload = this.deserialize(raw);

      this.templates.clear();
      for (const tpl of payload.templates) {
        this.templates.set(tpl.uuid, tpl);
      }
      this.initialized = true;
      ModuleLogger.info(`[TemplateStore] Loaded ${this.templates.size} template(s).`);
    } catch (err: unknown) {
      ModuleLogger.warn(
        `[TemplateStore] Could not load templates: ${String(err)}. Starting fresh.`
      );
      this.templates.clear();
      this.initialized = true;
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Adds or replaces a template entry and persists to settings.
   * If a template with the same UUID already exists, it is overwritten.
   */
  static async add(template: DocumentTemplate): Promise<void> {
    this.templates.set(template.uuid, template);
    await this.persist();
    ModuleLogger.info(
      `[TemplateStore] Registered template: ${template.name} (${template.subtype})`
    );
  }

  /** Removes the template with the given UUID and persists. */
  static async remove(uuid: string): Promise<void> {
    if (!this.templates.has(uuid)) return;
    const name = this.templates.get(uuid)?.name ?? uuid;
    this.templates.delete(uuid);
    await this.persist();
    ModuleLogger.info(`[TemplateStore] Removed template: ${name}`);
  }

  /** Returns a single template by UUID, or undefined if not registered. */
  static get(uuid: string): DocumentTemplate | undefined {
    return this.templates.get(uuid);
  }

  /**
   * Returns all registered templates, sorted by subtype then name.
   * Safe to call before initialize() — returns an empty array.
   */
  static getAll(): DocumentTemplate[] {
    return [...this.templates.values()].sort(
      (a, b) => a.subtype.localeCompare(b.subtype) || a.name.localeCompare(b.name)
    );
  }

  /**
   * Returns the first template registered for the given document subtype,
   * or undefined if none exists. Used by RepairEngine to load defaults.
   */
  static getBySubtype(subtype: string): DocumentTemplate | undefined {
    for (const tpl of this.templates.values()) {
      if (tpl.subtype === subtype) return tpl;
    }
    return undefined;
  }

  /** Returns all unique subtypes that have a registered template. */
  static getSubtypes(): string[] {
    return [...new Set([...this.templates.values()].map((t) => t.subtype))].sort();
  }

  /** Total number of registered templates. */
  static count(): number {
    return this.templates.size;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /** Writes all in-memory templates to Foundry world settings. */
  static async persist(): Promise<void> {
    const payload: TemplatePayload = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      templates: [...this.templates.values()],
    };

    await game.settings.set(MODULE_ID, SETTING_KEY, payload);
    ModuleLogger.info(`[TemplateStore] Persisted ${this.templates.size} template(s).`);
  }

  /** Clears all templates from memory and storage. */
  static async clear(): Promise<void> {
    this.templates.clear();
    await this.persist();
    ModuleLogger.info("[TemplateStore] All templates cleared.");
  }

  // ── Deserialization ───────────────────────────────────────────────────────

  private static deserialize(raw: unknown): TemplatePayload {
    if (
      typeof raw === "object" &&
      raw !== null &&
      Array.isArray((raw as Record<string, unknown>).templates)
    ) {
      return raw as TemplatePayload;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      templates: [],
    };
  }

  // ── Factory helper ────────────────────────────────────────────────────────

  /**
   * Creates a DocumentTemplate from a live Foundry document.
   * Captures the full system data snapshot at the time of registration.
   *
   * @param doc   A live Item, Actor, or JournalEntry document.
   * @param notes Optional user notes.
   */
  static fromDocument(
    doc: { uuid: string; name: string; type: string; system: unknown },
    notes = ""
  ): DocumentTemplate {
    const documentType = this.detectDocumentType(doc);
    return {
      uuid: doc.uuid,
      name: doc.name,
      documentType,
      subtype: doc.type,
      systemDataSnapshot: (doc.system as Record<string, unknown>) ?? {},
      addedAt: new Date().toISOString(),
      notes,
    };
  }

  private static detectDocumentType(
    doc: { uuid: string }
  ): "Item" | "Actor" | "JournalEntry" {
    const uuid = doc.uuid;
    if (uuid.includes(".Item.") || uuid.startsWith("Item.")) return "Item";
    if (uuid.includes(".Actor.") || uuid.startsWith("Actor.")) return "Actor";
    if (uuid.includes(".JournalEntry.") || uuid.startsWith("JournalEntry.")) return "JournalEntry";
    return "Item";
  }
}
