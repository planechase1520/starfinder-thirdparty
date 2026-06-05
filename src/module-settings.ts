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
  PDF_IMPORT_HISTORY: "pdfImportHistory",
  AI_API_KEY: "aiApiKey",
  AI_PROVIDER: "aiProvider",
  AI_BASE_URL: "aiBaseUrl",
  AI_MODEL: "aiModel",
  OCR_ENABLED: "ocrEnabled",
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

  game.settings.register(MODULE_ID, SETTINGS.PDF_IMPORT_HISTORY, {
    name: "PDF Import History",
    scope: "world",
    config: false,
    type: Object,
    default: { schemaVersion: "5.0.0", entries: [] },
  });

  game.settings.register(MODULE_ID, SETTINGS.OCR_ENABLED, {
    name: "SF3PL.Settings.OcrEnabled.Name",
    hint: "SF3PL.Settings.OcrEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, SETTINGS.AI_PROVIDER, {
    name: "SF3PL.Settings.AiProvider.Name",
    hint: "SF3PL.Settings.AiProvider.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "openai",
    choices: {
      openai: "OpenAI",
      openrouter: "OpenRouter",
      custom: "Custom (OpenAI-compatible)",
    } as Record<string, string>,
  });

  game.settings.register(MODULE_ID, SETTINGS.AI_BASE_URL, {
    name: "SF3PL.Settings.AiBaseUrl.Name",
    hint: "SF3PL.Settings.AiBaseUrl.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "https://api.openai.com",
  });

  game.settings.register(MODULE_ID, SETTINGS.AI_MODEL, {
    name: "SF3PL.Settings.AiModel.Name",
    hint: "SF3PL.Settings.AiModel.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "gpt-4o-mini",
  });

  game.settings.register(MODULE_ID, SETTINGS.AI_API_KEY, {
    name: "SF3PL.Settings.AiApiKey.Name",
    hint: "SF3PL.Settings.AiApiKey.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
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
