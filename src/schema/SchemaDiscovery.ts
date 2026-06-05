/**
 * Schema Discovery Engine — Milestone 4
 *
 * Inspects the live Foundry game system to extract document field schemas.
 * Uses three strategies in descending order of authority:
 *
 *   1. DataModel inspection  — Foundry V10+ DataModel classes expose a
 *      `schema` property (SchemaField) with full field definitions.
 *
 *   2. System model (legacy) — `game.system.model.Item[subtype]` holds
 *      template.json data (SFRPG and many older systems use this approach).
 *
 *   3. Document inspection   — Examine actual document instances from
 *      `game.items`, `game.actors`, or a compendium pack.
 *
 * All strategies produce a DiscoveredSchema with full field paths, inferred
 * types, and where possible required/default information.
 */

import type {
  DiscoveredSchema,
  DiscoveredField,
  FieldDataType,
  SchemaSource,
} from "./schema-types.js";
import { hashFieldPaths } from "./schema-types.js";
import { ModuleLogger } from "../utils/logger.js";

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Maps a JavaScript value to a FieldDataType string. */
function inferType(value: unknown): FieldDataType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "string":  return "string";
    case "number":  return "number";
    case "boolean": return "boolean";
    case "object":  return "object";
    default:        return "unknown";
  }
}

/**
 * Recursively extracts flat field descriptors from an arbitrary object.
 * Arrays are treated as typed containers — we inspect element 0 when present.
 *
 * @param obj        The object (system data or nested sub-object).
 * @param prefix     Dot-path prefix accumulated during recursion.
 * @param maxDepth   Stop recursing beyond this depth to avoid blowup.
 */
function extractFieldsFromObject(
  obj: Record<string, unknown>,
  prefix = "",
  maxDepth = 6
): DiscoveredField[] {
  if (maxDepth <= 0 || typeof obj !== "object" || obj === null) return [];

  const fields: DiscoveredField[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const type = inferType(value);

    const field: DiscoveredField = {
      path,
      type,
      required: false,
      nullable: value === null,
      defaultValue: value,
    };

    if (type === "object" && value !== null) {
      field.children = extractFieldsFromObject(
        value as Record<string, unknown>,
        path,
        maxDepth - 1
      );
      fields.push(field, ...field.children);
    } else if (type === "array" && Array.isArray(value) && value.length > 0) {
      const element = value[0];
      if (typeof element === "object" && element !== null && !Array.isArray(element)) {
        field.children = extractFieldsFromObject(
          element as Record<string, unknown>,
          `${path}[0]`,
          maxDepth - 1
        );
        fields.push(field, ...field.children);
      } else {
        fields.push(field);
      }
    } else {
      fields.push(field);
    }
  }

  return fields;
}

/**
 * Attempts to extract fields from a Foundry V10+ DataModel schema.
 * Returns null if the DataModel pattern is not available.
 */
function extractFromDataModel(
  modelClass: unknown
): DiscoveredField[] | null {
  if (!modelClass || typeof modelClass !== "function") return null;

  try {
    const cls = modelClass as { schema?: { fields?: Record<string, unknown> } };
    if (!cls.schema || !cls.schema.fields) return null;

    const fields: DiscoveredField[] = [];
    processDataModelFields(cls.schema.fields, "", fields);
    return fields.length > 0 ? fields : null;
  } catch {
    return null;
  }
}

/** Recurses into a SchemaField.fields map to produce DiscoveredField list. */
function processDataModelFields(
  fieldMap: Record<string, unknown>,
  prefix: string,
  out: DiscoveredField[]
): void {
  for (const [key, fieldDef] of Object.entries(fieldMap)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const fd = fieldDef as Record<string, unknown>;

    const type = inferDataModelType(fd);
    const required = Boolean(fd["required"]);
    const nullable = Boolean(fd["nullable"]);
    const defaultValue = fd["initial"] ?? fd["default"] ?? null;
    const label = typeof fd["label"] === "string" ? fd["label"] : undefined;
    const choices = extractChoices(fd);

    const field: DiscoveredField = { path, type, required, nullable, defaultValue, label, choices };
    out.push(field);

    // Recurse into SchemaField children
    if (fd["fields"] && typeof fd["fields"] === "object") {
      processDataModelFields(
        fd["fields"] as Record<string, unknown>,
        path,
        out
      );
    }

    // Recurse into ArrayField's element model
    if (fd["element"] && typeof fd["element"] === "object") {
      const elem = fd["element"] as Record<string, unknown>;
      if (elem["fields"] && typeof elem["fields"] === "object") {
        processDataModelFields(
          elem["fields"] as Record<string, unknown>,
          `${path}[0]`,
          out
        );
      }
    }
  }
}

function inferDataModelType(fd: Record<string, unknown>): FieldDataType {
  const constructor = (fd as { constructor?: { name?: string } }).constructor?.name ?? "";
  if (constructor.includes("String"))  return "string";
  if (constructor.includes("Number") || constructor.includes("Integer")) return "number";
  if (constructor.includes("Boolean")) return "boolean";
  if (constructor.includes("Array"))   return "array";
  if (constructor.includes("Object") || constructor.includes("Schema")) return "object";
  return "unknown";
}

function extractChoices(fd: Record<string, unknown>): string[] | undefined {
  const choices = fd["choices"];
  if (!choices) return undefined;
  if (Array.isArray(choices)) return (choices as unknown[]).map(String);
  if (typeof choices === "object" && choices !== null) {
    return Object.keys(choices as Record<string, unknown>);
  }
  return undefined;
}

// ── SchemaDiscovery class ─────────────────────────────────────────────────────

export class SchemaDiscovery {
  /**
   * Discovers the schema for a single document subtype.
   * Tries strategies in order: DataModel → system.model → document inspection.
   *
   * @param documentType "Item" | "Actor" | "JournalEntry"
   * @param subtype      The SFRPG type string, e.g. "weapon", "npc2"
   */
  static discoverSchema(
    documentType: "Item" | "Actor" | "JournalEntry",
    subtype: string
  ): DiscoveredSchema | null {
    ModuleLogger.debug(`[SchemaDiscovery] Discovering ${documentType}.${subtype}`);

    let fields: DiscoveredField[] | null = null;
    let source: SchemaSource = "document-inspection";

    // Strategy 1: DataModel
    fields = this.tryDataModel(documentType, subtype);
    if (fields) {
      source = "datamodel";
      ModuleLogger.debug(`[SchemaDiscovery] ${documentType}.${subtype} → DataModel (${fields.length} fields)`);
    }

    // Strategy 2: game.system.model (legacy template.json)
    if (!fields) {
      fields = this.trySystemModel(documentType, subtype);
      if (fields) {
        source = "system-model";
        ModuleLogger.debug(`[SchemaDiscovery] ${documentType}.${subtype} → system.model (${fields.length} fields)`);
      }
    }

    // Strategy 3: Live document inspection
    if (!fields) {
      fields = this.tryDocumentInspection(documentType, subtype);
      if (fields) {
        source = "document-inspection";
        ModuleLogger.debug(`[SchemaDiscovery] ${documentType}.${subtype} → document inspection (${fields.length} fields)`);
      }
    }

    if (!fields || fields.length === 0) {
      ModuleLogger.warn(`[SchemaDiscovery] No schema found for ${documentType}.${subtype}`);
      return null;
    }

    const paths = fields.map((f) => f.path);
    return {
      systemId: (game as unknown as { system: { id: string } }).system.id,
      documentType,
      subtype,
      fields,
      discoveredAt: new Date().toISOString(),
      schemaHash: hashFieldPaths(paths),
      source,
    };
  }

  /**
   * Discovers schemas for all registered subtypes of a document class.
   * Returns an array of schemas (skipping any that could not be discovered).
   */
  static discoverAll(
    documentType: "Item" | "Actor"
  ): DiscoveredSchema[] {
    const subtypes = this.getRegisteredSubtypes(documentType);
    const results: DiscoveredSchema[] = [];

    for (const subtype of subtypes) {
      const schema = this.discoverSchema(documentType, subtype);
      if (schema) results.push(schema);
    }

    ModuleLogger.info(
      `[SchemaDiscovery] Discovered ${results.length}/${subtypes.length} ${documentType} schemas.`
    );
    return results;
  }

  /**
   * Builds a DiscoveredSchema from a user-provided template document.
   * Inspects the document's `.system` data directly.
   */
  static discoverFromTemplate(
    doc: { uuid: string; name: string; type: string; system: Record<string, unknown> },
    documentType: "Item" | "Actor" | "JournalEntry"
  ): DiscoveredSchema {
    const fields = extractFieldsFromObject(doc.system);
    const paths = fields.map((f) => f.path);

    return {
      systemId: (game as unknown as { system: { id: string } }).system.id,
      documentType,
      subtype: doc.type,
      fields,
      discoveredAt: new Date().toISOString(),
      schemaHash: hashFieldPaths(paths),
      source: "template",
      sourceDocumentUuid: doc.uuid,
    };
  }

  // ── Private strategies ────────────────────────────────────────────────────

  private static tryDataModel(
    documentType: "Item" | "Actor" | "JournalEntry",
    subtype: string
  ): DiscoveredField[] | null {
    try {
      const CONFIG = (globalThis as unknown as { CONFIG: Record<string, unknown> }).CONFIG;
      if (!CONFIG) return null;

      const docConfig = CONFIG[documentType] as Record<string, unknown> | undefined;
      if (!docConfig) return null;

      const systemDataModels = docConfig["systemDataModels"] as
        | Record<string, unknown>
        | undefined;
      if (!systemDataModels) return null;

      const modelClass = systemDataModels[subtype];
      return extractFromDataModel(modelClass);
    } catch (err) {
      ModuleLogger.debug(`[SchemaDiscovery] DataModel strategy failed for ${documentType}.${subtype}: ${String(err)}`);
      return null;
    }
  }

  private static trySystemModel(
    documentType: "Item" | "Actor" | "JournalEntry",
    subtype: string
  ): DiscoveredField[] | null {
    try {
      const g = game as unknown as {
        system: {
          model?: {
            Item?: Record<string, Record<string, unknown>>;
            Actor?: Record<string, Record<string, unknown>>;
          };
        };
      };

      const modelRoot = g.system.model;
      if (!modelRoot) return null;

      const typeModel =
        documentType === "Item"  ? modelRoot.Item?.[subtype] :
        documentType === "Actor" ? modelRoot.Actor?.[subtype] : undefined;

      if (!typeModel) return null;
      return extractFieldsFromObject(typeModel);
    } catch (err) {
      ModuleLogger.debug(`[SchemaDiscovery] system.model strategy failed: ${String(err)}`);
      return null;
    }
  }

  private static tryDocumentInspection(
    documentType: "Item" | "Actor" | "JournalEntry",
    subtype: string
  ): DiscoveredField[] | null {
    try {
      const g = game as unknown as {
        items: Collection<{ type: string; system: Record<string, unknown> }>;
        actors: Collection<{ type: string; system: Record<string, unknown> }>;
        packs: Map<string, { documentName: string; index: unknown[] }>;
      };

      const collection =
        documentType === "Item"  ? g.items  :
        documentType === "Actor" ? g.actors : null;

      if (collection) {
        const doc = collection.find((d) => d.type === subtype);
        if (doc?.system && Object.keys(doc.system).length > 0) {
          return extractFieldsFromObject(doc.system);
        }
      }

      return null;
    } catch (err) {
      ModuleLogger.debug(`[SchemaDiscovery] Document inspection failed: ${String(err)}`);
      return null;
    }
  }

  /** Returns all registered subtypes for a document class. */
  static getRegisteredSubtypes(documentType: "Item" | "Actor"): string[] {
    try {
      const g = game as unknown as {
        system: { documentTypes?: { Item?: string[]; Actor?: string[] } };
      };
      const types = g.system.documentTypes?.[documentType] ?? [];
      return types.filter((t) => t !== "base");
    } catch {
      return [];
    }
  }
}

interface Collection<T> {
  find(predicate: (item: T) => boolean): T | undefined;
}
