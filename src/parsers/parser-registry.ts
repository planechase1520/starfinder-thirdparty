/**
 * Parser Registry
 *
 * Manages all registered content parsers and provides lookup by type or
 * file extension. This is the extension point for adding new import formats.
 */

import type { IParser } from "./parser.interface.js";
import type { ParserType } from "../types/module-types.js";
import { ModuleLogger } from "../utils/logger.js";

export class ParserRegistry {
  private static readonly parsers = new Map<ParserType, IParser>();

  /**
   * Registers a parser. Overwrites any existing parser for the same type.
   * @param parser The parser implementation to register.
   */
  static register(parser: IParser): void {
    this.parsers.set(parser.type, parser);
    ModuleLogger.info(`[ParserRegistry] Registered parser: ${parser.displayName} (${parser.type})`);
  }

  /**
   * Retrieves a parser by its type identifier.
   * @param type The parser type (e.g. "csv", "json").
   */
  static get(type: ParserType): IParser | undefined {
    return this.parsers.get(type);
  }

  /**
   * Finds a suitable parser for a given file name based on extension.
   * Returns the first match found.
   * @param fileName File name including extension.
   */
  static getForFile(fileName: string): IParser | undefined {
    const lower = fileName.toLowerCase();
    for (const parser of this.parsers.values()) {
      if (parser.canHandleFile(lower)) return parser;
    }
    return undefined;
  }

  /** Returns all registered parsers. */
  static getAll(): IParser[] {
    return [...this.parsers.values()];
  }

  /** Returns all registered parser type identifiers. */
  static getTypes(): ParserType[] {
    return [...this.parsers.keys()];
  }

  /** Clears all registered parsers (useful for testing). */
  static clear(): void {
    this.parsers.clear();
  }
}
