/**
 * Module Settings Registration
 *
 * Registers all Foundry client/world settings for the SF3PL module.
 * Settings are registered during the `init` hook.
 */

import { ModuleLogger } from "./utils/logger.js";

const MODULE_ID = "starfinder-thirdparty";

/** All setting keys used by this module — export for type-safe access. */
export const SETTINGS = {
  DEBUG_MODE: "debugMode",
  SKIP_DUPLICATES: "skipDuplicates",
  DEFAULT_PUBLISHER: "defaultPublisher",
  SCHEMA_VERSION: "schemaVersion",
  CONTENT_DATABASE: "contentDatabase",
  SCHEMA_CACHE: "schemaCache",
  DOCUMENT_TEMPLATES: "documentTemplates",
} as const;

export type SettingKey = (typeof SETTINGS)[keyof typeof SETTINGS];

export function registerSettings(): void {
  game.settings.register(MODULE_ID, SETTINGS.DEBUG_MODE, {
    name: "SF3PL.Settings.DebugMode.Name",
    hint: "SF3PL.Settings.DebugMode.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value: unknown) => {
      ModuleLogger.setLevel(value === true ? "debug" : "info");
      ModuleLogger.info(`[Settings] Debug mode ${value ? "enabled" : "disabled"}.`);
    },
  });

  game.settings.register(MODULE_ID, SETTINGS.SKIP_DUPLICATES, {
    name: "SF3PL.Settings.SkipDuplicates.Name",
    hint: "SF3PL.Settings.SkipDuplicates.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.DEFAULT_PUBLISHER, {
    name: "SF3PL.Settings.DefaultPublisher.Name",
    hint: "SF3PL.Settings.DefaultPublisher.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  // Hidden setting for tracking schema version across module updates
  game.settings.register(MODULE_ID, SETTINGS.SCHEMA_VERSION, {
    name: "Schema Version",
    scope: "world",
    config: false,
    type: String,
    default: "1.0.0",
  });

  game.settings.register(MODULE_ID, SETTINGS.CONTENT_DATABASE, {
    name: "Content Database",
    scope: "world",
    config: false,
    type: Object,
    default: { schemaVersion: "2.0.0", records: [] },
  });

  game.settings.register(MODULE_ID, SETTINGS.SCHEMA_CACHE, {
    name: "Schema Cache",
    scope: "world",
    config: false,
    type: Object,
    default: { schemaVersion: "4.0.0", systemId: "", savedAt: "", schemas: {} },
  });

  game.settings.register(MODULE_ID, SETTINGS.DOCUMENT_TEMPLATES, {
    name: "Document Templates",
    scope: "world",
    config: false,
    type: Object,
    default: { schemaVersion: "4.0.0", savedAt: "", templates: [] },
  });

  ModuleLogger.info("[Settings] All settings registered.");
}

/**
 * Type-safe helper for reading module settings.
 * @param key The setting key (use the SETTINGS constant).
 */
export function getSetting<T>(key: SettingKey): T {
  return game.settings.get(MODULE_ID, key) as T;
}

/**
 * Type-safe helper for writing module settings.
 * @param key The setting key.
 * @param value The new value.
 */
export async function setSetting<T>(key: SettingKey, value: T): Promise<T> {
  return (await game.settings.set(MODULE_ID, key, value)) as T;
}
