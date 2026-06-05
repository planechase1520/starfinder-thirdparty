/**
 * Schema Validator — Milestone 4
 *
 * Validates a ContentRecord's rawContent against a DiscoveredSchema.
 * Produces a SchemaCompatibilityReport for each record detailing:
 *   - Missing required fields
 *   - Missing optional fields
 *   - Unknown fields (potential typos in import data)
 *   - Actionable fix suggestions
 *
 * This supplements the M2 ImportValidator (which checks database-level
 * constraints) by adding system-schema-level field validation.
 */

import type { DiscoveredSchema, SchemaCompatibilityReport, BatchCompatibilityResult } from "./schema-types.js";
import type { ContentRecord } from "../database/content-record.js";
import { SchemaRegistry } from "./SchemaRegistry.js";

/** Maps ContentCategory values to SFRPG document type + subtype. */
const CATEGORY_TO_DOC_TYPE: Record<string, { documentType: "Item" | "Actor"; subtype: string }> = {
  weapon:           { documentType: "Item",  subtype: "weapon" },
  armor:            { documentType: "Item",  subtype: "armor" },
  equipment:        { documentType: "Item",  subtype: "equipment" },
  augmentation:     { documentType: "Item",  subtype: "augmentation" },
  feat:             { documentType: "Item",  subtype: "feat" },
  spell:            { documentType: "Item",  subtype: "spell" },
  race:             { documentType: "Item",  subtype: "race" },
  theme:            { documentType: "Item",  subtype: "theme" },
  class:            { documentType: "Item",  subtype: "class" },
  archetypeFeature: { documentType: "Item",  subtype: "archetypeFeature" },
  npc:              { documentType: "Actor", subtype: "npc2" },
  vehicle:          { documentType: "Actor", subtype: "vehicle" },
  starship:         { documentType: "Actor", subtype: "starship" },
  hazard:           { documentType: "Actor", subtype: "hazard" },
};

export class SchemaValidator {
  /**
   * Validates a single ContentRecord against the schema for its category.
   * Returns null if no schema is registered for the category.
   */
  static validate(record: ContentRecord): SchemaCompatibilityReport | null {
    const mapping = CATEGORY_TO_DOC_TYPE[record.category];
    if (!mapping) return null;

    const schema = SchemaRegistry.get(mapping.documentType, mapping.subtype);
    if (!schema) return null;

    return this.validateAgainstSchema(record, schema);
  }

  /**
   * Validates a record against a specific schema directly.
   * Useful when testing or when the registry is not yet initialized.
   */
  static validateAgainstSchema(
    record: ContentRecord,
    schema: DiscoveredSchema
  ): SchemaCompatibilityReport {
    const rawKeys = this.flattenKeys(record.rawContent);
    const schemaFieldMap = new Map(schema.fields.map((f) => [f.path, f]));

    const missingRequiredFields: string[] = [];
    const missingOptionalFields: string[] = [];
    const unknownFields: string[] = [];
    const suggestions: SchemaCompatibilityReport["suggestions"] = [];

    // Check schema fields against rawContent
    for (const [path, field] of schemaFieldMap) {
      const topKey = path.split(".")[0].split("[")[0];
      const hasTopKey = rawKeys.some(
        (k) => k === topKey || k === path || k.startsWith(`${topKey}.`)
      );

      if (!hasTopKey) {
        if (field.required) {
          missingRequiredFields.push(path);
          suggestions.push({
            field: path,
            suggestion: this.buildSuggestion(path, field.defaultValue, field.type),
          });
        } else {
          missingOptionalFields.push(path);
        }
      }
    }

    // Check rawContent keys against schema (unknown fields)
    for (const rawKey of rawKeys) {
      const topKey = rawKey.split(".")[0].split("[")[0];
      const knownInSchema = [...schemaFieldMap.keys()].some(
        (p) => p === topKey || p.startsWith(`${topKey}.`) || p.startsWith(`${topKey}[`)
      );

      if (!knownInSchema) {
        unknownFields.push(rawKey);
      }
    }

    const compatible = missingRequiredFields.length === 0;

    return {
      recordId: record.id,
      recordName: record.name,
      category: record.category,
      compatible,
      missingRequiredFields,
      missingOptionalFields,
      unknownFields,
      suggestions,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Validates a batch of records. Returns aggregate stats and per-record reports.
   */
  static validateBatch(records: ContentRecord[]): BatchCompatibilityResult {
    const reports: SchemaCompatibilityReport[] = [];
    let compatible = 0;
    let incompatible = 0;

    for (const record of records) {
      const report = this.validate(record);
      if (!report) continue;

      reports.push(report);
      if (report.compatible) compatible++;
      else incompatible++;
    }

    return {
      total: reports.length,
      compatible,
      incompatible,
      reports,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Flattens a nested rawContent object into dot-path key strings. */
  private static flattenKeys(
    obj: Record<string, unknown>,
    prefix = "",
    depth = 0
  ): string[] {
    if (depth > 5 || typeof obj !== "object" || obj === null) return [];

    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      keys.push(path);
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        keys.push(...this.flattenKeys(v as Record<string, unknown>, path, depth + 1));
      }
    }
    return keys;
  }

  private static buildSuggestion(
    path: string,
    defaultValue: unknown,
    type: string
  ): string {
    if (defaultValue !== null && defaultValue !== undefined) {
      return `Add "${path}" with value ${JSON.stringify(defaultValue)} (default).`;
    }
    const typeExample: Record<string, string> = {
      string: `""`,
      number: `0`,
      boolean: `false`,
      array: `[]`,
      object: `{}`,
    };
    const example = typeExample[type] ?? `null`;
    return `Add "${path}" (${type}), e.g. ${example}.`;
  }
}
