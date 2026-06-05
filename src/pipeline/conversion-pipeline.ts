/**
 * Conversion Pipeline — Milestone 3
 *
 * Orchestrates the full conversion flow:
 *
 *   ContentRecord (database)
 *     → ConverterRegistry (category-specific converter)
 *     → ConversionResult (Foundry document data)
 *     → Compendium Pack (Item.create / Actor.create / JournalEntry.create)
 *     → PipelineRecordResult
 *
 * Designed for batch processing with real-time progress callbacks so the
 * UI can display a live progress indicator during large imports.
 *
 * Compendium packs are created on-demand if they do not already exist.
 * Duplicate detection: if a document with the same name already exists in
 * the target pack, it is updated (overwrite) rather than creating a duplicate.
 */

import { ContentDatabase } from "../database/content-database.js";
import type { ContentRecord, ContentCategory } from "../database/content-record.js";
import { ConverterRegistry } from "../adapters/starfinder/converter-registry.js";
import type { ConversionResult, FoundryItemData, FoundryActorData, FoundryJournalData } from "../adapters/starfinder/converter-types.js";
import {
  createReport,
  finalizeReport,
  addResult,
  type PipelineReport,
  type PipelineRecordResult,
} from "./pipeline-report.js";
import { ModuleLogger } from "../utils/logger.js";

// ── Progress callback ─────────────────────────────────────────────────────────

export interface PipelineProgress {
  /** Number of records processed so far. */
  processed: number;
  /** Total records in this batch. */
  total: number;
  /** The record currently being processed. */
  currentRecord: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

// ── Pipeline options ──────────────────────────────────────────────────────────

export interface PipelineOptions {
  /** IDs of specific ContentRecords to convert. When empty, converts all. */
  recordIds?: string[];
  /** Limit to specific categories. When empty, converts all categories. */
  categories?: ContentCategory[];
  /** When true, existing compendium entries are updated. Default: true. */
  overwriteExisting?: boolean;
  /** Optional callback invoked after each record is processed. */
  onProgress?: ProgressCallback;
}

// ── Pipeline class ────────────────────────────────────────────────────────────

export class ConversionPipeline {
  private readonly registry: ConverterRegistry;

  constructor(registry?: ConverterRegistry) {
    this.registry = registry ?? ConverterRegistry.build();
  }

  /**
   * Runs the conversion pipeline for the given options.
   * Returns a PipelineReport summarising every record's outcome.
   */
  async run(options: PipelineOptions = {}): Promise<PipelineReport> {
    const { recordIds, categories, overwriteExisting = true, onProgress } = options;

    const allRecords = ContentDatabase.getAll();

    let records = allRecords;
    if (recordIds && recordIds.length > 0) {
      const idSet = new Set(recordIds);
      records = records.filter((r) => idSet.has(r.id));
    }
    if (categories && categories.length > 0) {
      const catSet = new Set(categories);
      records = records.filter((r) => catSet.has(r.category));
    }

    const report = createReport();
    const total = records.length;

    ModuleLogger.info(`[ConversionPipeline] Starting run: ${total} record(s) to convert.`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      onProgress?.({ processed: i, total, currentRecord: record.name });

      const result = await this.processRecord(record, overwriteExisting);
      addResult(report, result);
    }

    onProgress?.({ processed: total, total, currentRecord: "" });

    const finalReport = finalizeReport(report);
    ModuleLogger.info(
      `[ConversionPipeline] Run complete. ` +
      `Imported: ${finalReport.stats.imported}, Updated: ${finalReport.stats.updated}, ` +
      `Skipped: ${finalReport.stats.skipped}, Failed: ${finalReport.stats.failed}`
    );

    return finalReport;
  }

  // ── Private: per-record processing ─────────────────────────────────────────

  private async processRecord(record: ContentRecord, overwrite: boolean): Promise<PipelineRecordResult> {
    const base: Omit<PipelineRecordResult, "disposition" | "documentName" | "errors" | "warnings"> = {
      recordId: record.id,
      recordName: record.name,
      category: record.category,
      packId: "",
      processedAt: new Date().toISOString(),
    };

    const converter = this.registry.get(record.category);
    if (!converter) {
      return {
        ...base,
        disposition: "skipped",
        documentName: "",
        warnings: [],
        errors: [`No converter registered for category "${record.category}".`],
      };
    }

    let convResult: ConversionResult;
    try {
      convResult = converter.convert(record);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ...base,
        packId: "",
        disposition: "failed",
        documentName: "",
        warnings: [],
        errors: [`Converter threw an exception: ${msg}`],
      };
    }

    if (!convResult.success || !convResult.documentData) {
      return {
        ...base,
        packId: convResult.packId,
        disposition: "failed",
        documentName: "",
        warnings: convResult.warnings,
        errors: convResult.errors,
      };
    }

    try {
      const { documentName, disposition } = await this.writeToCompendium(
        convResult,
        overwrite
      );
      return {
        ...base,
        packId: convResult.packId,
        disposition,
        documentName,
        warnings: convResult.warnings,
        errors: [],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ...base,
        packId: convResult.packId,
        disposition: "failed",
        documentName: "",
        warnings: convResult.warnings,
        errors: [`Compendium write failed: ${msg}`],
      };
    }
  }

  // ── Private: compendium write ─────────────────────────────────────────────

  private async writeToCompendium(
    result: ConversionResult,
    overwrite: boolean
  ): Promise<{ documentName: string; disposition: "imported" | "updated" | "skipped" }> {
    const pack = await this.getOrCreatePack(result.packId, result.documentType);
    if (!pack) {
      throw new Error(`Could not open or create compendium pack "${result.packId}".`);
    }

    const name = (result.documentData as { name: string }).name;

    const existing = pack.index.find((e: { name: string }) =>
      e.name.toLowerCase() === name.toLowerCase()
    ) as { _id: string; name: string } | undefined;

    if (existing) {
      if (!overwrite) {
        return { documentName: name, disposition: "skipped" };
      }

      const doc = await pack.getDocument(existing._id);
      if (doc) {
        await doc.update(result.documentData as unknown as Record<string, unknown>);
        return { documentName: name, disposition: "updated" };
      }
    }

    await this.createDocument(result, pack);
    return { documentName: name, disposition: "imported" };
  }

  private async createDocument(
    result: ConversionResult,
    pack: CompendiumCollection
  ): Promise<void> {
    const opts = { pack: pack.collection };

    switch (result.documentType) {
      case "Item":
        await Item.create(result.documentData as FoundryItemData, opts);
        break;
      case "Actor":
        await Actor.create(result.documentData as FoundryActorData, opts);
        break;
      case "JournalEntry":
        await JournalEntry.create(result.documentData as FoundryJournalData, opts);
        break;
      default:
        throw new Error(`Unknown document type: ${String(result.documentType)}`);
    }
  }

  private async getOrCreatePack(
    packId: string,
    documentType: "Item" | "Actor" | "JournalEntry"
  ): Promise<CompendiumCollection | null> {
    let pack = game.packs.get(packId) as CompendiumCollection | undefined;

    if (!pack) {
      ModuleLogger.info(`[ConversionPipeline] Creating compendium pack: ${packId}`);
      const [moduleId, packName] = packId.split(".");

      try {
        pack = await CompendiumCollection.createCompendium({
          name: packName,
          label: packName
            .replace(/sftpl-/, "")
            .split("-")
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
          type: documentType,
          package: moduleId,
          system: "sfrpg",
        }) as CompendiumCollection;
      } catch (err: unknown) {
        ModuleLogger.error(`[ConversionPipeline] Failed to create pack ${packId}: ${String(err)}`);
        return null;
      }
    }

    await pack.getIndex();
    return pack;
  }
}

// ── Minimal type shims for Foundry globals ──────────────────────────────────

declare const Item: {
  create(data: unknown, options?: Record<string, unknown>): Promise<unknown>;
};
declare const Actor: {
  create(data: unknown, options?: Record<string, unknown>): Promise<unknown>;
};
declare const JournalEntry: {
  create(data: unknown, options?: Record<string, unknown>): Promise<unknown>;
};
declare const CompendiumCollection: {
  createCompendium(data: Record<string, unknown>): Promise<unknown>;
  new(): CompendiumCollection;
};
interface CompendiumCollection {
  collection: string;
  index: Collection<{ _id: string; name: string }>;
  getIndex(): Promise<unknown>;
  getDocument(id: string): Promise<{ update(data: Record<string, unknown>): Promise<unknown> } | null>;
}
declare const game: {
  packs: { get(id: string): unknown };
};

// minimal Collection shim
interface Collection<T> {
  find(pred: (entry: T) => boolean): T | undefined;
}
