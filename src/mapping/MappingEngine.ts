/**
 * Mapping Engine — Milestone 4
 *
 * Executes a set of MappingRules against a ContentRecord's rawContent to
 * produce the `system` data object for a Foundry document.
 *
 * Integration with the Conversion Pipeline:
 *   ConversionPipeline calls MappingEngine.convert() after the hard-coded
 *   converter runs. The engine's output is deep-merged on top of the converter's
 *   system data, so discovered schema field paths win when available.
 *
 * Usage:
 *   const engine = new MappingEngine();
 *   const systemData = engine.convert(record, rules, schemaDefaults);
 */

import type { ContentRecord } from "../database/content-record.js";
import type { DiscoveredSchema } from "../schema/schema-types.js";
import type { MappingRule } from "./MappingRules.js";
import { coerceValue, TransformRegistry } from "./MappingRules.js";
import { ModuleLogger } from "../utils/logger.js";

// ── Conversion result ─────────────────────────────────────────────────────────

export interface MappingResult {
  /** The generated system data object. */
  systemData: Record<string, unknown>;
  /** Non-fatal warnings (e.g. missing optional field). */
  warnings: string[];
  /** Rules that could not be applied (source key missing, transform not found, etc.). */
  skippedRules: Array<{ rule: MappingRule; reason: string }>;
}

// ── MappingEngine ─────────────────────────────────────────────────────────────

export class MappingEngine {
  /**
   * Converts rawContent to Foundry system data using an ordered rule set.
   * Rules are evaluated sequentially; each writes to its `targetPath`.
   *
   * @param record  The source ContentRecord.
   * @param rules   Ordered array of MappingRules (from a MappingProfile).
   * @param schema  Optional DiscoveredSchema used to seed default values for
   *                fields not covered by any rule.
   */
  convert(
    record: ContentRecord,
    rules: MappingRule[],
    schema?: DiscoveredSchema
  ): MappingResult {
    const systemData: Record<string, unknown> = {};
    const warnings: string[] = [];
    const skippedRules: MappingResult["skippedRules"] = [];

    // Seed defaults from schema
    if (schema) {
      for (const field of schema.fields) {
        if (field.defaultValue !== null && field.defaultValue !== undefined) {
          setByPath(systemData, field.path, field.defaultValue);
        }
      }
    }

    // Apply rules
    for (const rule of rules) {
      const result = this.applyRule(rule, record.rawContent, systemData);
      if (result.skipped) {
        skippedRules.push({ rule, reason: result.reason ?? "Unknown reason" });
      }
      if (result.warning) {
        warnings.push(result.warning);
      }
    }

    return { systemData, warnings, skippedRules };
  }

  /**
   * Merges MappingEngine output on top of an existing system data object.
   * Used to supplement hard-coded converter output.
   */
  merge(
    base: Record<string, unknown>,
    engineOutput: Record<string, unknown>
  ): Record<string, unknown> {
    return deepMerge(base, engineOutput);
  }

  // ── Private rule evaluation ───────────────────────────────────────────────

  private applyRule(
    rule: MappingRule,
    rawContent: Record<string, unknown>,
    out: Record<string, unknown>
  ): { skipped: boolean; reason?: string; warning?: string } {
    try {
      switch (rule.kind) {
        case "exact":
          return this.applyExact(rule, rawContent, out);

        case "alias":
          return this.applyAlias(rule, rawContent, out);

        case "transform":
          return this.applyTransform(rule, rawContent, out);

        case "computed":
          return this.applyComputed(rule, rawContent, out);

        case "default":
          setByPath(out, rule.targetPath, rule.value);
          return { skipped: false };

        case "nested":
          return this.applyNested(rule, rawContent, out);

        default:
          return { skipped: true, reason: `Unknown rule kind` };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      ModuleLogger.warn(`[MappingEngine] Rule error (${rule.targetPath}): ${msg}`);
      return { skipped: true, reason: msg };
    }
  }

  private applyExact(
    rule: import("./MappingRules.js").ExactRule,
    rawContent: Record<string, unknown>,
    out: Record<string, unknown>
  ): { skipped: boolean; reason?: string } {
    const value = rawContent[rule.sourceKey];
    if (value === undefined || value === null) {
      if (rule.defaultValue !== undefined) {
        setByPath(out, rule.targetPath, rule.defaultValue);
        return { skipped: false };
      }
      return { skipped: true, reason: `Source key "${rule.sourceKey}" absent` };
    }
    setByPath(out, rule.targetPath, coerceValue(value, rule.coerce));
    return { skipped: false };
  }

  private applyAlias(
    rule: import("./MappingRules.js").AliasRule,
    rawContent: Record<string, unknown>,
    out: Record<string, unknown>
  ): { skipped: boolean; reason?: string } {
    for (const key of rule.sourceKeys) {
      const value = rawContent[key];
      if (value !== undefined && value !== null) {
        setByPath(out, rule.targetPath, coerceValue(value, rule.coerce));
        return { skipped: false };
      }
    }
    if (rule.defaultValue !== undefined) {
      setByPath(out, rule.targetPath, rule.defaultValue);
      return { skipped: false };
    }
    return {
      skipped: true,
      reason: `None of [${rule.sourceKeys.join(", ")}] found in rawContent`,
    };
  }

  private applyTransform(
    rule: import("./MappingRules.js").TransformRule,
    rawContent: Record<string, unknown>,
    out: Record<string, unknown>
  ): { skipped: boolean; reason?: string } {
    const fn = TransformRegistry.get(rule.transformName);
    if (!fn) {
      return { skipped: true, reason: `Transform "${rule.transformName}" not registered` };
    }

    const value = rawContent[rule.sourceKey];
    if (value === undefined || value === null) {
      if (rule.defaultValue !== undefined) {
        setByPath(out, rule.targetPath, rule.defaultValue);
        return { skipped: false };
      }
      return { skipped: true, reason: `Source key "${rule.sourceKey}" absent` };
    }

    const transformed = fn(value, rawContent);
    setByPath(out, rule.targetPath, coerceValue(transformed, rule.coerce));
    return { skipped: false };
  }

  private applyComputed(
    rule: import("./MappingRules.js").ComputedRule,
    rawContent: Record<string, unknown>,
    out: Record<string, unknown>
  ): { skipped: boolean; reason?: string } {
    try {
      // Safe-ish evaluation: wrap expression in a function with rawContent in scope
      // eslint-disable-next-line no-new-func
      const fn = new Function("rawContent", `"use strict"; return (${rule.expression});`);
      const value = fn(rawContent) as unknown;
      if (value !== undefined && value !== null) {
        setByPath(out, rule.targetPath, value);
      }
      return { skipped: false };
    } catch (err) {
      return {
        skipped: true,
        reason: `Computed expression error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private applyNested(
    rule: import("./MappingRules.js").NestedRule,
    rawContent: Record<string, unknown>,
    out: Record<string, unknown>
  ): { skipped: boolean; reason?: string } {
    const nestedOut: Record<string, unknown> = {};
    for (const subRule of rule.rules) {
      this.applyRule(subRule, rawContent, nestedOut);
    }
    if (Object.keys(nestedOut).length > 0) {
      setByPath(out, rule.targetPath, nestedOut);
    }
    return { skipped: false };
  }
}

// ── Path utilities ────────────────────────────────────────────────────────────

/**
 * Sets a value in a nested object using a dot-path string.
 * Creates intermediate objects as needed.
 * Handles array bracket notation like "damage[0].formula".
 */
function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = parsePath(path);
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || current[part] === null || typeof current[part] !== "object") {
      current[part] = isNaN(Number(parts[i + 1])) ? {} : [];
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/** Splits a dot-path + bracket-notation into string parts. */
function parsePath(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
}

/** Recursively deep-merges `overrides` onto `base`. */
function deepMerge(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
