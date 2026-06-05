/**
 * Schema Cache — Milestone 4
 *
 * Persists discovered schemas to Foundry's settings API so they survive
 * page reloads. Maintains an in-memory cache for fast synchronous access.
 *
 * The cache is keyed by "documentType.subtype" (e.g. "Item.weapon").
 * Change detection uses the `schemaHash` field — if the hash differs from
 * the previously stored value, the schema is considered updated.
 *
 * Storage key: game.settings → "starfinder-thirdparty" → "schemaCache"
 */

import type { DiscoveredSchema } from "./schema-types.js";
import { makeSchemaKey } from "./schema-types.js";
import { ModuleLogger } from "../utils/logger.js";

const MODULE_ID = "starfinder-thirdparty";
const CACHE_SETTING_KEY = "schemaCache";
const CACHE_SCHEMA_VERSION = "4.0.0";

interface CachePayload {
  schemaVersion: string;
  systemId: string;
  savedAt: string;
  schemas: Record<string, DiscoveredSchema>;
}

export class SchemaCache {
  /** In-memory cache. Key = "DocumentType.subtype". */
  private static cache = new Map<string, DiscoveredSchema>();
  private static initialized = false;
  /** Set of keys whose hash changed since the last loaded cache. */
  private static changedKeys = new Set<string>();

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Loads persisted schemas into memory. Call once during `ready`. */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const raw = game.settings.get(MODULE_ID, CACHE_SETTING_KEY) as unknown;
      const payload = this.deserialize(raw);

      this.cache.clear();
      for (const [key, schema] of Object.entries(payload.schemas)) {
        this.cache.set(key, schema);
      }
      this.initialized = true;
      ModuleLogger.info(`[SchemaCache] Initialized with ${this.cache.size} cached schema(s).`);
    } catch (err: unknown) {
      ModuleLogger.warn(`[SchemaCache] Could not load cache: ${String(err)}. Starting fresh.`);
      this.cache.clear();
      this.initialized = true;
    }
  }

  /** Persists all in-memory schemas to Foundry settings. */
  static async persist(): Promise<void> {
    const schemas: Record<string, DiscoveredSchema> = {};
    for (const [key, schema] of this.cache) {
      schemas[key] = schema;
    }

    const payload: CachePayload = {
      schemaVersion: CACHE_SCHEMA_VERSION,
      systemId: (game as unknown as { system: { id: string } }).system?.id ?? "unknown",
      savedAt: new Date().toISOString(),
      schemas,
    };

    await game.settings.set(MODULE_ID, CACHE_SETTING_KEY, payload);
    ModuleLogger.info(`[SchemaCache] Persisted ${this.cache.size} schema(s).`);
  }

  /** Clears all cached schemas from memory and storage. */
  static async clear(): Promise<void> {
    this.cache.clear();
    this.changedKeys.clear();
    await game.settings.set(MODULE_ID, CACHE_SETTING_KEY, {
      schemaVersion: CACHE_SCHEMA_VERSION,
      systemId: "",
      savedAt: new Date().toISOString(),
      schemas: {},
    });
    ModuleLogger.info("[SchemaCache] Cache cleared.");
  }

  static reset(): void {
    this.cache.clear();
    this.changedKeys.clear();
    this.initialized = false;
  }

  // ── Read operations ───────────────────────────────────────────────────────

  static get(documentType: string, subtype: string): DiscoveredSchema | undefined {
    return this.cache.get(makeSchemaKey(documentType, subtype));
  }

  static getAll(): DiscoveredSchema[] {
    return [...this.cache.values()];
  }

  static has(documentType: string, subtype: string): boolean {
    return this.cache.has(makeSchemaKey(documentType, subtype));
  }

  /** Returns the set of keys that were updated during the last store() call. */
  static getChangedKeys(): Set<string> {
    return new Set(this.changedKeys);
  }

  // ── Write operations ──────────────────────────────────────────────────────

  /**
   * Stores a schema in the in-memory cache.
   * Detects hash changes and records them in `changedKeys`.
   * Does NOT automatically persist to settings — call `persist()` explicitly.
   */
  static store(schema: DiscoveredSchema): void {
    const key = makeSchemaKey(schema.documentType, schema.subtype);
    const existing = this.cache.get(key);

    if (existing && existing.schemaHash !== schema.schemaHash) {
      this.changedKeys.add(key);
      ModuleLogger.info(
        `[SchemaCache] Schema changed: ${key} ` +
        `(${existing.schemaHash} → ${schema.schemaHash})`
      );
    } else if (!existing) {
      this.changedKeys.add(key);
    }

    this.cache.set(key, schema);
  }

  /** Removes a schema from the in-memory cache. */
  static remove(documentType: string, subtype: string): void {
    this.cache.delete(makeSchemaKey(documentType, subtype));
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  private static deserialize(raw: unknown): CachePayload {
    const empty: CachePayload = {
      schemaVersion: CACHE_SCHEMA_VERSION,
      systemId: "",
      savedAt: new Date().toISOString(),
      schemas: {},
    };

    if (!raw || typeof raw !== "object") return empty;
    const payload = raw as Partial<CachePayload>;

    return {
      schemaVersion: payload.schemaVersion ?? CACHE_SCHEMA_VERSION,
      systemId: payload.systemId ?? "",
      savedAt: payload.savedAt ?? new Date().toISOString(),
      schemas: payload.schemas ?? {},
    };
  }
}
