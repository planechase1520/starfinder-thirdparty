import { ModuleLogger } from "../utils/logger.js";
import type { ContentCategory } from "../database/content-record.js";
import type {
  ExtractedRecord,
  ExtractionResult,
  ExtractionError,
  ProcessingProgress,
  ProgressCallback,
  DetectorMatch,
} from "./pdf-types.js";
import {
  makeExtractionRunId,
  makeExtractedRecordId,
} from "./pdf-types.js";
import { PdfTextExtractor } from "./PdfTextExtractor.js";
import { PdfPageScanner } from "./PdfPageScanner.js";

// ── Lazy-imported module shapes ──────────────────────────────────────────────

function emit(
  onProgress: ProgressCallback | undefined,
  progress: ProcessingProgress
): void {
  try {
    onProgress?.(progress);
  } catch {
    // never let a progress callback crash the pipeline
  }
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("Cancelled");
  }
}

/**
 * Orchestrates the full PDF → ExtractedRecord pipeline.
 */
export class PdfProcessor {
  /**
   * Processes a single PDF file through the full extraction pipeline.
   *
   * @param file - The browser File object to process.
   * @param sourceBook - The name of the source book.
   * @param publisher - The name of the publisher.
   * @param options - Pipeline configuration.
   * @returns Resolved ExtractionResult.
   */
  static async process(
    file: File,
    sourceBook: string,
    publisher: string,
    options: {
      enableOcr?: boolean;
      enableAi?: boolean;
      aiApiKey?: string;
      aiModel?: string;
      abortSignal?: AbortSignal;
      onProgress?: ProgressCallback;
    }
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const runId = makeExtractionRunId();
    const errors: ExtractionError[] = [];
    const allRecords: ExtractedRecord[] = [];
    const { onProgress, abortSignal } = options;

    // ── Phase 1: loading ─────────────────────────────────────────────────────

    emit(onProgress, {
      phase: "loading",
      currentPage: 0,
      totalPages: 0,
      recordsFound: 0,
      message: `Loading "${file.name}"…`,
      percent: 0,
    });

    checkAbort(abortSignal);

    // ── Phase 2: extracting-text ─────────────────────────────────────────────

    let pdfDoc;
    try {
      pdfDoc = await PdfTextExtractor.extractFromFile(file, (progress) => {
        checkAbort(abortSignal);
        emit(onProgress, {
          ...progress,
          percent: Math.round(progress.percent * 0.25), // Map 0-100% to 0-25%
        });
      });
    } catch (err: any) {
      throw new Error(`[PdfProcessor] Text extraction failed for "${file.name}": ${err?.message || String(err)}`);
    }

    const pages = pdfDoc.pages;
    const totalPages = pages.length;

    // ── Phase 3: ocr ─────────────────────────────────────────────────────────

    let ocrPageCount = 0;
    let ocrConfidenceSum = 0;

    if (options.enableOcr) {
      checkAbort(abortSignal);

      emit(onProgress, {
        phase: "ocr",
        currentPage: 0,
        totalPages,
        recordsFound: 0,
        message: "Checking pages for OCR…",
        percent: 25,
      });

      // Filter pages with textLength < 100 for OCR
      const sparsePages = pages.filter((p) => p.textLength < 100);

      if (sparsePages.length > 0) {
        let ocrModule: any;
        try {
          ocrModule = await import("../ocr/OcrManager.js");
          await ocrModule.OcrManager.initialize();
        } catch (err: unknown) {
          ModuleLogger.warn(
            `[PdfProcessor] OcrManager not available — skipping OCR: ${String(err)}`
          );
          errors.push({
            page: 0,
            phase: "ocr",
            message: `OcrManager unavailable: ${String(err)}`,
            code: "OCR_INITIALIZE_FAILED",
          });
        }

        if (ocrModule) {
          try {
            const pdfjsLib = (globalThis as any).pdfjsLib;
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDocProxy = await loadingTask.promise;

            for (let i = 0; i < sparsePages.length; i++) {
              checkAbort(abortSignal);

              const page = sparsePages[i];
              const ocrPercent = 25 + Math.round(((i + 1) / sparsePages.length) * 25);

              emit(onProgress, {
                phase: "ocr",
                currentPage: page.pageNumber,
                totalPages,
                recordsFound: 0,
                message: `OCR — page ${page.pageNumber} (${i + 1}/${sparsePages.length})`,
                percent: ocrPercent,
              });

              try {
                const pdfJsPage = await pdfDocProxy.getPage(page.pageNumber);
                const result = await ocrModule.OcrManager.recognizePage(pdfJsPage, page.pageNumber);
                pdfJsPage.cleanup();

                if (result.text.trim().length > 0) {
                  const idx = pages.findIndex((p) => p.pageNumber === page.pageNumber);
                  if (idx >= 0) {
                    const ocrText = result.text.trim();
                    pages[idx] = {
                      ...pages[idx],
                      text: ocrText,
                      textLength: ocrText.length,
                      wasOcr: true,
                      ocrConfidence: result.confidence,
                      wordCount: ocrText.split(/\s+/).filter((w: string) => w.length > 0).length,
                    };
                  }
                  ocrConfidenceSum += result.confidence;
                  ocrPageCount++;
                }
              } catch (err: unknown) {
                ModuleLogger.warn(
                  `[PdfProcessor] OCR failed for page ${page.pageNumber}: ${String(err)}`
                );
                errors.push({
                  page: page.pageNumber,
                  phase: "ocr",
                  message: String(err),
                  code: "OCR_PAGE_FAILED",
                });
              }
            }

            try {
              pdfDocProxy.destroy();
            } catch {
              // ignore destroy failures
            }
          } catch (err: any) {
            ModuleLogger.warn(`[PdfProcessor] PDF loading for OCR failed: ${String(err)}`);
            errors.push({
              page: 0,
              phase: "ocr",
              message: `PDF load failed for OCR: ${String(err)}`,
              code: "PDF_LOAD_OCR_FAILED",
            });
          } finally {
            try {
              ocrModule.OcrManager.terminate();
            } catch {
              // ignore terminate failures
            }
          }
        }
      }
    }

    // ── Phase 4: detecting ───────────────────────────────────────────────────

    checkAbort(abortSignal);

    emit(onProgress, {
      phase: "detecting",
      currentPage: 0,
      totalPages,
      recordsFound: 0,
      message: "Scanning pages for content…",
      percent: 50,
    });

    const blocks = PdfPageScanner.scanPages(pages, sourceBook);

    let classifierModule: any = null;
    try {
      classifierModule = await import("../extraction/ContentClassifier.js");
    } catch (err: unknown) {
      ModuleLogger.warn(
        `[PdfProcessor] ContentClassifier not available: ${String(err)}`
      );
      errors.push({
        page: 0,
        phase: "detection",
        message: `ContentClassifier unavailable: ${String(err)}`,
        code: "CLASSIFIER_UNAVAILABLE",
      });
    }

    if (classifierModule && blocks.length > 0) {
      try {
        const result = classifierModule.ContentClassifier.classify(blocks);
        for (const match of result.matches) {
          const category = (match.structuredData._category as ContentCategory) || "journal";
          allRecords.push(
            this.buildRecord(match, category, sourceBook, publisher, "regex")
          );
        }
      } catch (err: any) {
        ModuleLogger.warn(
          `[PdfProcessor] Classification failed: ${String(err)}`
        );
        errors.push({
          page: 0,
          phase: "detection",
          message: String(err),
          code: "CLASSIFICATION_FAILED",
        });
      }
    }

    // ── Phase 5: ai-refining ─────────────────────────────────────────────────

    let aiUsed = false;

    if (options.enableAi && options.aiApiKey && allRecords.length > 0) {
      checkAbort(abortSignal);

      emit(onProgress, {
        phase: "ai-refining",
        currentPage: 0,
        totalPages,
        recordsFound: allRecords.length,
        message: "AI refining low-confidence records…",
        percent: 75,
      });

      let aiModule: any = null;
      let aiProviderModule: any = null;
      try {
        aiModule = await import("../ai/AiExtractionEngine.js");
        aiProviderModule = await import("../ai/AiProvider.js");
      } catch (err: unknown) {
        ModuleLogger.warn(
          `[PdfProcessor] AiExtractionEngine not available: ${String(err)}`
        );
        errors.push({
          page: 0,
          phase: "ai",
          message: `AiExtractionEngine unavailable: ${String(err)}`,
          code: "AI_ENGINE_UNAVAILABLE",
        });
      }

      if (aiModule && aiProviderModule) {
        try {
          const provider = new aiProviderModule.OpenAiCompatibleProvider(
            "https://api.openai.com",
            options.aiApiKey,
            options.aiModel || "gpt-4o-mini"
          );
          const aiEngine = new aiModule.AiExtractionEngine(provider);

          const refined = await aiEngine.refineBatch(
            allRecords,
            sourceBook,
            (done: number, total: number) => {
              checkAbort(abortSignal);
              emit(onProgress, {
                phase: "ai-refining",
                currentPage: done > 0 && done <= allRecords.length ? allRecords[done - 1].sourcePageNumber : 0,
                totalPages,
                recordsFound: allRecords.length,
                message: `AI refining record ${done} of ${total}`,
                percent: 75 + Math.round((done / total) * 15),
              });
            }
          );

          allRecords.length = 0;
          allRecords.push(...refined);
          aiUsed = true;
        } catch (err: any) {
          ModuleLogger.warn(
            `[PdfProcessor] AI refinement failed: ${String(err)}`
          );
          errors.push({
            page: 0,
            phase: "ai",
            message: String(err),
            code: "AI_REFINE_FAILED",
          });
        }
      }
    }

    // ── Phase 6: building-records ────────────────────────────────────────────

    checkAbort(abortSignal);

    emit(onProgress, {
      phase: "building-records",
      currentPage: totalPages,
      totalPages,
      recordsFound: allRecords.length,
      message: `Building ${allRecords.length} records…`,
      percent: 95,
    });

    const averageOcrConfidence =
      ocrPageCount > 0 ? ocrConfidenceSum / ocrPageCount : 0;

    const result: ExtractionResult = {
      runId,
      sourceFile: file.name,
      sourceBook,
      publisher,
      extractedAt: new Date().toISOString(),
      totalPages: pdfDoc.metadata.pageCount || totalPages,
      pagesProcessed: totalPages,
      ocrPages: ocrPageCount,
      averageOcrConfidence,
      aiUsed,
      records: allRecords,
      errors,
      durationMs: Date.now() - startTime,
    };

    emit(onProgress, {
      phase: "done",
      currentPage: totalPages,
      totalPages,
      recordsFound: allRecords.length,
      message: `Done — found ${allRecords.length} records in ${result.durationMs}ms`,
      percent: 100,
    });

    ModuleLogger.info(
      `[PdfProcessor] Completed "${file.name}" in ${result.durationMs}ms: ` +
        `${allRecords.length} records, ${errors.length} errors, OCR pages: ${ocrPageCount}`
    );

    return result;
  }

  /**
   * Assembles an ExtractedRecord from a detector match and run-level metadata.
   */
  private static buildRecord(
    match: DetectorMatch,
    category: ContentCategory,
    sourceBook: string,
    publisher: string,
    source: "regex" | "ai"
  ): ExtractedRecord {
    return {
      id: makeExtractedRecordId(),
      name: match.name,
      category,
      rawText: match.rawText,
      structuredData: match.structuredData,
      sourcePageNumber: match.pageNumber,
      sourceBook,
      publisher,
      confidence: match.confidence,
      detectionMethod: source,
      status: "pending",
      notes: "",
      autoTags: match.autoTags,
    };
  }
}
