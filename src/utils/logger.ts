/**
 * Module Logger
 *
 * Thin wrapper around console logging that prefixes all messages with
 * the module name and respects a configurable verbosity setting.
 *
 * Usage:
 *   ModuleLogger.info("Something happened");
 *   ModuleLogger.warn("Something might be wrong", extraData);
 *   ModuleLogger.error("Something failed", errorObject);
 *   ModuleLogger.debug("Detailed trace data");
 */

const PREFIX = "[SF3PL]";

/** Log levels in ascending verbosity order. */
export type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class ModuleLogger {
  private static currentLevel: LogLevel = "info";

  /**
   * Sets the minimum log level. Messages below this level are suppressed.
   * @param level The desired log level.
   */
  static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /** Returns the current log level. */
  static getLevel(): LogLevel {
    return this.currentLevel;
  }

  static error(message: string, ...args: unknown[]): void {
    if (this.isEnabled("error")) {
      console.error(`${PREFIX} ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: unknown[]): void {
    if (this.isEnabled("warn")) {
      console.warn(`${PREFIX} ${message}`, ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    if (this.isEnabled("info")) {
      console.info(`${PREFIX} ${message}`, ...args);
    }
  }

  /**
   * Logs a debug message. Only visible when log level is set to "debug".
   * Enable via: ModuleLogger.setLevel("debug")
   * or game.settings.set("starfinder-thirdparty", "debugMode", true)
   */
  static debug(message: string, ...args: unknown[]): void {
    if (this.isEnabled("debug")) {
      console.debug(`${PREFIX} [DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Logs a grouped set of messages under a collapsible console group.
   * Useful for import pipeline step summaries.
   */
  static group(label: string, fn: () => void): void {
    console.group(`${PREFIX} ${label}`);
    fn();
    console.groupEnd();
  }

  private static isEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.currentLevel];
  }
}
