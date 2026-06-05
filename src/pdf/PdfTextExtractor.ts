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

const WORKER_SRC = "scripts/pdfjs/pdf.worker.mjs";
const OCR_TEXT_THRESHOLD = 50;

function getPdfjsLib(): PdfJsLib {
  const lib = (globalThis as Record<string, unknown>)["pdfjsLib"] as
    | PdfJsLib
    | undefined;
  if (!lib) {
    throw new Error(
      "[PdfTextExtractor] pdfjsLib is not available on globalThis. " +
        "Ensure Foundry VTT has loaded PDF.js before using this module."
    );
  }
  return lib;
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

    const pdfjsLib = getPdfjsLib();
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;

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
