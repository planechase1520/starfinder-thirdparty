/**
 * Schema Registry — Milestone 4
 *
 * Central registry that holds all discovered schemas for the current game
 * system. Coordinates SchemaDiscovery (live scan), SchemaCache (persistence),
 * and SchemaReporter (diff generation).
 *
 * Lifecycle:
 *   1. SchemaRegistry.initialize() is called in the `ready` hook.
 *   2. It loads the persisted cache, then runs a live scan.
 *   3. Changed schemas (detected via hash comparison) are logged/reported.
 *   4. All subsequent systems use SchemaRegistry.get() synchronously.
 */

import type { DiscoveredSchema, SchemaDiff } from "./schema-types.js";
import { makeSchemaKey } from "./schema-types.js";
import { SchemaDiscovery } from "./SchemaDiscovery.js";
import { SchemaCache } from "./SchemaCache.js";
import { ModuleLogger } from "../utils/logger.js";

export class SchemaRegistry {
  /** In-memory live schemas (may differ from cache after a system update). */
  private static live = new Map<string, DiscoveredSchema>();
  /** Schema diffs generated during the last scan. */
  private static lastDiffs: SchemaDiff[] = [];
  private static initialized = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Initializes the registry:
   *   1. Load persisted cache.
   *   2. Run live schema scan.
   *   3. Detect changes, update cache, persist.
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    await SchemaCache.initialize();

    const diffs = await this.scanAll();
    this.lastDiffs = diffs;

    if (diffs.length > 0) {
      ModuleLogger.info(
        `[SchemaRegistry] ${diffs.length} schema change(s) detected since last session.`
      );
      await SchemaCache.persist();
    }

    this.initialized = true;
    ModuleLogger.info(
      `[SchemaRegistry] Ready. ${this.live.size} schema(s) in registry.`
    );
  }

  /**
   * Forces a full re-scan of all document types. Updates the cache and
   * returns an array of diffs (one per changed schema).
   */
  static async rescan(): Promise<SchemaDiff[]> {
    ModuleLogger.info("[SchemaRegistry] Rescanning all document schemas…");
    const diffs = await this.scanAll();
    this.lastDiffs = diffs;
    await SchemaCache.persist();
    ModuleLogger.info(`[SchemaRegistry] Rescan complete. ${diffs.length} change(s).`);
    return diffs;
  }

  // ── Read operations ───────────────────────────────────────────────────────

  static get(documentType: string, subtype: string): DiscoveredSchema | undefined {
    return this.live.get(makeSchemaKey(documentType, subtype));
  }

  static getAll(): DiscoveredSchema[] {
    return [...this.live.values()];
  }

  static has(documentType: string, subtype: string): boolean {
    return this.live.has(makeSchemaKey(documentType, subtype));
  }

  /** Returns all schema diffs from the most recent scan. */
  static getLastDiffs(): SchemaDiff[] {
    return [...this.lastDiffs];
  }

  /** Returns all registered Item subtypes with available schemas. */
  static getItemSubtypes(): string[] {
    return [...this.live.values()]
      .filter((s) => s.documentType === "Item")
      .map((s) => s.subtype);
  }

  /** Returns all registered Actor subtypes with available schemas. */
  static getActorSubtypes(): string[] {
    return [...this.live.values()]
      .filter((s) => s.documentType === "Actor")
      .map((s) => s.subtype);
  }

  // ── Write operations ──────────────────────────────────────────────────────

  /**
   * Registers a schema from a user-selected template document.
   * Overwrites any existing schema for the same document type + subtype.
   */
  static async registerTemplate(schema: DiscoveredSchema): Promise<void> {
    const key = makeSchemaKey(schema.documentType, schema.subtype);
    this.live.set(key, schema);
    SchemaCache.store(schema);
    await SchemaCache.persist();
    ModuleLogger.info(`[SchemaRegistry] Template schema registered for ${key}.`);
  }

  // ── Private implementation ────────────────────────────────────────────────

  private static async scanAll(): Promise<SchemaDiff[]> {
    const diffs: SchemaDiff[] = [];

    const itemSchemas  = SchemaDiscovery.discoverAll("Item");
    const actorSchemas = SchemaDiscovery.discoverAll("Actor");

    for (const schema of [...itemSchemas, ...actorSchemas]) {
      const key = makeSchemaKey(schema.documentType, schema.subtype);
      const previous = SchemaCache.get(schema.documentType, schema.subtype);

      if (previous && previous.schemaHash !== schema.schemaHash) {
        diffs.push(buildDiff(previous, schema));
      }

      this.live.set(key, schema);
      SchemaCache.store(schema);
    }

    return diffs;
  }
}

// ── Diff builder ──────────────────────────────────────────────────────────────

function buildDiff(prev: DiscoveredSchema, curr: DiscoveredSchema): SchemaDiff {
  const prevPaths = new Map(prev.fields.map((f) => [f.path, f]));
  const currPaths = new Map(curr.fields.map((f) => [f.path, f]));

  const addedFields: string[] = [];
  const removedFields: string[] = [];
  const changedTypes: SchemaDiff["changedTypes"] = [];
  const newlyRequired: string[] = [];

  for (const [path, currField] of currPaths) {
    const prevField = prevPaths.get(path);
    if (!prevField) {
      addedFields.push(path);
    } else {
      if (prevField.type !== currField.type) {
        changedTypes.push({ path, from: prevField.type, to: currField.type });
      }
      if (!prevField.required && currField.required) {
        newlyRequired.push(path);
      }
    }
  }

  for (const path of prevPaths.keys()) {
    if (!currPaths.has(path)) removedFields.push(path);
  }

  return {
    systemId: curr.systemId,
    documentType: curr.documentType,
    subtype: curr.subtype,
    previousHash: prev.schemaHash,
    currentHash: curr.schemaHash,
    addedFields,
    removedFields,
    changedTypes,
    newlyRequired,
    comparedAt: new Date().toISOString(),
    isCompatible: addedFields.length === 0 && removedFields.length === 0 &&
                  changedTypes.length === 0 && newlyRequired.length === 0,
  };
}
