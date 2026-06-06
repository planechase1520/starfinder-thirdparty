/**
 * Starfinder Third Party Library — Main Entry Point
 *
 * This file is the Rollup bundle entry point. It:
 *   1. Registers module settings
 *   2. Registers all parsers with the ParserRegistry
 *   3. Registers the Starfinder adapter with the AdapterRegistry
 *   4. Adds GM-only scene controls / toolbar buttons
 *   5. Exposes the public module API on globalThis for macro access
 *
 * Hooks used:
 *   - init:    register settings, parsers, adapters
 *   - ready:   finalize setup, check system compatibility, log banner
 *   - getSceneControlButtons: add toolbar button
 */

import { registerSettings, getSetting, SETTINGS } from "./module-settings.js";
import { ModuleLogger } from "./utils/logger.js";

import { ParserRegistry } from "./parsers/parser-registry.js";
import { CsvParser } from "./parsers/csv-parser.js";
import { JsonParser } from "./parsers/json-parser.js";
import { OcrParser } from "./parsers/ocr-parser.js";
import { ManualParser } from "./parsers/manual-parser.js";

import { AdapterRegistry } from "./adapters/adapter-registry.js";
import { StarfinderAdapter } from "./adapters/starfinder/starfinder.adapter.js";

import { ImportWizardApp } from "./ui/import-wizard.js";
import { ContentBrowserApp } from "./ui/content-browser.js";
import { SchemaManagerApp } from "./ui/schema-manager.js";
import { TemplateManagerApp } from "./ui/template-manager.js";
import { ContentDatabase } from "./database/content-database.js";
import { ConverterRegistry } from "./adapters/starfinder/converter-registry.js";
import { ConversionPipeline } from "./pipeline/conversion-pipeline.js";
import { SchemaRegistry } from "./schema/SchemaRegistry.js";
import { TemplateStore } from "./schema/TemplateStore.js";
import { MappingProfiles } from "./mapping/MappingProfiles.js";
import { RepairEngine } from "./repair/RepairEngine.js";
import { PdfImportManager } from "./pdf/PdfImportManager.js";
import { EndToEndWizardApp } from "./ui/end-to-end-wizard.js";

// ── Module constants ────────────────────────────────────────────────────────
const MODULE_ID = "starfinder-thirdparty";
const MODULE_VERSION = "1.3.0";
const SUPPORTED_SYSTEM = "sfrpg";

// ── Public API type (exposed on globalThis) ─────────────────────────────────
interface SF3PLApi {
  openImportWizard: () => void;
  openContentBrowser: () => void;
  openSchemaManager: () => void;
  openTemplateManager: () => void;
  openPdfImportWizard: () => void;
  openEndToEndWizard: () => void;
  parsers: typeof ParserRegistry;
  adapters: typeof AdapterRegistry;
  database: typeof ContentDatabase;
  converters: ConverterRegistry;
  pipeline: ConversionPipeline;
  schema: typeof SchemaRegistry;
  templates: typeof TemplateStore;
  profiles: typeof MappingProfiles;
  repair: typeof RepairEngine;
  pdfManager: typeof PdfImportManager;
  version: string;
}

// ── init hook ───────────────────────────────────────────────────────────────
Hooks.once("init", () => {
  ModuleLogger.info(`[Main] Initializing ${MODULE_ID} v${MODULE_VERSION}`);

  // Register module settings
  registerSettings();

  // Apply debug mode if previously set
  const debugMode = getSetting<boolean>(SETTINGS.DEBUG_MODE);
  if (debugMode) {
    ModuleLogger.setLevel("debug");
    ModuleLogger.debug("[Main] Debug mode active.");
  }

  // Register parsers
  ParserRegistry.register(new JsonParser());
  ParserRegistry.register(new CsvParser());
  ParserRegistry.register(new OcrParser());
  ParserRegistry.register(new ManualParser());
  ModuleLogger.info(`[Main] Registered parsers: ${ParserRegistry.getTypes().join(", ")}`);

  // Register the Starfinder adapter
  AdapterRegistry.register(new StarfinderAdapter());
  ModuleLogger.info(`[Main] Registered adapters: ${AdapterRegistry.getRegisteredSystemIds().join(", ")}`);

  // Register Handlebars helpers used in templates
  registerHandlebarsHelpers();
});

// ── ready hook ──────────────────────────────────────────────────────────────
Hooks.once("ready", () => {
  const systemId = game.system?.id;

  if (systemId !== SUPPORTED_SYSTEM) {
    ModuleLogger.warn(
      `[Main] Module is designed for '${SUPPORTED_SYSTEM}' but current system is '${systemId}'. ` +
      "Some features may not work correctly."
    );
    ui.notifications.warn(
      `Starfinder Third Party Library: This module is designed for the Starfinder (${SUPPORTED_SYSTEM}) system.`
    );
  }

  // Initialize the content database from persisted Foundry settings
  void ContentDatabase.initialize().then(() => {
    ModuleLogger.info(`[Main] ContentDatabase ready: ${ContentDatabase.getAll().length} record(s).`);
  });

  // Initialize the PDF import manager (M5)
  void PdfImportManager.initialize().then(() => {
    ModuleLogger.info("[Main] PdfImportManager ready.");
  });

  // Initialize template store (M4)
  void TemplateStore.initialize().then(() => {
    ModuleLogger.info(`[Main] TemplateStore ready: ${TemplateStore.count()} template(s).`);
  });

  // Initialize schema registry (M4) — runs after template store so templates
  // can be used to supplement discovery
  void SchemaRegistry.initialize().then(() => {
    const schemaCount = SchemaRegistry.getAll().length;
    const diffs = SchemaRegistry.getLastDiffs().filter((d) => !d.isCompatible);
    ModuleLogger.info(`[Main] SchemaRegistry ready: ${schemaCount} schema(s).`);
    if (diffs.length > 0) {
      ui.notifications.warn(
        `SF3PL: ${diffs.length} schema change(s) detected since last session. ` +
        "Open Schema Manager → Diffs tab for details."
      );
    }
    // Eagerly build all mapping profiles now that schemas are available
    MappingProfiles.buildAll();
    ModuleLogger.info("[Main] Mapping profiles built.");
  });

  // Build the Starfinder converter registry
  const converterRegistry = ConverterRegistry.build();

  // Expose public API on the module object for macro access
  const moduleObj = game.modules.get(MODULE_ID) as unknown as Record<string, unknown>;
  const api: SF3PLApi = {
    openImportWizard: () => void new ImportWizardApp().render(true),
    openContentBrowser: () => void new ContentBrowserApp().render(true),
    openSchemaManager: () => void new SchemaManagerApp().render(true),
    openTemplateManager: () => void new TemplateManagerApp().render(true),
    openPdfImportWizard: () => {
      import("./ui/pdf-import-wizard.js")
        .then(({ PdfImportWizardApp }) => void new PdfImportWizardApp().render(true))
        .catch((e: unknown) => ModuleLogger.error(`[Main] Failed to open PDF wizard: ${String(e)}`));
    },
    openEndToEndWizard: () => void new EndToEndWizardApp().render(true),
    parsers: ParserRegistry,
    adapters: AdapterRegistry,
    database: ContentDatabase,
    converters: converterRegistry,
    pipeline: new ConversionPipeline(converterRegistry),
    schema: SchemaRegistry,
    templates: TemplateStore,
    profiles: MappingProfiles,
    repair: RepairEngine,
    pdfManager: PdfImportManager,
    version: MODULE_VERSION,
  };
  moduleObj["api"] = api;

  ModuleLogger.info(
    `%c Starfinder Third Party Library v${MODULE_VERSION} ready! ` +
    "Access module API via: game.modules.get('starfinder-thirdparty').api",
    "color: #3a7bd5; font-weight: bold; font-size: 1.1em;"
  );
});

// ── Scene control buttons ────────────────────────────────────────────────────
Hooks.on("getSceneControlButtons", (...args: unknown[]) => {
  const controls = args[0] as unknown[];
  if (!game.user?.isGM) return;

  (controls as Array<{ name: string; tools: unknown[] }>).push({
    name: "sf3pl",
    tools: [
      {
        name: "import-wizard",
        title: "SF3PL.Controls.ImportWizard",
        icon: "fas fa-file-import",
        button: true,
        onClick: () => void new ImportWizardApp().render(true),
      },
      {
        name: "content-browser",
        title: "SF3PL.Controls.ContentBrowser",
        icon: "fas fa-book-open",
        button: true,
        onClick: () => void new ContentBrowserApp().render(true),
      },
      {
        name: "schema-manager",
        title: "SF3PL.Controls.SchemaManager",
        icon: "fas fa-database",
        button: true,
        onClick: () => void new SchemaManagerApp().render(true),
      },
      {
        name: "pdf-import",
        title: "SF3PL.Controls.PdfImport",
        icon: "fas fa-file-pdf",
        button: true,
        onClick: () => {
          import("./ui/pdf-import-wizard.js")
            .then(({ PdfImportWizardApp }) => void new PdfImportWizardApp().render(true))
            .catch((e: unknown) => ModuleLogger.error(`[Main] Failed to open PDF wizard: ${String(e)}`));
        },
      },
      {
        name: "e2e-import",
        title: "SF3PL.Controls.EndToEndImport",
        icon: "fas fa-rocket",
        button: true,
        onClick: () => void new EndToEndWizardApp().render(true),
      },
    ],
  });
});

// ── Handlebars helpers ───────────────────────────────────────────────────────
function registerHandlebarsHelpers(): void {
  // Handlebars is available globally in Foundry
  const Handlebars = (globalThis as unknown as Record<string, unknown>)["Handlebars"] as {
    registerHelper: (name: string, fn: (...args: unknown[]) => unknown) => void;
  } | undefined;

  if (!Handlebars) {
    ModuleLogger.warn("[Main] Handlebars not available; skipping helper registration.");
    return;
  }

  // {{#if (gt a b)}} — greater than comparison
  Handlebars.registerHelper("gt", (a: unknown, b: unknown) => Number(a) > Number(b));

  // {{#if (eq a b)}} — strict equality
  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);

  // {{#if (includes array value)}} — array includes check
  Handlebars.registerHelper("includes", (arr: unknown, value: unknown) => {
    if (!Array.isArray(arr)) return false;
    return (arr as unknown[]).includes(value);
  });

  ModuleLogger.debug("[Main] Handlebars helpers registered: gt, eq, includes");
}
