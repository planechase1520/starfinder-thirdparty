/**
 * Compendium Manager
 *
 * Handles all interactions with Foundry VTT compendium packs:
 * - Looking up packs by content type
 * - Creating and importing documents into packs
 * - Checking for duplicates
 * - Batch importing multiple documents
 *
 * Uses the V13 CompendiumCollection API.
 */

import type {
  TransformedDocument,
  ImportSession,
  CreatedDocumentRef,
  ParseError,
  BrowseEntry,
} from "../types/module-types.js";
import { getPackForContentType, PACK_CONFIGS, type PackConfig } from "./pack-config.js";
import { MetadataManager } from "../metadata/metadata-manager.js";
import { ModuleLogger } from "../utils/logger.js";

export interface ImportOptions {
  /** If true, skip documents whose name already exists in the target pack. */
  skipDuplicates?: boolean;
  /** If true, overwrite existing documents with matching names. */
  overwriteDuplicates?: boolean;
  /** Callback invoked after each document is processed (for progress UI). */
  onProgress?: (current: number, total: number, name: string) => void;
}

export class CompendiumManager {

  /**
   * Imports a batch of transformed documents into their respective packs.
   * Updates the provided ImportSession with results.
   *
   * @param documents Transformed documents ready for import.
   * @param session The active import session (mutated in place).
   * @param options Import options.
   */
  static async importDocuments(
    documents: TransformedDocument[],
    session: ImportSession,
    options: ImportOptions = {}
  ): Promise<void> {
    const { skipDuplicates = true, overwriteDuplicates = false, onProgress } = options;
    session.totalEntries = documents.length;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]!;
      const name = doc.name;

      try {
        onProgress?.(i + 1, documents.length, name);

        // Find the target pack
        const packConfig = getPackForContentType(doc.metadata.contentType);
        if (!packConfig) {
          this.recordError(session, {
            code: "NO_PACK_CONFIG",
            message: `No compendium pack configured for content type '${doc.metadata.contentType}'.`,
            severity: "error",
            sourceReference: doc.source.sourceReference,
          });
          session.failureCount++;
          continue;
        }

        const pack = this.getPack(packConfig.packId);
        if (!pack) {
          this.recordError(session, {
            code: "PACK_NOT_FOUND",
            message: `Compendium pack '${packConfig.packId}' not found. Ensure the module is active.`,
            severity: "error",
            sourceReference: doc.source.sourceReference,
          });
          session.failureCount++;
          continue;
        }

        if (pack.locked) {
          this.recordError(session, {
            code: "PACK_LOCKED",
            message: `Compendium pack '${packConfig.packId}' is locked and cannot be modified.`,
            severity: "error",
            sourceReference: doc.source.sourceReference,
          });
          session.failureCount++;
          continue;
        }

        // Check for duplicate by name
        const existing = pack.getName(name) as { id: string } | undefined;
        if (existing) {
          if (skipDuplicates && !overwriteDuplicates) {
            ModuleLogger.info(`[CompendiumManager] Skipping duplicate: ${name}`);
            session.skippedCount++;
            continue;
          }
          if (overwriteDuplicates) {
            await this.overwriteDocument(pack, existing.id, doc, packConfig, session);
            continue;
          }
        }

        // Create the new document
        await this.createDocument(pack, doc, packConfig, session);

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        ModuleLogger.error(`[CompendiumManager] Failed to import '${name}': ${message}`);
        this.recordError(session, {
          code: "IMPORT_ERROR",
          message: `Failed to import '${name}': ${message}`,
          severity: "error",
          sourceReference: doc.source.sourceReference,
          data: err,
        });
        session.failureCount++;
      }
    }
  }

  /**
   * Retrieves all documents from the module's packs that have SF3PL metadata.
   * Used by the Content Browser.
   */
  static async getAllImportedDocuments(): Promise<BrowseEntry[]> {
    const entries: BrowseEntry[] = [];

    for (const [packId, packConfig] of Object.entries(PACK_CONFIGS)) {
      const pack = this.getPack(packId);
      if (!pack) continue;

      let rawDocs: unknown[];
      try {
        rawDocs = await pack.getDocuments();
      } catch {
        ModuleLogger.warn(`[CompendiumManager] Could not load documents from pack '${packId}'.`);
        continue;
      }

      for (const rawDoc of rawDocs) {
        const doc = rawDoc as { id: string; name: string; getFlag: (scope: string, key: string) => unknown };
        const metadata = MetadataManager.getMetadataFromFlags(doc);
        if (!metadata) continue;

        entries.push({
          id: doc.id,
          name: doc.name,
          contentType: metadata.contentType,
          metadata,
          packName: packConfig.packName,
          documentType: packConfig.documentType,
        });
      }
    }

    return entries;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private static getPack(packId: string): CompendiumCollection | undefined {
    return game.packs.get(packId) as CompendiumCollection | undefined;
  }

  private static async createDocument(
    pack: CompendiumCollection,
    doc: TransformedDocument,
    packConfig: PackConfig,
    session: ImportSession
  ): Promise<void> {
    const documentData = this.buildDocumentData(doc, packConfig);
    const DocumentClass = pack.documentClass as typeof Item | typeof Actor | typeof JournalEntry;

    const created = await (DocumentClass as typeof Item).create(documentData, {
      pack: packConfig.packId,
    });

    if (!created) {
      throw new Error(`Document creation returned null for '${doc.name}'.`);
    }

    const ref: CreatedDocumentRef = {
      documentType: doc.documentType,
      id: (created as unknown as { id: string }).id,
      name: doc.name,
      packName: packConfig.packName,
      contentType: doc.metadata.contentType,
    };

    session.createdDocuments.push(ref);
    session.successCount++;
    ModuleLogger.info(`[CompendiumManager] Created ${doc.documentType}: ${doc.name} → ${packConfig.packId}`);
  }

  private static async overwriteDocument(
    pack: CompendiumCollection,
    existingId: string,
    doc: TransformedDocument,
    packConfig: PackConfig,
    session: ImportSession
  ): Promise<void> {
    const existing = pack.get(existingId) as (Item & { update: (data: Record<string, unknown>) => Promise<unknown> }) | undefined;
    if (!existing) {
      await this.createDocument(pack, doc, packConfig, session);
      return;
    }

    const updateData = this.buildDocumentData(doc, packConfig);
    await existing.update(updateData);

    const ref: CreatedDocumentRef = {
      documentType: doc.documentType,
      id: existingId,
      name: doc.name,
      packName: packConfig.packName,
      contentType: doc.metadata.contentType,
    };

    session.createdDocuments.push(ref);
    session.successCount++;
    ModuleLogger.info(`[CompendiumManager] Overwrote ${doc.documentType}: ${doc.name} in ${packConfig.packId}`);
  }

  /**
   * Builds the Foundry document data object from a TransformedDocument.
   * Attaches metadata to flags for later retrieval.
   */
  private static buildDocumentData(doc: TransformedDocument, packConfig: PackConfig): Record<string, unknown> {
    const baseData: Record<string, unknown> = {
      name: doc.name,
      type: doc.systemType,
      system: doc.system,
      flags: MetadataManager.buildFlags(doc.metadata),
    };

    if (packConfig.documentType === "JournalEntry") {
      const content = (doc.system["content"] as string | undefined) ?? "";
      baseData["pages"] = [
        {
          name: doc.name,
          type: "text",
          text: { content, format: 1 },
        },
      ];
      delete baseData["type"];
      delete baseData["system"];
    }

    return baseData;
  }

  private static recordError(session: ImportSession, error: ParseError): void {
    session.errors.push(error);
  }
}
