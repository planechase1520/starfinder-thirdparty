/**
 * Repair Engine — Milestone 4
 *
 * Analyzes a ContentRecord against its discovered DiscoveredSchema and applies
 * automatic repairs before compendium conversion:
 *
 *   1. Fill missing fields with schema default values.
 *   2. Apply system data defaults from a registered DocumentTemplate.
 *   3. Normalize values to the schema-declared type (e.g. "42" → 42).
 *   4. Produce a detailed log of every change and every remaining issue.
 *
 * RepairEngine never modifies the source record — it always returns a
 * deep-cloned copy in RepairResult.repairedRecord.
 *
 * Usage:
 *   const result = RepairEngine.repair(record);
 *   if (result.wasModified) {
 *     await ContentDatabase.update(result.repairedRecord);
 *   }
 */

import type { ContentRecord } from "../database/content-record.js";
import type { SchemaCompatibilityReport } from "../schema/schema-types.js";
import { SchemaValidator } from "../schema/SchemaValidator.js";
import { SchemaRegistry } from "../schema/SchemaRegistry.js";
import { TemplateStore } from "../schema/TemplateStore.js";
import { ModuleLogger } from "../utils/logger.js";

// ── Result types ──────────────────────────────────────────────────────────────

export type RepairActionKind =
  | "filled_default"   // Applied a schema-declared default value
  | "filled_template"  // Applied a value from a registered DocumentTemplate
  | "normalized"       // Coerced an existing value to the schema-declared type
  | "skipped";         // Could not repair; manual intervention required

export interface RepairAction {
  /** Dot-path field that was examined. */
  field: string;
  /** What the engine did with this field. */
  action: RepairActionKind;
  /** The value before repair (undefined = field was absent). */
  oldValue: unknown;
  /** The value after repair (undefined = still absent). */
  newValue: unknown;
  /** Human-readable explanation. */
  reason: string;
}

export interface RepairResult {
  recordId: string;
  recordName: string;
  category: string;
  /** Ordered list of every action the engine evaluated. */
  actionsApplied: RepairAction[];
  /** Fields that still need manual correction after auto-repair. */
  remainingIssues: string[];
  /** The (possibly modified) clone of the source record. */
  repairedRecord: ContentRecord;
  /** True when at least one field was filled or normalized. */
  wasModified: boolean;
}

export interface BatchRepairResult {
  total: number;
  modified: number;
  unchanged: number;
  results: RepairResult[];
  generatedAt: string;
}

// ── Category → schema type mapping ───────────────────────────────────────────

const CATEGORY_TO_DOC_TYPE: Record<
  string,
  { documentType: "Item" | "Actor"; subtype: string }
> = {
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

// ── RepairEngine ──────────────────────────────────────────────────────────────

export class RepairEngine {
  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Repairs a single ContentRecord against the discovered schema.
   * The original record is never mutated.
   */
  static repair(record: ContentRecord): RepairResult {
    const cloned = this.cloneRecord(record);
    const actions: RepairAction[] = [];
    const remainingIssues: string[] = [];

    const mapping = CATEGORY_TO_DOC_TYPE[record.category];
    if (!mapping) {
      return this.noOpResult(cloned, [
        `No schema mapping registered for category: "${record.category}". Cannot repair.`,
      ]);
    }

    const schema = SchemaRegistry.get(mapping.documentType, mapping.subtype);
    if (!schema) {
      return this.noOpResult(cloned, [
        `No discovered schema for ${mapping.documentType}.${mapping.subtype}. ` +
        `Open Schema Manager and run "Scan Current System" first.`,
      ]);
    }

    const templateDefaults = this.loadTemplateDefaults(mapping.subtype);

    for (const field of schema.fields) {
      const topKey = field.path.split(".")[0].split("[")[0];

      if (this.hasKey(cloned.rawContent, topKey)) {
        // Field is present — attempt type normalization
        const rawVal = cloned.rawContent[topKey];
        const normalized = this.normalizeValue(rawVal, field.type);
        if (normalized !== rawVal) {
          actions.push({
            field: topKey,
            action: "normalized",
            oldValue: rawVal,
            newValue: normalized,
            reason: `Schema declares type "${field.type}", found ${typeof rawVal}. Coerced value.`,
          });
          (cloned.rawContent as Record<string, unknown>)[topKey] = normalized;
        }
        continue;
      }

      // Field is absent — attempt to fill it
      if (templateDefaults !== null && templateDefaults[topKey] !== undefined) {
        const val = templateDefaults[topKey];
        actions.push({
          field: topKey,
          action: "filled_template",
          oldValue: undefined,
          newValue: val,
          reason: `Filled from registered "${mapping.subtype}" DocumentTemplate.`,
        });
        (cloned.rawContent as Record<string, unknown>)[topKey] = val;
      } else if (field.defaultValue !== null && field.defaultValue !== undefined) {
        actions.push({
          field: topKey,
          action: "filled_default",
          oldValue: undefined,
          newValue: field.defaultValue,
          reason: `Applied schema-declared default value.`,
        });
        (cloned.rawContent as Record<string, unknown>)[topKey] = field.defaultValue;
      } else {
        const severity = field.required ? "Required" : "Optional";
        const issue =
          `${severity} field "${field.path}" is absent and has no default — manual fix required.`;

        actions.push({
          field: topKey,
          action: "skipped",
          oldValue: undefined,
          newValue: undefined,
          reason: issue,
        });

        if (field.required) {
          remainingIssues.push(issue);
        }
      }
    }

    const wasModified = actions.some(
      (a) => a.action === "filled_default" ||
             a.action === "filled_template" ||
             a.action === "normalized"
    );

    ModuleLogger.debug(
      `[RepairEngine] "${record.name}": ${actions.length} action(s), ` +
      `${remainingIssues.length} issue(s) remaining, wasModified=${wasModified}`
    );

    return {
      recordId: record.id,
      recordName: record.name,
      category: record.category,
      actionsApplied: actions,
      remainingIssues,
      repairedRecord: cloned,
      wasModified,
    };
  }

  /**
   * Repairs a batch of ContentRecords.
   * Returns a BatchRepairResult with one RepairResult per input record.
   */
  static repairBatch(records: ContentRecord[]): BatchRepairResult {
    const results = records.map((r) => this.repair(r));
    const modified = results.filter((r) => r.wasModified).length;
    return {
      total: results.length,
      modified,
      unchanged: results.length - modified,
      results,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Validates a record, then repairs it.
   * Returns both reports so the UI can show before/after comparison.
   */
  static validateAndRepair(record: ContentRecord): {
    compatibility: SchemaCompatibilityReport | null;
    repair: RepairResult;
  } {
    const compatibility = SchemaValidator.validate(record);
    const repair = this.repair(record);
    return { compatibility, repair };
  }

  /**
   * Formats a RepairResult as a human-readable text block.
   */
  static formatResult(result: RepairResult): string {
    const lines: string[] = [
      `Record: ${result.recordName} [${result.category}]`,
      `ID: ${result.recordId}`,
      `Modified: ${result.wasModified ? "Yes" : "No"}`,
      "",
    ];

    if (result.actionsApplied.length === 0) {
      lines.push("No actions applied.");
    } else {
      lines.push(`Actions (${result.actionsApplied.length}):`);
      for (const action of result.actionsApplied) {
        const icon = {
          filled_default: "+",
          filled_template: "T",
          normalized: "~",
          skipped: "!",
        }[action.action];
        lines.push(`  [${icon}] ${action.field}: ${action.reason}`);
      }
    }

    if (result.remainingIssues.length > 0) {
      lines.push("", `Remaining Issues (${result.remainingIssues.length}):`);
      result.remainingIssues.forEach((i) => lines.push(`  ⚠ ${i}`));
    }

    return lines.join("\n");
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private static cloneRecord(record: ContentRecord): ContentRecord {
    return {
      ...record,
      rawContent: { ...record.rawContent },
      tags: [...record.tags],
    };
  }

  private static noOpResult(record: ContentRecord, issues: string[]): RepairResult {
    return {
      recordId: record.id,
      recordName: record.name,
      category: record.category,
      actionsApplied: [],
      remainingIssues: issues,
      repairedRecord: record,
      wasModified: false,
    };
  }

  private static loadTemplateDefaults(subtype: string): Record<string, unknown> | null {
    const template = TemplateStore.getBySubtype(subtype);
    return template?.systemDataSnapshot ?? null;
  }

  private static hasKey(
    rawContent: Record<string, unknown>,
    topKey: string
  ): boolean {
    return Object.prototype.hasOwnProperty.call(rawContent, topKey);
  }

  /**
   * Attempts to coerce `value` to `targetType`.
   * Returns the original value unchanged when coercion is not needed or possible.
   */
  private static normalizeValue(value: unknown, targetType: string): unknown {
    if (value === null || value === undefined) return value;

    switch (targetType) {
      case "number": {
        if (typeof value === "number") return value;
        const n = Number(value);
        return isNaN(n) ? value : n;
      }
      case "boolean": {
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
          const lower = value.toLowerCase().trim();
          if (lower === "true" || lower === "1" || lower === "yes") return true;
          if (lower === "false" || lower === "0" || lower === "no") return false;
        }
        return value;
      }
      case "string": {
        if (typeof value === "string") return value;
        return String(value);
      }
      case "array": {
        if (Array.isArray(value)) return value;
        if (typeof value === "string" && value.includes(",")) {
          return value.split(",").map((s) => s.trim()).filter(Boolean);
        }
        return [value];
      }
      default:
        return value;
    }
  }
}
