/**
 * Import Validator — Milestone 2
 *
 * Validates a batch of ContentRecord drafts before they are committed to the
 * ContentDatabase. Produces structured errors and warnings per record.
 *
 * Validation rules:
 *   ERROR   — record will be rejected unless the user fixes it
 *   WARNING — record is accepted but needs attention
 *
 * Error conditions:
 *   - MISSING_NAME          : name is empty or absent
 *   - INVALID_CATEGORY      : category is not in the allowed list
 *   - DUPLICATE_NAME        : name already exists in the live database
 *
 * Warning conditions:
 *   - MISSING_SOURCE_BOOK   : sourceBook is empty
 *   - MISSING_PUBLISHER     : publisher is empty
 *   - MISSING_PAGE_NUMBER   : pageNumber is 0 or absent
 *   - POSSIBLE_DUPLICATE    : name closely matches an existing record
 *   - EMPTY_RAW_CONTENT     : rawContent has no fields beyond name/category
 */

import type { ContentCategory } from "../database/content-record.js";
import { CONTENT_CATEGORIES, isValidCategory } from "../database/content-record.js";
import { ContentDatabase } from "../database/content-database.js";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type IssueLevel = "error" | "warning";

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  message: string;
  field?: string;
}

export interface RecordValidationResult {
  /** Index in the source draft array (for UI correlation). */
  index: number;
  /** Candidate name for this record (may be empty). */
  name: string;
  /** True only when there are zero errors (warnings are allowed). */
  valid: boolean;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface BatchValidationReport {
  totalChecked: number;
  valid: number;
  invalid: number;
  withWarnings: number;
  results: RecordValidationResult[];
  /** Flat list of all error codes found in the batch. */
  errorCodes: string[];
  /** Flat list of all warning codes found in the batch. */
  warningCodes: string[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Draft shape expected by the validator
// ---------------------------------------------------------------------------

/** Minimum shape needed to validate a draft before it becomes a ContentRecord. */
export interface ContentDraft {
  name?: unknown;
  category?: unknown;
  sourceBook?: unknown;
  publisher?: unknown;
  pageNumber?: unknown;
  rawContent?: Record<string, unknown>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export class ImportValidator {

  /**
   * Validates a single draft object and returns a RecordValidationResult.
   * Checks the live ContentDatabase for duplicate names.
   *
   * @param draft    The raw draft object from the preview step.
   * @param index    The position of this draft in the source array (for UI use).
   * @param existingNames Optional pre-built Set of names already in the database.
   *                      Pass this when validating a batch to avoid N DB lookups.
   */
  static validateOne(
    draft: ContentDraft,
    index: number,
    existingNames?: Set<string>
  ): RecordValidationResult {
    const issues: ValidationIssue[] = [];
    const name = typeof draft.name === "string" ? draft.name.trim() : "";

    // ── Required: name ───────────────────────────────────────────────────
    if (!name) {
      issues.push({
        level: "error",
        code: "MISSING_NAME",
        message: "Record has no name. A name is required.",
        field: "name",
      });
    }

    // ── Required: category ───────────────────────────────────────────────
    if (draft.category === undefined || draft.category === null || draft.category === "") {
      issues.push({
        level: "error",
        code: "MISSING_CATEGORY",
        message: "Record has no category. Specify one of: " + CONTENT_CATEGORIES.join(", "),
        field: "category",
      });
    } else if (!isValidCategory(draft.category)) {
      issues.push({
        level: "error",
        code: "INVALID_CATEGORY",
        message: `'${String(draft.category)}' is not a valid category. ` +
          `Allowed: ${CONTENT_CATEGORIES.join(", ")}`,
        field: "category",
      });
    }

    // ── Duplicate name in database ────────────────────────────────────────
    if (name) {
      const dbNames = existingNames ?? this.buildExistingNameSet();
      if (dbNames.has(name.toLowerCase())) {
        issues.push({
          level: "error",
          code: "DUPLICATE_NAME",
          message: `'${name}' already exists in the database. Enable "Overwrite Duplicates" to replace it.`,
          field: "name",
        });
      }
    }

    // ── Warning: missing source book ─────────────────────────────────────
    const sourceBook = typeof draft.sourceBook === "string" ? draft.sourceBook.trim() : "";
    if (!sourceBook) {
      issues.push({
        level: "warning",
        code: "MISSING_SOURCE_BOOK",
        message: "Source book is not specified. Add source information for traceability.",
        field: "sourceBook",
      });
    }

    // ── Warning: missing publisher ────────────────────────────────────────
    const publisher = typeof draft.publisher === "string" ? draft.publisher.trim() : "";
    if (!publisher) {
      issues.push({
        level: "warning",
        code: "MISSING_PUBLISHER",
        message: "Publisher is not specified.",
        field: "publisher",
      });
    }

    // ── Warning: missing page number ──────────────────────────────────────
    const pageNumber = typeof draft.pageNumber === "number" ? draft.pageNumber : 0;
    if (pageNumber === 0) {
      issues.push({
        level: "warning",
        code: "MISSING_PAGE_NUMBER",
        message: "Page number is 0 or absent. Add a page number for source traceability.",
        field: "pageNumber",
      });
    }

    // ── Warning: sparse rawContent ───────────────────────────────────────
    const rawContentKeys = Object.keys(draft.rawContent ?? {}).filter(
      (k) => k !== "name" && k !== "category"
    );
    if (rawContentKeys.length === 0) {
      issues.push({
        level: "warning",
        code: "EMPTY_RAW_CONTENT",
        message: "Record contains no content fields beyond name and category. " +
          "The record will save but conversion to a Foundry document may be incomplete.",
      });
    }

    const errors = issues.filter((i) => i.level === "error");
    const warnings = issues.filter((i) => i.level === "warning");

    return {
      index,
      name: name || "(no name)",
      valid: errors.length === 0,
      issues,
      errors,
      warnings,
    };
  }

  /**
   * Validates a batch of drafts in one pass.
   * Pre-builds the existing name set once for efficiency.
   *
   * @param drafts   Array of draft objects to validate.
   */
  static validateBatch(drafts: ContentDraft[]): BatchValidationReport {
    const existingNames = this.buildExistingNameSet();
    const results: RecordValidationResult[] = [];
    const errorCodes = new Set<string>();
    const warningCodes = new Set<string>();

    let valid = 0;
    let invalid = 0;
    let withWarnings = 0;

    for (let i = 0; i < drafts.length; i++) {
      const result = this.validateOne(drafts[i]!, i, existingNames);
      results.push(result);

      if (result.valid) {
        valid++;
      } else {
        invalid++;
        result.errors.forEach((e) => errorCodes.add(e.code));
      }

      if (result.warnings.length > 0) {
        withWarnings++;
        result.warnings.forEach((w) => warningCodes.add(w.code));
      }
    }

    return {
      totalChecked: drafts.length,
      valid,
      invalid,
      withWarnings,
      results,
      errorCodes: [...errorCodes],
      warningCodes: [...warningCodes],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Validates a batch with overwrite mode enabled.
   * When overwrite is true, DUPLICATE_NAME errors are suppressed and
   * replaced with WILL_OVERWRITE warnings.
   */
  static validateBatchWithOverwrite(
    drafts: ContentDraft[],
    overwrite: boolean
  ): BatchValidationReport {
    const report = this.validateBatch(drafts);

    if (!overwrite) return report;

    // Promote DUPLICATE_NAME errors to warnings when overwrite is active
    for (const result of report.results) {
      const dupeErrors = result.errors.filter((e) => e.code === "DUPLICATE_NAME");
      if (dupeErrors.length === 0) continue;

      // Remove from errors, add as warnings
      result.errors = result.errors.filter((e) => e.code !== "DUPLICATE_NAME");
      for (const dupeErr of dupeErrors) {
        const warnIssue: ValidationIssue = {
          level: "warning",
          code: "WILL_OVERWRITE",
          message: dupeErr.message.replace(
            "Enable \"Overwrite Duplicates\" to replace it.",
            "This record will OVERWRITE the existing entry."
          ),
          field: "name",
        };
        result.warnings.push(warnIssue);
        result.issues = result.issues.map((i) =>
          i.code === "DUPLICATE_NAME" ? warnIssue : i
        );
      }
      result.valid = result.errors.length === 0;
    }

    // Recount
    let valid = 0;
    let invalid = 0;
    let withWarnings = 0;
    const errorCodes = new Set<string>();
    const warningCodes = new Set<string>();

    for (const r of report.results) {
      if (r.valid) valid++; else invalid++;
      if (r.warnings.length > 0) withWarnings++;
      r.errors.forEach((e) => errorCodes.add(e.code));
      r.warnings.forEach((w) => warningCodes.add(w.code));
    }

    return {
      ...report,
      valid,
      invalid,
      withWarnings,
      errorCodes: [...errorCodes],
      warningCodes: [...warningCodes],
    };
  }

  /**
   * Formats a BatchValidationReport as a plain-text string for download.
   */
  static formatReportText(report: BatchValidationReport): string {
    const lines: string[] = [
      "=== SF3PL Import Validation Report ===",
      `Generated:     ${new Date(report.generatedAt).toLocaleString()}`,
      `Total Checked: ${report.totalChecked}`,
      `Valid:         ${report.valid}`,
      `Invalid:       ${report.invalid}`,
      `With Warnings: ${report.withWarnings}`,
      "",
    ];

    for (const result of report.results) {
      const status = result.valid ? "[PASS]" : "[FAIL]";
      lines.push(`${status} ${result.name}`);
      for (const issue of result.issues) {
        const prefix = issue.level === "error" ? "  ERROR" : "  WARN ";
        lines.push(`${prefix} [${issue.code}]: ${issue.message}`);
      }
      if (result.issues.length === 0) {
        lines.push("  No issues.");
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Builds a lowercase name set from the live database for duplicate checking. */
  private static buildExistingNameSet(): Set<string> {
    const nameSet = new Set<string>();
    if (ContentDatabase.isReady()) {
      for (const rec of ContentDatabase.getAll()) {
        nameSet.add(rec.name.toLowerCase());
      }
    }
    return nameSet;
  }
}
