import { ModuleLogger } from "../utils/logger.js";
import type { PdfFileMetadata } from "./pdf-types.js";

interface PdfJsInfo {
  Title?: string;
  Author?: string;
  Subject?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
}

interface PdfJsDocumentProxy {
  numPages: number;
  getMetadata(): Promise<{ info: Record<string, unknown>; metadata: unknown }>;
  destroy(): void;
}

interface MinimalPdfjsLib {
  getDocument(source: { data: ArrayBuffer }): {
    promise: Promise<unknown>;
    destroy(): void;
  };
  GlobalWorkerOptions: { workerSrc: string };
}

const WORKER_SRC = "scripts/pdfjs/pdf.worker.mjs";

const KNOWN_PUBLISHERS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /paizo/i, name: "Paizo" },
  { pattern: /starjammer/i, name: "Starjammer" },
  { pattern: /rogue\s*genius/i, name: "Rogue Genius Games" },
  { pattern: /legendary\s*games/i, name: "Legendary Games" },
  { pattern: /fat\s*goblin/i, name: "Fat Goblin Games" },
  { pattern: /dreamscarred/i, name: "Dreamscarred Press" },
];

function toTitleCase(str: string): string {
  return str
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

/**
 * Extracts bibliographic metadata from a PDF.js document proxy, including
 * title, author, date fields, and heuristic guesses for source book and
 * publisher names used throughout the extraction pipeline.
 */
export class PdfMetadataExtractor {
  /**
   * Extracts PdfFileMetadata from a PDF.js PDFDocumentProxy.
   * Calls `pdfDoc.getMetadata()` and normalises the returned info object.
   *
   * @param pdfDoc - A PDF.js PDFDocumentProxy instance (typed as unknown for
   *   compatibility with the untyped pdfjsLib global).
   * @param filename - Original filename used as a fallback for title guessing.
   * @returns Resolved PdfFileMetadata for the document.
   */
  static async extract(
    pdfDoc: unknown,
    filename: string
  ): Promise<PdfFileMetadata> {
    const doc = pdfDoc as PdfJsDocumentProxy;
    let info: PdfJsInfo = {};
    let pageCount = 0;

    try {
      const result = await doc.getMetadata();
      info = (result.info ?? {}) as PdfJsInfo;
      pageCount = doc.numPages;
    } catch (err: unknown) {
      ModuleLogger.warn(
        `[PdfMetadataExtractor] Could not read metadata from "${filename}": ${String(err)}`
      );
      try {
        pageCount = doc.numPages;
      } catch {
        pageCount = 0;
      }
    }

    const title =
      typeof info.Title === "string" && info.Title.trim().length > 0
        ? info.Title.trim()
        : undefined;
    const author =
      typeof info.Author === "string" && info.Author.trim().length > 0
        ? info.Author.trim()
        : undefined;
    const subject =
      typeof info.Subject === "string" && info.Subject.trim().length > 0
        ? info.Subject.trim()
        : undefined;
    const creator =
      typeof info.Creator === "string" && info.Creator.trim().length > 0
        ? info.Creator.trim()
        : undefined;
    const producer =
      typeof info.Producer === "string" && info.Producer.trim().length > 0
        ? info.Producer.trim()
        : undefined;

    const creationDate =
      typeof info.CreationDate === "string"
        ? this.parsePdfDate(info.CreationDate)
        : undefined;
    const modificationDate =
      typeof info.ModDate === "string"
        ? this.parsePdfDate(info.ModDate)
        : undefined;

    const result: PdfFileMetadata = {
      pageCount,
      guessedSourceBook: this.guessSourceBook(title, filename),
      guessedPublisher: this.guessPublisher(author, producer),
    };

    if (title !== undefined) result.title = title;
    if (author !== undefined) result.author = author;
    if (subject !== undefined) result.subject = subject;
    if (creator !== undefined) result.creator = creator;
    if (producer !== undefined) result.producer = producer;
    if (creationDate !== undefined) result.creationDate = creationDate;
    if (modificationDate !== undefined) result.modificationDate = modificationDate;

    return result;
  }

  /**
   * Convenience method that opens a PDF from an ArrayBuffer solely to read
   * its metadata, then immediately destroys the document.
   * Callers that already hold a pdfDoc reference should prefer `extract()`.
   *
   * @param buffer - Raw PDF bytes.
   * @param filename - Original filename used as a fallback for title guessing.
   * @returns Resolved PdfFileMetadata, or a filename-derived fallback on error.
   */
  static async extractFromBuffer(
    buffer: ArrayBuffer,
    filename: string
  ): Promise<PdfFileMetadata> {
    const pdfjsLib = (globalThis as Record<string, unknown>)[
      "pdfjsLib"
    ] as MinimalPdfjsLib | undefined;

    if (!pdfjsLib) {
      ModuleLogger.warn(
        "[PdfMetadataExtractor] pdfjsLib not available; returning filename-based fallback metadata."
      );
      return this.buildFallback(filename, 0);
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
    const loadingTask = pdfjsLib.getDocument({ data: buffer });

    try {
      const pdfDoc = await loadingTask.promise;
      const metadata = await this.extract(pdfDoc, filename);
      (pdfDoc as PdfJsDocumentProxy).destroy();
      return metadata;
    } catch (err: unknown) {
      ModuleLogger.warn(
        `[PdfMetadataExtractor] Failed to open PDF for metadata extraction: ${String(err)}`
      );
      return this.buildFallback(filename, 0);
    }
  }

  /**
   * Derives a human-readable source book name from PDF title metadata or,
   * if the title is absent or shorter than the filename stem, from the
   * filename itself.
   *
   * @param title - The Title field from PDF info, if present.
   * @param filename - The original filename.
   * @returns A title-cased source book name.
   */
  private static guessSourceBook(
    title: string | undefined,
    filename: string
  ): string {
    const filenameStem = filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();

    if (title && title.length > 3 && title.length >= filenameStem.length) {
      return title;
    }

    return toTitleCase(filenameStem);
  }

  /**
   * Attempts to identify the publisher by matching the Author and Producer
   * metadata fields against a list of known Starfinder/Pathfinder publishers.
   *
   * @param author - The Author field from PDF info.
   * @param producer - The Producer field from PDF info (often the PDF tool).
   * @returns Matched publisher name, or "Unknown Publisher".
   */
  private static guessPublisher(
    author: string | undefined,
    producer: string | undefined
  ): string {
    const haystack = `${author ?? ""} ${producer ?? ""}`;
    for (const { pattern, name } of KNOWN_PUBLISHERS) {
      if (pattern.test(haystack)) return name;
    }
    return "Unknown Publisher";
  }

  /**
   * Converts a PDF date string in the format "D:YYYYMMDDHHmmSS[±HH'mm']"
   * to an ISO 8601 string. Returns the original string if parsing fails.
   */
  private static parsePdfDate(pdfDate: string): string {
    const match = pdfDate.match(
      /^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/
    );
    if (!match) return pdfDate;
    const [, y, mo, d, h, mi, s] = match;
    try {
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).toISOString();
    } catch {
      return pdfDate;
    }
  }

  private static buildFallback(filename: string, pageCount: number): PdfFileMetadata {
    const stem = filename.replace(/\.pdf$/i, "");
    return {
      pageCount,
      guessedSourceBook: toTitleCase(stem),
      guessedPublisher: "Unknown Publisher",
    };
  }
}
