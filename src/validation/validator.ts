/**
 * Content Validator
 *
 * Validates ParsedEntry objects against content-type schemas before
 * documents are created in Foundry. Runs both structural checks
 * (required fields, type correctness) and business-rule checks
 * (value ranges, enum membership).
 *
 * The validator is system-agnostic at the API level; system-specific
 * required fields are pulled from the registered adapter.
 */

import type {
  ParsedEntry,
  ValidationResult,
  ValidationReport,
  ParseError,
  ParseWarning,
  ContentType,
} from "../types/module-types.js";
import type { ContentSchema, FieldSchema } from "./schemas/item-schemas.js";
import { ITEM_SCHEMAS } from "./schemas/item-schemas.js";
import { ACTOR_SCHEMAS } from "./schemas/actor-schemas.js";
import { ModuleLogger } from "../utils/logger.js";

/** Combined schema map for all supported content types. */
const ALL_SCHEMAS: Readonly<Partial<Record<ContentType, ContentSchema>>> = {
  ...ITEM_SCHEMAS,
  ...ACTOR_SCHEMAS,
};

export class ContentValidator {

  /**
   * Validates a single ParsedEntry.
   * @param entry The parsed entry to validate.
   * @returns A ValidationResult with all errors and warnings.
   */
  static validate(entry: ParsedEntry): ValidationResult {
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    const ref = entry.sourceReference;

    const schema = ALL_SCHEMAS[entry.contentType];

    if (!schema) {
      warnings.push({
        code: "NO_SCHEMA",
        message: `No validation schema defined for content type '${entry.contentType}'. Skipping field validation.`,
        severity: "warning",
        sourceReference: ref,
      });
      return { valid: true, errors, warnings, entry };
    }

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const value = this.resolveField(entry.data, fieldName);
      this.validateField(fieldName, value, fieldSchema, errors, warnings, ref);
    }

    const valid = errors.length === 0;
    return { valid, errors, warnings, entry };
  }

  /**
   * Validates a batch of ParsedEntry objects and returns a full report.
   * @param entries Array of entries to validate.
   */
  static validateBatch(entries: ParsedEntry[]): ValidationReport {
    const results: ValidationResult[] = [];
    let passed = 0;
    let failed = 0;

    for (const entry of entries) {
      const result = this.validate(entry);
      results.push(result);
      if (result.valid) {
        passed++;
      } else {
        failed++;
        ModuleLogger.warn(
          `[Validator] Validation failed for ${entry.contentType} ` +
          `'${String(entry.data["name"] ?? "(no name)")}': ` +
          result.errors.map((e) => e.message).join("; ")
        );
      }
    }

    return {
      totalChecked: entries.length,
      passed,
      failed,
      results,
      generatedAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Field validation
  // -------------------------------------------------------------------------

  private static validateField(
    fieldName: string,
    value: unknown,
    schema: FieldSchema,
    errors: ParseError[],
    warnings: ParseWarning[],
    ref?: string
  ): void {
    const isMissing = value === undefined || value === null || value === "";

    // Required check
    if (schema.required && isMissing) {
      errors.push({
        code: "REQUIRED_FIELD_MISSING",
        message: `Required field '${fieldName}' is missing or empty.`,
        field: fieldName,
        severity: "error",
        sourceReference: ref,
      });
      return;
    }

    // If the value is absent and not required, nothing more to check
    if (isMissing) return;

    // Type check
    switch (schema.type) {
      case "string":
        if (typeof value !== "string") {
          errors.push({
            code: "TYPE_MISMATCH",
            message: `Field '${fieldName}' must be a string, got ${typeof value}.`,
            field: fieldName,
            severity: "error",
            sourceReference: ref,
          });
          return;
        }
        if (schema.minLength !== undefined && value.length < schema.minLength) {
          errors.push({
            code: "STRING_TOO_SHORT",
            message: `Field '${fieldName}' must be at least ${schema.minLength} character(s).`,
            field: fieldName,
            severity: "error",
            sourceReference: ref,
          });
        }
        if (schema.enum && schema.enum.length > 0 && !schema.enum.includes(value)) {
          errors.push({
            code: "INVALID_ENUM_VALUE",
            message: `Field '${fieldName}' has invalid value '${value}'. ` +
              `Allowed values: ${schema.enum.join(", ")}.`,
            field: fieldName,
            severity: "error",
            sourceReference: ref,
          });
        }
        break;

      case "number": {
        const num = typeof value === "number" ? value : parseFloat(String(value));
        if (isNaN(num)) {
          errors.push({
            code: "TYPE_MISMATCH",
            message: `Field '${fieldName}' must be a number, got '${String(value)}'.`,
            field: fieldName,
            severity: "error",
            sourceReference: ref,
          });
          return;
        }
        if (schema.min !== undefined && num < schema.min) {
          errors.push({
            code: "VALUE_TOO_LOW",
            message: `Field '${fieldName}' value ${num} is below minimum ${schema.min}.`,
            field: fieldName,
            severity: "error",
            sourceReference: ref,
          });
        }
        if (schema.max !== undefined && num > schema.max) {
          errors.push({
            code: "VALUE_TOO_HIGH",
            message: `Field '${fieldName}' value ${num} exceeds maximum ${schema.max}.`,
            field: fieldName,
            severity: "error",
            sourceReference: ref,
          });
        }
        break;
      }

      case "boolean":
        if (typeof value !== "boolean") {
          warnings.push({
            code: "TYPE_COERCION",
            message: `Field '${fieldName}' is not a boolean; will be coerced.`,
            field: fieldName,
            severity: "warning",
            sourceReference: ref,
          });
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          errors.push({
            code: "TYPE_MISMATCH",
            message: `Field '${fieldName}' must be an array.`,
            field: fieldName,
            severity: "error",
            sourceReference: ref,
          });
        }
        break;

      case "object":
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          errors.push({
            code: "TYPE_MISMATCH",
            message: `Field '${fieldName}' must be an object.`,
            field: fieldName,
            severity: "error",
            sourceReference: ref,
          });
        }
        break;
    }
  }

  /**
   * Resolves a field value from a flat data record using a simple key name.
   * The validator operates on the flat source data, not the transformed system data.
   */
  private static resolveField(data: Record<string, unknown>, fieldName: string): unknown {
    return data[fieldName];
  }
}
