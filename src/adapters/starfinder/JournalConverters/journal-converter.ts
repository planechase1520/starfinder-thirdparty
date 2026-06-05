/**
 * Journal Converter — Milestone 3
 *
 * Converts a ContentRecord with category "journal" into a Foundry V13
 * JournalEntry document with a single HTML text page.
 *
 * Supports four sub-types via the `journalType` rawContent field:
 *   - "lore"       : general world lore and setting content
 *   - "rules"      : game-rule reference text
 *   - "pdf"        : a page with a PDF reference link
 *   - "sourcebook" : structured source-book entry (default)
 */

import type { ContentRecord } from "../../../database/content-record.js";
import type { ConversionResult, FoundryJournalData } from "../converter-types.js";
import type { ContentCategory } from "../../../database/content-record.js";
import { buildFlags } from "../converter-types.js";
import { ModuleLogger } from "../../../utils/logger.js";

const MODULE_ID = "starfinder-thirdparty";

export class JournalConverter {
  readonly category: ContentCategory = "journal";
  readonly documentType = "JournalEntry" as const;
  readonly sfrpgType = "journalEntry";
  readonly packSuffix = "sftpl-journals";

  get packId(): string {
    return `${MODULE_ID}.${this.packSuffix}`;
  }

  convert(record: ContentRecord): ConversionResult {
    const warnings: string[] = [];

    try {
      const journalType = String(record.rawContent["journalType"] ?? "sourcebook");
      const content = this.buildPageContent(record, journalType);
      const pageName = this.resolvePageName(record, journalType);

      const documentData: FoundryJournalData = {
        name: record.name,
        pages: [
          {
            name: pageName,
            type: "text",
            text: { content, format: 1 },
          },
        ],
        flags: buildFlags(record),
      };

      if (!record.sourceBook) warnings.push("Missing source book.");
      if (!record.publisher) warnings.push("Missing publisher.");

      return {
        success: true,
        documentData,
        documentType: "JournalEntry",
        packId: this.packId,
        warnings,
        errors: [],
        recordName: record.name,
        recordId: record.id,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ModuleLogger.error(`[JournalConverter] Failed to convert "${record.name}": ${message}`);
      return {
        success: false,
        documentData: null,
        documentType: "JournalEntry",
        packId: this.packId,
        warnings,
        errors: [message],
        recordName: record.name,
        recordId: record.id,
      };
    }
  }

  private buildPageContent(record: ContentRecord, journalType: string): string {
    const rawContent = record.rawContent;
    const description = String(rawContent["description"] ?? "");
    const source = `${record.sourceBook} pg. ${record.pageNumber}`;

    switch (journalType) {
      case "pdf": {
        const pdfUrl = String(rawContent["pdfUrl"] ?? "");
        return [
          `<h2>${record.name}</h2>`,
          `<p><em>Source: ${source}</em></p>`,
          pdfUrl ? `<p><a href="${pdfUrl}" target="_blank">Open PDF</a></p>` : "",
          description ? `<p>${description}</p>` : "",
        ].filter(Boolean).join("\n");
      }

      case "rules": {
        const ruleText = String(rawContent["ruleText"] ?? description);
        return [
          `<h2>${record.name}</h2>`,
          `<p><em>Source: ${source}</em></p>`,
          `<div class="rule-text">${ruleText}</div>`,
        ].join("\n");
      }

      case "lore": {
        const loreText = String(rawContent["loreText"] ?? description);
        return [
          `<h2>${record.name}</h2>`,
          `<p><em>Source: ${source}</em></p>`,
          `<p>${loreText}</p>`,
          record.tags.length > 0 ? `<p><strong>Tags:</strong> ${record.tags.join(", ")}</p>` : "",
        ].filter(Boolean).join("\n");
      }

      default: {
        const parts: string[] = [
          `<h2>${record.name}</h2>`,
          `<p><em>Source: ${source}</em></p>`,
          `<p><strong>Publisher:</strong> ${record.publisher}</p>`,
          record.author ? `<p><strong>Author:</strong> ${record.author}</p>` : "",
          description ? `<hr/><p>${description}</p>` : "",
          record.notes ? `<hr/><p><strong>GM Notes:</strong> ${record.notes}</p>` : "",
        ];
        return parts.filter(Boolean).join("\n");
      }
    }
  }

  private resolvePageName(record: ContentRecord, journalType: string): string {
    const typeLabels: Record<string, string> = {
      pdf: "PDF Reference",
      rules: "Rules Reference",
      lore: "Lore",
      sourcebook: "Entry",
    };
    return typeLabels[journalType] ?? "Entry";
  }
}
