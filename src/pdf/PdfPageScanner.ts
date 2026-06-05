import type { PdfPage } from "./pdf-types.js";

/**
 * A contiguous block of text extracted from a PDF page that likely represents
 * a single logical content entry such as a stat block, header, or description.
 */
export interface ContentBlock {
  text: string;
  pageNumber: number;
  startLine: number;
}

/**
 * Scans the text content of extracted PDF pages and segments it into discrete
 * content blocks. Each block represents one logical entry (stat block, heading,
 * paragraph, table, etc.) ready for downstream classification.
 */
export class PdfPageScanner {
  /**
   * Processes all pages and returns a flat ordered list of content blocks.
   * Pages with fewer than 20 characters of text are skipped.
   *
   * @param pages - Array of PdfPage objects from PdfTextExtractor.
   * @param sourceBook - The name of the source book.
   * @returns All content blocks across the document, in page order.
   */
  static scanPages(pages: PdfPage[], _sourceBook: string): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const STAT_LINE_PATTERN = /^(?:Type|Level|CR|Category|Class|School|Hit\s*Points|HP|EAC|KAC|Fort|Ref|Will)\s*:/i;

    for (const page of pages) {
      if (page.textLength < 20) continue;

      const lines = page.text.split("\n");
      let currentBlockLines: string[] = [];
      let startLine = 1;

      const flushCurrentBlock = (lineIndex: number) => {
        if (currentBlockLines.length > 0) {
          const text = currentBlockLines.join("\n").trim();
          // Minimum block length of 50 characters to avoid noise
          if (text.length >= 50) {
            blocks.push({
              text,
              pageNumber: page.pageNumber,
              startLine,
            });
          }
        }
        currentBlockLines = [];
        startLine = lineIndex + 1;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === "") {
          // If we have an empty line and our current block is substantial, split at this double newline.
          if (currentBlockLines.length > 0 && currentBlockLines.join("\n").trim().length >= 50) {
            flushCurrentBlock(i);
          }
          continue;
        }

        // Heuristics: lines starting with all-caps words (excluding common stat abbreviations)
        const isHeaderLine = /^[A-Z0-9\s'’\-\(\):]+$/.test(trimmed) && 
                             trimmed.length >= 3 && 
                             trimmed.length <= 60 && 
                             !/^(?:EAC|KAC|CR|NPC|GM|DC|HP|PC)$/i.test(trimmed);

        const nextLine = lines[i + 1];
        const nextLineHasStatPattern = nextLine ? STAT_LINE_PATTERN.test(nextLine.trim()) : false;

        // Splits at natural break points or pattern boundaries
        const shouldSplit = (isHeaderLine || nextLineHasStatPattern) && currentBlockLines.length > 0;

        if (shouldSplit) {
          flushCurrentBlock(i);
        }

        currentBlockLines.push(line);
      }

      flushCurrentBlock(lines.length);
    }

    return blocks;
  }
}
