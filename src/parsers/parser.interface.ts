/**
 * Parser Interface
 *
 * All content parsers must implement this interface.
 * A parser takes raw input (a string or structured data) and produces
 * an array of ParsedEntry objects for the adapter/validator pipeline.
 *
 * To add a new parser format:
 * 1. Create a file in src/parsers/<format>-parser.ts
 * 2. Implement IParser
 * 3. Register with ParserRegistry
 */

import type { ParseResult, ParserOptions, ParserType } from "../types/module-types.js";

export interface IParser {
  /** Identifies the parser format. */
  readonly type: ParserType;

  /** Human-readable name for UI display. */
  readonly displayName: string;

  /** File extensions this parser accepts (e.g. [".csv"]). */
  readonly acceptedExtensions: string[];

  /**
   * Parses raw input into a ParseResult.
   *
   * @param input Raw string input (file contents).
   * @param options Optional configuration for this parse run.
   * @returns ParseResult with entries and any errors/warnings.
   */
  parse(input: string, options?: ParserOptions): ParseResult;

  /**
   * Returns true if this parser can handle the given file based on
   * its extension or MIME type.
   * @param fileName The source file name (with extension).
   */
  canHandleFile(fileName: string): boolean;
}
