/**
 * PDF Types — Milestone 5
 *
 * Shared type definitions used across the PDF processing, OCR, extraction,
 * review, and AI subsystems. All other M5 modules import from this file.
 *
 * Data flow:
 *   File (PDF)
 *     → PdfTextExtractor  → PdfPage[]
 *     → OcrManager        → PdfPage[] (with OCR-filled text)
 *     → ContentClassifier → ExtractedBlock[]
 *     → [type]Detector    → ExtractedRecord[]
 *     → AiExtractionEngine (optional refinement)
 *     → ExtractionResult  (stored by PdfImportManager)
 *     → ContentRecord[]   (saved to ContentDatabase after user review)
 */

import type { ContentCategory } from "../database/content-record.js";

// ── Page-level types ──────────────────────────────────────────────────────────

/** Text and metadata for a single PDF page. */
export interface PdfPage {
  pageNumber: number;
  /** Full text content extracted from the page. */
  text: string;
  /** Character count of usable text (used to decide if OCR is needed). */
  textLength: number;
  /** Whether this page's text came from OCR rather than embedded text. */
  wasOcr: boolean;
  /** OCR confidence score 0–100 (only set when wasOcr = true). */
  ocrConfidence?: number;
  /** Approximate word count on the page. */
  wordCount: number;
}

/** Metadata extracted from the PDF file itself. */
export interface PdfFileMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
  /** Best-guess source book name derived from title or filename. */
  guessedSourceBook: string;
  /** Best-guess publisher derived from producer or author. */
  guessedPublisher: string;
}

/** A complete PDF document with all pages extracted. */
export interface PdfDocument {
  /** Original filename of the uploaded PDF. */
  filename: string;
  metadata: PdfFileMetadata;
  pages: PdfPage[];
  /** Whether at least one page used OCR. */
  usedOcr: boolean;
  /** Average OCR confidence across OCR pages (0 when no OCR was used). */
  averageOcrConfidence: number;
}

// ── Extraction types ──────────────────────────────────────────────────────────

/** How the content type was identified. */
export type DetectionMethod = "regex" | "ai" | "manual";

/** The review status of an extracted record before it is saved. */
export type ExtractedRecordStatus = "pending" | "accepted" | "rejected" | "edited";

/**
 * A single piece of Starfinder content identified from raw PDF text.
 * Before user review, status = "pending".
 * After review, status transitions to "accepted", "rejected", or "edited".
 */
export interface ExtractedRecord {
  /** UUID generated at extraction time. */
  id: string;
  /** Detected name of the item, creature, spell, etc. */
  name: string;
  /** Best-guess content category. */
  category: ContentCategory;
  /** The raw text block that was parsed to produce this record. */
  rawText: string;
  /** Structured field data extracted from rawText. Maps to ContentRecord.rawContent. */
  structuredData: Record<string, unknown>;
  /** Page number where the content was found. */
  sourcePageNumber: number;
  /** Source book name (from PDF metadata or user input). */
  sourceBook: string;
  /** Publisher name (from PDF metadata or user input). */
  publisher: string;
  /** Confidence score 0–1 from the detector or AI. */
  confidence: number;
  detectionMethod: DetectionMethod;
  status: ExtractedRecordStatus;
  /** Optional user or AI notes about this record. */
  notes: string;
  /** Tags auto-applied by the detector. */
  autoTags: string[];
}

/** Errors encountered during a single extraction run. */
export interface ExtractionError {
  page: number;
  phase: "text-extraction" | "ocr" | "detection" | "ai";
  message: string;
  code: string;
}

/** The complete result of processing one PDF file. */
export interface ExtractionResult {
  /** UUID for this extraction run. */
  runId: string;
  /** Original filename. */
  sourceFile: string;
  /** Source book name used for all records. */
  sourceBook: string;
  /** Publisher name used for all records. */
  publisher: string;
  /** ISO timestamp when the extraction was run. */
  extractedAt: string;
  /** Total pages in the PDF. */
  totalPages: number;
  /** Pages that were successfully processed. */
  pagesProcessed: number;
  /** Pages where OCR was used. */
  ocrPages: number;
  /** Average OCR confidence across OCR pages. */
  averageOcrConfidence: number;
  /** Whether AI was used for any records. */
  aiUsed: boolean;
  /** All extracted records (pending review). */
  records: ExtractedRecord[];
  /** Errors that did not stop processing but should be reported. */
  errors: ExtractionError[];
  /** Total extraction duration in milliseconds. */
  durationMs: number;
}

// ── Processing progress ───────────────────────────────────────────────────────

export type ProcessingPhase =
  | "loading"
  | "extracting-text"
  | "ocr"
  | "detecting"
  | "ai-refining"
  | "building-records"
  | "done"
  | "cancelled"
  | "error";

/** Progress snapshot sent to UI via callback during processing. */
export interface ProcessingProgress {
  phase: ProcessingPhase;
  currentPage: number;
  totalPages: number;
  recordsFound: number;
  message: string;
  /** 0–100 percentage completion. */
  percent: number;
}

export type ProgressCallback = (progress: ProcessingProgress) => void;

// ── Batch queue types ─────────────────────────────────────────────────────────

export type QueueItemStatus =
  | "queued"
  | "processing"
  | "done"
  | "failed"
  | "cancelled"
  | "paused";

export interface QueueItem {
  id: string;
  filename: string;
  fileSize: number;
  /** File object held in memory during processing. Null after completion. */
  file: File | null;
  status: QueueItemStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  /** Source book and publisher pre-filled from user input. */
  sourceBook: string;
  publisher: string;
  /** The ExtractionResult once done. */
  result?: ExtractionResult;
  errorMessage?: string;
  progress: ProcessingProgress;
}

/** History record persisted to Foundry settings after each successful run. */
export interface ImportHistoryEntry {
  runId: string;
  filename: string;
  sourceBook: string;
  publisher: string;
  extractedAt: string;
  totalPages: number;
  recordsFound: number;
  recordsAccepted: number;
  durationMs: number;
  ocrUsed: boolean;
  aiUsed: boolean;
}

// ── OCR types ─────────────────────────────────────────────────────────────────

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  durationMs: number;
}

// ── AI provider types ─────────────────────────────────────────────────────────

export interface AiExtractionRequest {
  category: ContentCategory;
  rawText: string;
  sourceBook: string;
  pageNumber: number;
}

export interface AiExtractionResponse {
  records: Array<{
    name: string;
    category: ContentCategory;
    structuredData: Record<string, unknown>;
    notes: string;
  }>;
  tokensUsed: number;
  modelUsed: string;
  durationMs: number;
}

// ── Detector types ────────────────────────────────────────────────────────────

export interface DetectorMatch {
  name: string;
  rawText: string;
  structuredData: Record<string, unknown>;
  confidence: number;
  startIndex: number;
  endIndex: number;
  pageNumber: number;
  autoTags: string[];
}

export interface IContentDetector {
  readonly category: ContentCategory;
  /** Test whether the text block is likely this content type. */
  canDetect(text: string): boolean;
  /** Extract zero or more matches from the text block. */
  detect(text: string, pageNumber: number): DetectorMatch[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function makeExtractionRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeExtractedRecordId(): string {
  return `er_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
