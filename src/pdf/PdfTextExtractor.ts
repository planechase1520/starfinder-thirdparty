import { ModuleLogger } from "../utils/logger.js";
import type { PdfDocument, PdfPage, ProgressCallback } from "./pdf-types.js";
import { PdfMetadataExtractor } from "./PdfMetadataExtractor.js";

interface PdfJsTextItem {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
}

interface PdfJsMarkedContent {
  type: string;
}

type PdfJsContentItem = PdfJsTextItem | PdfJsMarkedContent;

interface PdfJsTextContent {
  items: PdfJsContentItem[];
}

interface PdfJsPage {
  getTextContent(params?: {
    normalizeWhitespace?: boolean;
    includeMarkedContent?: boolean;
  }): Promise<PdfJsTextContent>;
  cleanup(): void;
}

interface PdfJsDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
  getMetadata(): Promise<{ info: Record<string, unknown>; metadata: unknown }>;
  destroy(): void;
}

interface PdfJsLoadingTask {
  promise: Promise<PdfJsDocument>;
  destroy(): void;
}

interface PdfJsLib {
  getDocument(source: { data: ArrayBuffer }): PdfJsLoadingTask;
  GlobalWorkerOptions: { workerSrc: string };
}

const OCR_TEXT_THRESHOLD = 50;

/**
 * Candidate paths / URLs tried in order when loading PDF.js.
 *
 * 1. Foundry VTT V13 bundles PDF.js at /scripts/pdfjs/pdf.mjs  (preferred — no CDN needed).
 * 2. Older Foundry builds used pdf.min.mjs.
 * 3. CDN fallback so the feature still works if Foundry ever moves the files.
 *
 * Each entry is [libUrl, workerUrl].
 */
const PDFJS_CANDIDATES: Array<[string, string]> = [
  ["/scripts/pdfjs/pdf.mjs",     "/scripts/pdfjs/pdf.worker.mjs"],
  ["/scripts/pdfjs/pdf.min.mjs", "/scripts/pdfjs/pdf.worker.min.mjs"],
  [
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs",
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs",
  ],
];

let _pdfjsLibCache: PdfJsLib | null = null;

/**
 * Resolves the PDF.js library, trying in order:
 *   1. globalThis.pdfjsLib  (set if something already loaded it)
 *   2. Dynamic import from Foundry's bundled copy (/scripts/pdfjs/pdf.mjs)
 *   3. Dynamic import from CDN (fallback)
 *
 * The result is cached so subsequent calls are free.
 */
async function getPdfjsLib(): Promise<PdfJsLib> {
  if (_pdfjsLibCache) return _pdfjsLibCache;

  const existing = (globalThis as Record<string, unknown>)["pdfjsLib"] as PdfJsLib | undefined;
  if (existing?.getDocument) {
    ModuleLogger.info("[PdfTextExtractor] Using pdfjsLib from globalThis.");
    _pdfjsLibCache = existing;
    return existing;
  }

  for (const [libUrl, workerUrl] of PDFJS_CANDIDATES) {
    try {
      const mod = await import(/* @vite-ignore */ libUrl) as
        ({ default: PdfJsLib } | PdfJsLib) & Record<string, unknown>;

      const defaultExport = ("default" in mod) ? (mod as Record<string, unknown>)["default"] : undefined;
      const lib: PdfJsLib = (defaultExport && typeof (defaultExport as PdfJsLib).getDocument === "function")
        ? (defaultExport as PdfJsLib)
        : (mod as unknown as PdfJsLib);

      if (typeof lib?.getDocument !== "function") continue;

      lib.GlobalWorkerOptions.workerSrc = workerUrl;
      ModuleLogger.info(`[PdfTextExtractor] Loaded PDF.js from: ${libUrl}`);
      _pdfjsLibCache = lib;
      return lib;
    } catch (err) {
      ModuleLogger.debug(`[PdfTextExtractor] Could not load PDF.js from ${libUrl}: ${String(err)}`);
    }
  }

  throw new Error(
    "[PdfTextExtractor] Could not load PDF.js from any source. " +
    "Ensure Foundry VTT is up to date or check your network connection for CDN fallback."
  );
}

/**
 * Extracts raw text content from PDF files using the PDF.js library bundled
 * with Foundry VTT. This is the first stage of the PDF processing pipeline.
 *
 * Pages with fewer than 50 characters of extracted text have their textLength
 * set accordingly, signalling downstream processors that OCR may be required.
 */
export class PdfTextExtractor {
  /**
   * Reads a browser File object and extracts text from every page.
   *
   * @param file - The PDF File to process.
   * @param onProgress - Optional progress callback.
   * @returns Resolved PdfDocument containing metadata and pages.
   */
  static async extractFromFile(
    file: File,
    onProgress?: ProgressCallback
  ): Promise<PdfDocument> {
    const reader = new FileReader();

    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });

    const pdfjsLib = await getPdfjsLib();

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    let pdfDoc: PdfJsDocument;

    try {
      pdfDoc = await loadingTask.promise;
    } catch (err: any) {
      if (err && err.name === "PasswordException") {
        throw new Error("Failed to extract text: The PDF is password-protected or encrypted.");
      } else if (err && err.name === "InvalidPDFException") {
        throw new Error("Failed to extract text: The PDF file is invalid or corrupt.");
      } else {
        throw new Error(`Failed to extract text: ${err?.message || String(err)}`);
      }
    }

    const totalPages = pdfDoc.numPages;
    const pages: PdfPage[] = [];

    // Extract metadata
    const metadata = await PdfMetadataExtractor.extract(pdfDoc, file.name);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent({
          normalizeWhitespace: true,
          includeMarkedContent: false,
        });
        page.cleanup();

        // Join text items preserving line breaks using transforms and coordinates
        let rawText = "";
        let lastY: number | null = null;
        for (const item of textContent.items) {
          if ("str" in item) {
            const textItem = item as PdfJsTextItem;
            if (lastY !== null && textItem.transform && Math.abs(textItem.transform[5] - lastY) > 2) {
              rawText += "\n";
            } else if (rawText.length > 0 && !rawText.endsWith(" ") && !rawText.endsWith("\n")) {
              rawText += " ";
            }
            if (textItem.str) {
              rawText += textItem.str;
            }
            if (textItem.transform) {
              lastY = textItem.transform[5];
            }
          }
        }

        const text = rawText
          .replace(/[ \t]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        const textLength = text.length;
        const wordCount =
          textLength > 0
            ? text.split(/\s+/).filter((w) => w.length > 0).length
            : 0;

        if (textLength < OCR_TEXT_THRESHOLD) {
          ModuleLogger.debug(
            `[PdfTextExtractor] Page ${pageNum} of "${file.name}" has sparse text ` +
              `(${textLength} chars) — may need OCR.`
          );
        }

        pages.push({
          pageNumber: pageNum,
          text,
          textLength,
          wasOcr: false,
          wordCount,
        });
      } catch (err: unknown) {
        ModuleLogger.warn(
          `[PdfTextExtractor] Failed to extract page ${pageNum} of "${file.name}": ${String(err)}`
        );
        pages.push({
          pageNumber: pageNum,
          text: "",
          textLength: 0,
          wasOcr: false,
          wordCount: 0,
        });
      }

      onProgress?.({
        phase: "extracting-text",
        currentPage: pageNum,
        totalPages,
        recordsFound: 0,
        message: `Extracted text from page ${pageNum} of ${totalPages}`,
        percent: Math.round((pageNum / totalPages) * 100),
      });
    }

    try {
      pdfDoc.destroy();
    } catch {
      // non-fatal cleanup failure
    }

    ModuleLogger.info(
      `[PdfTextExtractor] Extracted text from ${pages.length} pages of "${file.name}".`
    );

    return {
      filename: file.name,
      metadata,
      pages,
      usedOcr: false,
      averageOcrConfidence: 0,
    };
  }
}
