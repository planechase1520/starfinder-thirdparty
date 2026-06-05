/**
 * Mapping Validator — Milestone 4
 *
 * Validates a MappingProfile against a DiscoveredSchema to identify:
 *   - Required schema fields not covered by any rule
 *   - Rules that reference unknown schema paths (possible typos)
 *   - Rules targeting paths removed in a schema update
 *
 * Produces a MappingValidationReport used by the Schema Manager UI.
 */

import type { DiscoveredSchema } from "../schema/schema-types.js";
import type { MappingProfile } from "./MappingProfiles.js";
import type { MappingRule } from "./MappingRules.js";

// ── Report types ──────────────────────────────────────────────────────────────

export interface MappingGap {
  /** The schema field path that is not covered. */
  schemaPath: string;
  /** Whether the field is required (vs optional). */
  required: boolean;
  /** Suggested source key to add a rule for this field. */
  suggestedSourceKey?: string;
}

export interface StaleRule {
  /** The rule targeting a now-unknown schema path. */
  rule: MappingRule;
  reason: string;
}

export interface MappingValidationReport {
  category: string;
  schemaHash: string;
  profileHash: string;
  /** Required schema fields with no matching rule. */
  missingRequiredRules: MappingGap[];
  /** Optional schema fields with no matching rule. */
  missingOptionalRules: MappingGap[];
  /** Rules whose target path is absent from the schema. */
  staleRules: StaleRule[];
  /** True when all required fields are covered and no stale rules exist. */
  isValid: boolean;
  generatedAt: string;
}

// ── Validator ─────────────────────────────────────────────────────────────────

export class MappingValidator {
  /**
   * Validates a MappingProfile against a DiscoveredSchema.
   */
  static validate(
    profile: MappingProfile,
    schema: DiscoveredSchema
  ): MappingValidationReport {
    const coveredTargets = this.collectCoveredPaths(profile.rules);
    const schemaPathMap = new Map(schema.fields.map((f) => [f.path, f]));

    const missingRequiredRules: MappingGap[] = [];
    const missingOptionalRules: MappingGap[] = [];
    const staleRules: StaleRule[] = [];

    // Check schema fields against covered targets
    for (const [path, field] of schemaPathMap) {
      const isCovered = [...coveredTargets].some(
        (t) => t === path || path.startsWith(`${t}.`) || t.startsWith(`${path}.`)
      );

      if (!isCovered) {
        const gap: MappingGap = {
          schemaPath: path,
          required: field.required,
          suggestedSourceKey: this.suggestSourceKey(path),
        };
        if (field.required) {
          missingRequiredRules.push(gap);
        } else {
          missingOptionalRules.push(gap);
        }
      }
    }

    // Check rules for stale targets
    for (const rule of profile.rules) {
      if (rule.kind === "default") continue; // defaults are always valid
      const target = rule.targetPath;
      const knownInSchema = [...schemaPathMap.keys()].some(
        (p) => p === target || p.startsWith(`${target}.`) || target.startsWith(`${p}.`)
      );
      if (!knownInSchema) {
        staleRules.push({
          rule,
          reason: `Target path "${target}" not found in current schema.`,
        });
      }
    }

    return {
      category: profile.category,
      schemaHash: schema.schemaHash,
      profileHash: profile.schemaHash,
      missingRequiredRules,
      missingOptionalRules,
      staleRules,
      isValid: missingRequiredRules.length === 0 && staleRules.length === 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private static collectCoveredPaths(rules: MappingRule[]): Set<string> {
    const paths = new Set<string>();
    for (const rule of rules) {
      paths.add(rule.targetPath);
      if (rule.kind === "nested") {
        for (const p of this.collectCoveredPaths(rule.rules)) {
          paths.add(p);
        }
      }
    }
    return paths;
  }

  /** Guesses a rawContent key name from a dot-path schema field path. */
  private static suggestSourceKey(path: string): string {
    return path.split(".").pop()?.split("[")[0] ?? path;
  }

  /**
   * Serializes a MappingValidationReport to a formatted text string.
   */
  static formatReport(report: MappingValidationReport): string {
    const lines = [
      `=== Mapping Validation Report ===`,
      `Category    : ${report.category}`,
      `Schema Hash : ${report.schemaHash}`,
      `Profile Hash: ${report.profileHash}`,
      `Generated   : ${report.generatedAt}`,
      `Status      : ${report.isValid ? "✓ Valid" : "✗ Issues found"}`,
      "",
    ];

    if (report.staleRules.length > 0) {
      lines.push(`Stale Rules (${report.staleRules.length}):`);
      report.staleRules.forEach((s) =>
        lines.push(`  ! ${s.rule.targetPath} — ${s.reason}`)
      );
      lines.push("");
    }

    if (report.missingRequiredRules.length > 0) {
      lines.push(`Missing Required Rules (${report.missingRequiredRules.length}):`);
      report.missingRequiredRules.forEach((g) =>
        lines.push(
          `  * ${g.schemaPath}` +
          (g.suggestedSourceKey ? ` (suggested source: "${g.suggestedSourceKey}")` : "")
        )
      );
      lines.push("");
    }

    if (report.missingOptionalRules.length > 0) {
      lines.push(`Missing Optional Rules (${report.missingOptionalRules.length}):`);
      report.missingOptionalRules.forEach((g) =>
        lines.push(`  - ${g.schemaPath}`)
      );
    }

    return lines.join("\n");
  }
}
