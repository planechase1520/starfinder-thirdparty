/**
 * Pipeline Report Types — Milestone 3
 *
 * Defines the data structures produced by the ConversionPipeline after
 * converting a batch of ContentRecords into Foundry documents.
 *
 * Every run produces a PipelineReport which can be displayed in the
 * ConversionReportApp UI and exported as JSON.
 */

// ── Record-level result ───────────────────────────────────────────────────────

/** Disposition of a single record after pipeline processing. */
export type RecordDisposition = "imported" | "updated" | "skipped" | "failed";

/** Result for one record processed by the pipeline. */
export interface PipelineRecordResult {
  /** Source ContentRecord id. */
  recordId: string;
  /** Display name. */
  recordName: string;
  /** Content category of the source record. */
  category: string;
  /** What happened to this record. */
  disposition: RecordDisposition;
  /** Compendium pack it was written into (if successful). */
  packId: string;
  /** Name of the Foundry document created/updated (if successful). */
  documentName: string;
  /** Non-fatal warnings from the converter. */
  warnings: string[];
  /** Errors that caused a "failed" disposition. */
  errors: string[];
  /** ISO timestamp of processing. */
  processedAt: string;
}

// ── Batch-level report ────────────────────────────────────────────────────────

/** Aggregate statistics across a full pipeline run. */
export interface PipelineStats {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  /** Elapsed time in milliseconds. */
  elapsedMs: number;
}

/** The complete report produced by one ConversionPipeline run. */
export interface PipelineReport {
  /** Unique ID for this run (used in UI / export filename). */
  runId: string;
  /** ISO timestamp when the run started. */
  startedAt: string;
  /** ISO timestamp when the run finished. */
  finishedAt: string;
  /** Aggregate statistics. */
  stats: PipelineStats;
  /** Per-record results, in processing order. */
  results: PipelineRecordResult[];
}

// ── Report builder helpers ────────────────────────────────────────────────────

/** Creates a new, empty PipelineReport with runId + startedAt pre-populated. */
export function createReport(): PipelineReport & { _startMs: number } {
  const startMs = Date.now();
  return {
    runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: new Date(startMs).toISOString(),
    finishedAt: "",
    stats: { total: 0, imported: 0, updated: 0, skipped: 0, failed: 0, elapsedMs: 0 },
    results: [],
    _startMs: startMs,
  };
}

/** Finalizes the report, setting finishedAt and elapsedMs. */
export function finalizeReport(report: PipelineReport & { _startMs: number }): PipelineReport {
  const endMs = Date.now();
  report.finishedAt = new Date(endMs).toISOString();
  report.stats.elapsedMs = endMs - report._startMs;

  const { _startMs: _unused, ...clean } = report;
  void _unused;
  return clean as PipelineReport;
}

/** Adds a record result to the report and increments the relevant stat counter. */
export function addResult(report: PipelineReport, result: PipelineRecordResult): void {
  report.results.push(result);
  report.stats.total++;
  switch (result.disposition) {
    case "imported": report.stats.imported++; break;
    case "updated":  report.stats.updated++;  break;
    case "skipped":  report.stats.skipped++;  break;
    case "failed":   report.stats.failed++;   break;
  }
}

/** Serializes a PipelineReport to a formatted JSON string for export. */
export function reportToJson(report: PipelineReport): string {
  return JSON.stringify(report, null, 2);
}

/** Produces a human-readable plain-text summary of the report. */
export function reportToText(report: PipelineReport): string {
  const lines: string[] = [
    `=== SF3PL Conversion Report ===`,
    `Run ID    : ${report.runId}`,
    `Started   : ${report.startedAt}`,
    `Finished  : ${report.finishedAt}`,
    `Duration  : ${report.stats.elapsedMs}ms`,
    ``,
    `Total     : ${report.stats.total}`,
    `Imported  : ${report.stats.imported}`,
    `Updated   : ${report.stats.updated}`,
    `Skipped   : ${report.stats.skipped}`,
    `Failed    : ${report.stats.failed}`,
    ``,
    `=== Record Results ===`,
  ];

  for (const r of report.results) {
    const icon =
      r.disposition === "imported" ? "✓" :
      r.disposition === "updated"  ? "↻" :
      r.disposition === "skipped"  ? "—" : "✗";
    lines.push(`${icon} [${r.category}] ${r.recordName} → ${r.disposition.toUpperCase()}`);
    for (const w of r.warnings) lines.push(`    ⚠ ${w}`);
    for (const e of r.errors)   lines.push(`    ✗ ${e}`);
  }

  return lines.join("\n");
}
