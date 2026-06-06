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
const LOG_LEVEL_PRIORITY = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};
class ModuleLogger {
    static currentLevel = "info";
    /**
     * Sets the minimum log level. Messages below this level are suppressed.
     * @param level The desired log level.
     */
    static setLevel(level) {
        this.currentLevel = level;
    }
    /** Returns the current log level. */
    static getLevel() {
        return this.currentLevel;
    }
    static error(message, ...args) {
        if (this.isEnabled("error")) {
            console.error(`${PREFIX} ${message}`, ...args);
        }
    }
    static warn(message, ...args) {
        if (this.isEnabled("warn")) {
            console.warn(`${PREFIX} ${message}`, ...args);
        }
    }
    static info(message, ...args) {
        if (this.isEnabled("info")) {
            console.info(`${PREFIX} ${message}`, ...args);
        }
    }
    /**
     * Logs a debug message. Only visible when log level is set to "debug".
     * Enable via: ModuleLogger.setLevel("debug")
     * or game.settings.set("starfinder-thirdparty", "debugMode", true)
     */
    static debug(message, ...args) {
        if (this.isEnabled("debug")) {
            console.debug(`${PREFIX} [DEBUG] ${message}`, ...args);
        }
    }
    /**
     * Logs a grouped set of messages under a collapsible console group.
     * Useful for import pipeline step summaries.
     */
    static group(label, fn) {
        console.group(`${PREFIX} ${label}`);
        fn();
        console.groupEnd();
    }
    static isEnabled(level) {
        return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.currentLevel];
    }
}

/**
 * Module Settings Registration
 *
 * Registers all Foundry client/world settings for the SF3PL module.
 * Settings are registered during the `init` hook.
 */
const MODULE_ID$9 = "starfinder-thirdparty";
/** All setting keys used by this module — export for type-safe access. */
const SETTINGS = {
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
};
function registerSettings() {
    game.settings.register(MODULE_ID$9, SETTINGS.DEBUG_MODE, {
        name: "SF3PL.Settings.DebugMode.Name",
        hint: "SF3PL.Settings.DebugMode.Hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            ModuleLogger.setLevel(value === true ? "debug" : "info");
            ModuleLogger.info(`[Settings] Debug mode ${value ? "enabled" : "disabled"}.`);
        },
    });
    game.settings.register(MODULE_ID$9, SETTINGS.SKIP_DUPLICATES, {
        name: "SF3PL.Settings.SkipDuplicates.Name",
        hint: "SF3PL.Settings.SkipDuplicates.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });
    game.settings.register(MODULE_ID$9, SETTINGS.DEFAULT_PUBLISHER, {
        name: "SF3PL.Settings.DefaultPublisher.Name",
        hint: "SF3PL.Settings.DefaultPublisher.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "",
    });
    // Hidden setting for tracking schema version across module updates
    game.settings.register(MODULE_ID$9, SETTINGS.SCHEMA_VERSION, {
        name: "Schema Version",
        scope: "world",
        config: false,
        type: String,
        default: "1.0.0",
    });
    game.settings.register(MODULE_ID$9, SETTINGS.CONTENT_DATABASE, {
        name: "Content Database",
        scope: "world",
        config: false,
        type: Object,
        default: { schemaVersion: "2.0.0", records: [] },
    });
    game.settings.register(MODULE_ID$9, SETTINGS.SCHEMA_CACHE, {
        name: "Schema Cache",
        scope: "world",
        config: false,
        type: Object,
        default: { schemaVersion: "4.0.0", systemId: "", savedAt: "", schemas: {} },
    });
    game.settings.register(MODULE_ID$9, SETTINGS.DOCUMENT_TEMPLATES, {
        name: "Document Templates",
        scope: "world",
        config: false,
        type: Object,
        default: { schemaVersion: "4.0.0", savedAt: "", templates: [] },
    });
    game.settings.register(MODULE_ID$9, SETTINGS.PDF_IMPORT_HISTORY, {
        name: "PDF Import History",
        scope: "world",
        config: false,
        type: Object,
        default: { schemaVersion: "5.0.0", entries: [] },
    });
    game.settings.register(MODULE_ID$9, SETTINGS.OCR_ENABLED, {
        name: "SF3PL.Settings.OcrEnabled.Name",
        hint: "SF3PL.Settings.OcrEnabled.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });
    game.settings.register(MODULE_ID$9, SETTINGS.AI_PROVIDER, {
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
        },
    });
    game.settings.register(MODULE_ID$9, SETTINGS.AI_BASE_URL, {
        name: "SF3PL.Settings.AiBaseUrl.Name",
        hint: "SF3PL.Settings.AiBaseUrl.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "https://api.openai.com",
    });
    game.settings.register(MODULE_ID$9, SETTINGS.AI_MODEL, {
        name: "SF3PL.Settings.AiModel.Name",
        hint: "SF3PL.Settings.AiModel.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "gpt-4o-mini",
    });
    game.settings.register(MODULE_ID$9, SETTINGS.AI_API_KEY, {
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
function getSetting(key) {
    return game.settings.get(MODULE_ID$9, key);
}

/**
 * Parser Registry
 *
 * Manages all registered content parsers and provides lookup by type or
 * file extension. This is the extension point for adding new import formats.
 */
class ParserRegistry {
    static parsers = new Map();
    /**
     * Registers a parser. Overwrites any existing parser for the same type.
     * @param parser The parser implementation to register.
     */
    static register(parser) {
        this.parsers.set(parser.type, parser);
        ModuleLogger.info(`[ParserRegistry] Registered parser: ${parser.displayName} (${parser.type})`);
    }
    /**
     * Retrieves a parser by its type identifier.
     * @param type The parser type (e.g. "csv", "json").
     */
    static get(type) {
        return this.parsers.get(type);
    }
    /**
     * Finds a suitable parser for a given file name based on extension.
     * Returns the first match found.
     * @param fileName File name including extension.
     */
    static getForFile(fileName) {
        const lower = fileName.toLowerCase();
        for (const parser of this.parsers.values()) {
            if (parser.canHandleFile(lower))
                return parser;
        }
        return undefined;
    }
    /** Returns all registered parsers. */
    static getAll() {
        return [...this.parsers.values()];
    }
    /** Returns all registered parser type identifiers. */
    static getTypes() {
        return [...this.parsers.keys()];
    }
    /** Clears all registered parsers (useful for testing). */
    static clear() {
        this.parsers.clear();
    }
}

/**
 * CSV Parser
 *
 * Parses CSV files into ParsedEntry objects. Expects a header row followed
 * by data rows. The "type" column (if present) determines the content type
 * of each row; otherwise `options.defaultContentType` is used.
 *
 * Supported special column names:
 *   - "type" or "contentType" → ContentType
 *   - "sourceBook"            → metadata.sourceBook
 *   - "publisher"             → metadata.publisher
 *   - "author"                → metadata.author
 *   - "pageNumber" or "page"  → metadata.pageNumber
 *   - "tags"                  → metadata.tags (comma-separated within the cell)
 *   - "notes"                 → metadata.notes
 *
 * All other columns become fields in the entry's data object.
 *
 * Example CSV:
 *   name,type,level,weaponType,damage,sourceBook,publisher
 *   "Tactical Semi-Auto Pistol",weapon,1,ranged,"1d6 P",Core Rulebook,Paizo
 */
const METADATA_COLUMNS = new Set([
    "sourcebook",
    "publisher",
    "author",
    "pagenumber",
    "page",
    "tags",
    "notes",
]);
const TYPE_COLUMNS = new Set(["type", "contenttype"]);
class CsvParser {
    type = "csv";
    displayName = "CSV Import";
    acceptedExtensions = [".csv"];
    canHandleFile(fileName) {
        return fileName.endsWith(".csv");
    }
    parse(input, options) {
        const errors = [];
        const warnings = [];
        const entries = [];
        const delimiter = options?.csvDelimiter ?? ",";
        const lines = this.splitLines(input.trim());
        if (lines.length === 0) {
            errors.push({
                code: "EMPTY_INPUT",
                message: "CSV input is empty.",
                severity: "error",
            });
            return { entries, errors, warnings };
        }
        // Parse header row
        const headers = this.parseRow(lines[0], delimiter).map((h) => h.trim().toLowerCase());
        if (headers.length === 0) {
            errors.push({ code: "NO_HEADERS", message: "CSV has no header row.", severity: "error" });
            return { entries, errors, warnings };
        }
        // Process data rows
        for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
            const line = lines[rowIndex].trim();
            if (line === "")
                continue;
            const rowRef = `row:${rowIndex + 1}`;
            const cells = this.parseRow(line, delimiter);
            // Build a key→value map for this row
            const rowMap = {};
            for (let col = 0; col < headers.length; col++) {
                rowMap[headers[col]] = cells[col]?.trim() ?? "";
            }
            // Determine content type
            const typeCell = rowMap["type"] ?? rowMap["contenttype"] ?? "";
            const contentType = (typeCell !== "" ? typeCell : options?.defaultContentType ?? "equipment");
            // Separate metadata fields from data fields
            const data = {};
            const partialMetadata = {};
            for (const [key, value] of Object.entries(rowMap)) {
                if (TYPE_COLUMNS.has(key))
                    continue;
                const normalizedKey = key.replace(/[_\s]/g, "").toLowerCase();
                if (METADATA_COLUMNS.has(normalizedKey)) {
                    // Map to canonical metadata field names
                    switch (normalizedKey) {
                        case "sourcebook":
                            partialMetadata["sourceBook"] = value;
                            break;
                        case "publisher":
                            partialMetadata["publisher"] = value;
                            break;
                        case "author":
                            partialMetadata["author"] = value;
                            break;
                        case "pagenumber":
                        case "page":
                            partialMetadata["pageNumber"] = parseInt(value, 10) || 0;
                            break;
                        case "tags":
                            partialMetadata["tags"] = value.split(",").map((t) => t.trim()).filter(Boolean);
                            break;
                        case "notes":
                            partialMetadata["notes"] = value;
                            break;
                    }
                }
                else {
                    // Try to coerce numeric and boolean strings
                    data[key] = this.coerceValue(value);
                }
            }
            // Merge source metadata from options
            const mergedMetadata = {
                ...(options?.sourceMetadata ?? {}),
                ...partialMetadata,
            };
            if (!rowMap["name"] && !data["name"]) {
                warnings.push({
                    code: "MISSING_NAME",
                    message: `Row ${rowIndex + 1} has no 'name' column.`,
                    severity: "warning",
                    sourceReference: rowRef,
                });
            }
            entries.push({
                contentType,
                data,
                metadata: mergedMetadata,
                sourceReference: rowRef,
            });
        }
        return { entries, errors, warnings };
    }
    // -------------------------------------------------------------------------
    // RFC 4180-compliant CSV parsing helpers
    // -------------------------------------------------------------------------
    /** Splits input into lines, respecting quoted newlines. */
    splitLines(input) {
        const lines = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < input.length; i++) {
            const ch = input[i];
            if (ch === '"') {
                if (inQuotes && input[i + 1] === '"') {
                    current += '"';
                    i++;
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if ((ch === "\n" || ch === "\r") && !inQuotes) {
                if (ch === "\r" && input[i + 1] === "\n")
                    i++;
                lines.push(current);
                current = "";
            }
            else {
                current += ch;
            }
        }
        if (current !== "")
            lines.push(current);
        return lines;
    }
    /** Parses a single CSV row into an array of cell values. */
    parseRow(line, delimiter) {
        const cells = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (ch === delimiter && !inQuotes) {
                cells.push(current);
                current = "";
            }
            else {
                current += ch;
            }
        }
        cells.push(current);
        return cells;
    }
    /** Coerces a string value to a number or boolean where appropriate. */
    coerceValue(value) {
        if (value === "")
            return null;
        if (value.toLowerCase() === "true")
            return true;
        if (value.toLowerCase() === "false")
            return false;
        const num = Number(value);
        if (!isNaN(num) && value.trim() !== "")
            return num;
        return value;
    }
}

/**
 * JSON Parser
 *
 * Parses a JSON file containing one or more content entries.
 *
 * Accepted JSON shapes:
 *   1. Single entry object:      { "name": "...", "type": "weapon", ... }
 *   2. Array of entry objects:   [ { ... }, { ... } ]
 *   3. Wrapped object:           { "items": [ ... ] }  (path resolved via options.jsonRootPath)
 *
 * Metadata fields (sourceBook, publisher, author, pageNumber, tags, notes)
 * may be embedded in each entry object or provided via options.sourceMetadata.
 */
const METADATA_FIELD_NAMES = new Set([
    "sourceBook",
    "publisher",
    "author",
    "pageNumber",
    "tags",
    "notes",
    "importDate",
    "schemaVersion",
]);
class JsonParser {
    type = "json";
    displayName = "JSON Import";
    acceptedExtensions = [".json"];
    canHandleFile(fileName) {
        return fileName.endsWith(".json");
    }
    parse(input, options) {
        const errors = [];
        const warnings = [];
        const entries = [];
        // Parse the raw JSON
        let parsed;
        try {
            parsed = JSON.parse(input);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push({
                code: "JSON_PARSE_ERROR",
                message: `Failed to parse JSON: ${message}`,
                severity: "error",
            });
            return { entries, errors, warnings };
        }
        // Resolve the root array of entries
        const rawEntries = this.resolveRoot(parsed, options?.jsonRootPath, errors);
        if (rawEntries === null)
            return { entries, errors, warnings };
        // Process each entry object
        rawEntries.forEach((raw, index) => {
            const ref = `index:${index}`;
            if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
                warnings.push({
                    code: "INVALID_ENTRY",
                    message: `Entry at index ${index} is not an object; skipping.`,
                    severity: "warning",
                    sourceReference: ref,
                });
                return;
            }
            const rawRecord = raw;
            // Determine content type
            const typeValue = rawRecord["type"] ?? rawRecord["contentType"];
            const contentType = (typeof typeValue === "string" && typeValue !== ""
                ? typeValue
                : options?.defaultContentType ?? "equipment");
            // Extract metadata fields
            const partialMeta = {};
            const data = {};
            for (const [key, value] of Object.entries(rawRecord)) {
                if (key === "type" || key === "contentType")
                    continue;
                if (METADATA_FIELD_NAMES.has(key)) {
                    partialMeta[key] = value;
                }
                else {
                    data[key] = value;
                }
            }
            if (!rawRecord["name"]) {
                warnings.push({
                    code: "MISSING_NAME",
                    message: `Entry at index ${index} has no 'name' field.`,
                    severity: "warning",
                    sourceReference: ref,
                });
            }
            const mergedMetadata = {
                ...(options?.sourceMetadata ?? {}),
                ...partialMeta,
            };
            entries.push({
                contentType,
                data,
                metadata: mergedMetadata,
                sourceReference: ref,
            });
        });
        return { entries, errors, warnings };
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    /**
     * Resolves the root array of entry objects from parsed JSON.
     * Handles arrays, wrapped objects, and single-entry objects.
     */
    resolveRoot(parsed, rootPath, errors) {
        let target = parsed;
        // Resolve optional root path (e.g. "items" or "data.entries")
        if (rootPath) {
            const parts = rootPath.split(".");
            for (const part of parts) {
                if (typeof target !== "object" || target === null) {
                    errors.push({
                        code: "JSON_ROOT_PATH_ERROR",
                        message: `Root path '${rootPath}' could not be resolved.`,
                        severity: "error",
                    });
                    return null;
                }
                target = target[part];
            }
        }
        if (Array.isArray(target)) {
            return target;
        }
        if (typeof target === "object" && target !== null && !Array.isArray(target)) {
            // Single object — wrap it in an array
            return [target];
        }
        errors.push({
            code: "JSON_NO_ENTRIES",
            message: "JSON root is not an array or object.",
            severity: "error",
        });
        return null;
    }
}

/**
 * OCR Text Parser
 *
 * Parses raw OCR or PDF-extracted text into ParsedEntry objects.
 * Uses template-based pattern matching to extract structured data
 * from unstructured text (e.g. content copied from a PDF).
 *
 * Built-in templates support common SFRPG stat block formats.
 * Custom templates can be registered via OcrParser.registerTemplate().
 *
 * Template format uses named regex capture groups:
 *   (?<fieldName>pattern)
 *
 * The template must include a `contentType` field to declare the
 * document type, or options.defaultContentType is used.
 *
 * Example OCR text for a weapon stat block:
 *   TACTICAL SEMI-AUTO PISTOL
 *   One-handed; ranged
 *   Level 1; Price 260; Damage 1d6 P; Range 30 ft.; Capacity 9 charges; Usage 1
 */
// ---------------------------------------------------------------------------
// Built-in SFRPG templates
// ---------------------------------------------------------------------------
const SFRPG_WEAPON_TEMPLATE = {
    id: "sfrpg-weapon",
    name: "SFRPG Weapon Stat Block",
    contentType: "weapon",
    rules: [
        { fieldName: "name", pattern: "^(?<value>[A-Z][A-Z ,\\-']+)$", flags: "m" },
        { fieldName: "level", pattern: "Level\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "price", pattern: "Price\\s+(?<value>[\\d,]+)", transform: "number" },
        { fieldName: "damage", pattern: "Damage\\s+(?<value>[\\ddDa-zA-Z ]+(?:[A-Z]))", flags: "i" },
        { fieldName: "range", pattern: "Range\\s+(?<value>\\d+)\\s*ft", transform: "number" },
        { fieldName: "capacity", pattern: "Capacity\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "usage", pattern: "Usage\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "bulk", pattern: "Bulk\\s+(?<value>[\\dL—]+)", flags: "i" },
        { fieldName: "special", pattern: "Special\\s+(?<value>.+?)(?=\\n|$)", flags: "im" },
        { fieldName: "critical", pattern: "Critical\\s+(?<value>.+?)(?=\\n|$)", flags: "im" },
    ],
};
const SFRPG_ARMOR_TEMPLATE = {
    id: "sfrpg-armor",
    name: "SFRPG Armor Stat Block",
    contentType: "armor",
    rules: [
        { fieldName: "name", pattern: "^(?<value>[A-Z][A-Z ,\\-']+)$", flags: "m" },
        { fieldName: "level", pattern: "Level\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "price", pattern: "Price\\s+(?<value>[\\d,]+)", transform: "number" },
        { fieldName: "eac", pattern: "EAC\\s+(?<value>[+\\-]?\\d+)", transform: "number" },
        { fieldName: "kac", pattern: "KAC\\s+(?<value>[+\\-]?\\d+)", transform: "number" },
        { fieldName: "maxDex", pattern: "Max Dex\\s+(?<value>[+\\-]?\\d+)", transform: "number" },
        { fieldName: "acp", pattern: "ACP\\s+(?<value>[+\\-]?\\d+)", transform: "number" },
        { fieldName: "speedAdjust", pattern: "Speed Adj\\.?\\s+(?<value>-?\\d+)", transform: "number" },
        { fieldName: "upgradeSlots", pattern: "Upgrade Slots\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "bulk", pattern: "Bulk\\s+(?<value>[\\dL—]+)", flags: "i" },
    ],
};
const SFRPG_NPC_TEMPLATE = {
    id: "sfrpg-npc",
    name: "SFRPG NPC Stat Block",
    contentType: "npc",
    rules: [
        { fieldName: "name", pattern: "^(?<value>[A-Z][A-Z ,\\-']+)$", flags: "m" },
        { fieldName: "cr", pattern: "CR\\s+(?<value>[\\d/]+)", transform: "number" },
        { fieldName: "xp", pattern: "XP\\s+(?<value>[\\d,]+)", transform: "number" },
        { fieldName: "alignment", pattern: "(?<value>LG|LN|LE|NG|N|NE|CG|CN|CE)\\s+(?:humanoid|monstrous|aberration|construct|dragon|fey|magical beast|outsider|plant|undead|vermin)", flags: "i" },
        { fieldName: "type", pattern: "(?:LG|LN|LE|NG|N|NE|CG|CN|CE)\\s+(?<value>humanoid|monstrous humanoid|aberration|construct|dragon|fey|magical beast|outsider|plant|undead|vermin)", flags: "i" },
        { fieldName: "hp", pattern: "HP\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "eac", pattern: "EAC\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "kac", pattern: "KAC\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "fort", pattern: "Fort\\s+(?<value>[+\\-]?\\d+)", transform: "number" },
        { fieldName: "ref", pattern: "Ref\\s+(?<value>[+\\-]?\\d+)", transform: "number" },
        { fieldName: "will", pattern: "Will\\s+(?<value>[+\\-]?\\d+)", transform: "number" },
        { fieldName: "speed", pattern: "Speed\\s+(?<value>[\\d]+ ft\\.?(?:,.*)?)", flags: "i" },
        { fieldName: "str", pattern: "Str\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "dex", pattern: "Dex\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "con", pattern: "Con\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "int", pattern: "Int\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "wis", pattern: "Wis\\s+(?<value>\\d+)", transform: "number" },
        { fieldName: "cha", pattern: "Cha\\s+(?<value>\\d+)", transform: "number" },
    ],
};
// ---------------------------------------------------------------------------
// OcrParser implementation
// ---------------------------------------------------------------------------
class OcrParser {
    type = "ocr";
    displayName = "OCR / PDF Text Import";
    acceptedExtensions = [".txt"];
    /** Template registry. */
    static templates = new Map([
        [SFRPG_WEAPON_TEMPLATE.id, SFRPG_WEAPON_TEMPLATE],
        [SFRPG_ARMOR_TEMPLATE.id, SFRPG_ARMOR_TEMPLATE],
        [SFRPG_NPC_TEMPLATE.id, SFRPG_NPC_TEMPLATE],
    ]);
    /** Registers a custom template for OCR extraction. */
    static registerTemplate(template) {
        OcrParser.templates.set(template.id, template);
    }
    /** Returns all registered template IDs. */
    static getTemplateIds() {
        return [...OcrParser.templates.keys()];
    }
    canHandleFile(fileName) {
        return fileName.endsWith(".txt");
    }
    parse(input, options) {
        const errors = [];
        const warnings = [];
        const entries = [];
        if (!input.trim()) {
            errors.push({ code: "EMPTY_INPUT", message: "OCR input is empty.", severity: "error" });
            return { entries, errors, warnings };
        }
        // Select a template
        const templateId = options?.ocrTemplate;
        const contentType = options?.defaultContentType ?? "equipment";
        let template;
        if (templateId) {
            template = OcrParser.templates.get(templateId);
            if (!template) {
                warnings.push({
                    code: "TEMPLATE_NOT_FOUND",
                    message: `OCR template '${templateId}' not found; falling back to content type heuristic.`,
                    severity: "warning",
                });
            }
        }
        // Auto-select template from default content type if not specified
        if (!template) {
            for (const t of OcrParser.templates.values()) {
                if (t.contentType === contentType) {
                    template = t;
                    break;
                }
            }
        }
        if (!template) {
            errors.push({
                code: "NO_TEMPLATE",
                message: `No OCR template found for content type '${contentType}'. Register one via OcrParser.registerTemplate().`,
                severity: "error",
            });
            return { entries, errors, warnings };
        }
        // Split text into blocks (double newline separates multiple stat blocks)
        const blocks = input.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
        blocks.forEach((block, index) => {
            const ref = `block:${index}`;
            const data = this.extractFromBlock(block, template.rules, warnings, ref);
            if (Object.keys(data).length === 0) {
                warnings.push({
                    code: "NO_DATA_EXTRACTED",
                    message: `Could not extract any data from block ${index}.`,
                    severity: "warning",
                    sourceReference: ref,
                });
                return;
            }
            entries.push({
                contentType: template.contentType,
                data,
                metadata: options?.sourceMetadata,
                sourceReference: ref,
            });
        });
        return { entries, errors, warnings };
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    extractFromBlock(text, rules, warnings, ref) {
        const data = {};
        for (const rule of rules) {
            try {
                const flags = rule.flags ?? "im";
                const regex = new RegExp(rule.pattern, flags);
                const match = regex.exec(text);
                if (match?.groups?.["value"] !== undefined) {
                    const raw = match.groups["value"].trim();
                    data[rule.fieldName] = this.applyTransform(raw, rule.transform);
                }
            }
            catch (err) {
                warnings.push({
                    code: "REGEX_ERROR",
                    message: `Rule for field '${rule.fieldName}' has an invalid pattern: ${String(err)}`,
                    severity: "warning",
                    sourceReference: ref,
                });
            }
        }
        return data;
    }
    applyTransform(value, transform) {
        switch (transform) {
            case "number": {
                const num = parseFloat(value.replace(/,/g, ""));
                return isNaN(num) ? value : num;
            }
            case "lowercase": return value.toLowerCase();
            case "uppercase": return value.toUpperCase();
            case "trim":
            default:
                return value;
        }
    }
}

/**
 * Manual Data Entry Parser
 *
 * Converts a single manually-entered data object (from the Import Wizard UI)
 * into a ParsedEntry. Unlike file-based parsers, this parser receives a
 * pre-structured JavaScript object rather than a raw string.
 *
 * The import wizard passes a plain object; this parser validates the shape
 * and wraps it in a ParseResult for the rest of the pipeline.
 */
class ManualParser {
    type = "manual";
    displayName = "Manual Entry";
    acceptedExtensions = [];
    canHandleFile(_fileName) {
        return false; // Manual parser is invoked directly, not from a file.
    }
    /**
     * Accepts either a JSON string (from a form textarea) or the raw object
     * serialized as JSON. The outer shape should match:
     *   {
     *     "type": "weapon",
     *     "name": "...",
     *     "level": 1,
     *     ... (other fields)
     *   }
     */
    parse(input, options) {
        const errors = [];
        const warnings = [];
        let rawObject;
        try {
            const parsed = JSON.parse(input);
            if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                errors.push({
                    code: "MANUAL_INVALID_SHAPE",
                    message: "Manual entry must be a single JSON object.",
                    severity: "error",
                });
                return { entries: [], errors, warnings };
            }
            rawObject = parsed;
        }
        catch (err) {
            errors.push({
                code: "JSON_PARSE_ERROR",
                message: `Manual entry JSON is invalid: ${err instanceof Error ? err.message : String(err)}`,
                severity: "error",
            });
            return { entries: [], errors, warnings };
        }
        const typeValue = rawObject["type"] ?? rawObject["contentType"];
        const contentType = (typeof typeValue === "string" && typeValue !== ""
            ? typeValue
            : options?.defaultContentType ?? "equipment");
        const data = {};
        for (const [key, value] of Object.entries(rawObject)) {
            if (key === "type" || key === "contentType")
                continue;
            data[key] = value;
        }
        if (!rawObject["name"]) {
            warnings.push({
                code: "MISSING_NAME",
                message: "Manual entry has no 'name' field.",
                severity: "warning",
                sourceReference: "manual",
            });
        }
        const entry = {
            contentType,
            data,
            metadata: options?.sourceMetadata,
            sourceReference: "manual",
        };
        return { entries: [entry], errors, warnings };
    }
    /**
     * Convenience method: parse a pre-built object without JSON serialization.
     * @param obj The data object directly from the UI form.
     * @param options Parser options including metadata.
     */
    parseObject(obj, options) {
        return this.parse(JSON.stringify(obj), options);
    }
}

/**
 * Adapter Registry
 *
 * Manages registered system adapters and provides adapter lookup by system ID.
 * This is the extension point for adding future system adapters (PF2E, 5E, etc.).
 *
 * Usage:
 *   AdapterRegistry.register(new PathfinderAdapter());
 *   const adapter = AdapterRegistry.get("pf2e");
 */
class AdapterRegistry {
    static adapters = new Map();
    /**
     * Registers an adapter for a system. Overwrites any previously registered
     * adapter for the same system ID — useful for hot-reloading during development.
     */
    static register(adapter) {
        const { systemId, systemName } = adapter.info;
        if (this.adapters.has(systemId)) {
            ModuleLogger.warn(`[AdapterRegistry] Overwriting existing adapter for system '${systemId}'.`);
        }
        this.adapters.set(systemId, adapter);
        ModuleLogger.info(`[AdapterRegistry] Registered adapter for ${systemName} (${systemId}).`);
    }
    /**
     * Retrieves the adapter for a given system ID.
     * @param systemId Foundry system ID (e.g. "sfrpg")
     * @returns The adapter, or undefined if none is registered.
     */
    static get(systemId) {
        return this.adapters.get(systemId);
    }
    /**
     * Returns the adapter for a system ID, throwing if none is found.
     * @param systemId Foundry system ID
     * @throws Error if no adapter is registered for the given system.
     */
    static getOrThrow(systemId) {
        const adapter = this.adapters.get(systemId);
        if (!adapter) {
            throw new Error(`[AdapterRegistry] No adapter registered for system '${systemId}'. ` +
                `Registered adapters: ${[...this.adapters.keys()].join(", ") || "none"}`);
        }
        return adapter;
    }
    /**
     * Returns the adapter for the currently active Foundry system.
     * Falls back gracefully if no adapter is available.
     */
    static getForCurrentSystem() {
        const systemId = typeof game !== "undefined" ? game.system?.id : undefined;
        if (!systemId)
            return undefined;
        return this.adapters.get(systemId);
    }
    /** Returns all registered system IDs. */
    static getRegisteredSystemIds() {
        return [...this.adapters.keys()];
    }
    /** Returns true if an adapter is registered for the given system. */
    static has(systemId) {
        return this.adapters.has(systemId);
    }
    /** Removes all registered adapters (useful for testing). */
    static clear() {
        this.adapters.clear();
    }
}

/**
 * Starfinder 1E item and actor type mappings.
 *
 * Maps logical content types to SFRPG system type strings and
 * Foundry document types. This file is the single source of truth
 * for type identity in the Starfinder adapter.
 *
 * When the SFRPG system changes type names, update only this file.
 */
/** Maps a logical ContentType to the SFRPG item type string. */
const SFRPG_ITEM_TYPE_MAP = {
    weapon: "weapon",
    armor: "armor",
    equipment: "equipment",
    augmentation: "augmentation",
    feat: "feat",
    spell: "spell",
    race: "race",
    theme: "theme",
    class: "class",
    archetypeFeature: "archetypeFeature",
};
/** Maps a logical ContentType to the SFRPG actor type string. */
const SFRPG_ACTOR_TYPE_MAP = {
    npc: "npc",
    vehicle: "vehicle",
    starship: "starship",
    hazard: "hazard",
};
/** Determines the Foundry document type for a given content type. */
function getDocumentTypeForContent(contentType) {
    if (contentType === "journal")
        return "JournalEntry";
    if (contentType in SFRPG_ACTOR_TYPE_MAP)
        return "Actor";
    return "Item";
}
/** Returns the system-specific type string for a content type. */
function getSfrpgSystemType(contentType) {
    if (contentType === "journal")
        return "journal";
    if (contentType in SFRPG_ITEM_TYPE_MAP)
        return SFRPG_ITEM_TYPE_MAP[contentType];
    if (contentType in SFRPG_ACTOR_TYPE_MAP)
        return SFRPG_ACTOR_TYPE_MAP[contentType];
    return contentType;
}
/**
 * Required fields per content type for validation.
 * Field names use dot-notation for nested paths.
 */
const SFRPG_REQUIRED_FIELDS = {
    weapon: ["name", "system.type", "system.level", "system.weaponType"],
    armor: ["name", "system.type", "system.level", "system.armor.eac", "system.armor.kac"],
    equipment: ["name", "system.type", "system.level"],
    augmentation: ["name", "system.type", "system.level", "system.system"],
    feat: ["name"],
    spell: ["name", "system.level", "system.school"],
    race: ["name"],
    theme: ["name"],
    class: ["name", "system.hpPerLevel", "system.bab"],
    archetypeFeature: ["name"],
    npc: ["name", "system.details.cr"],
    vehicle: ["name", "system.details.level"],
    starship: ["name", "system.details.tier"],
    hazard: ["name", "system.details.cr"],
    journal: ["name"],
};

var fieldMappings = {
	weapon: {
		name: "name",
		level: "system.level",
		price: "system.price",
		bulk: "system.bulk",
		type: "system.type",
		weaponType: "system.weaponType",
		damage: "system.damage",
		damageFormula: "system.damage[0].formula",
		damageType: "system.damage[0].type",
		critical: "system.critical.parts",
		range: "system.range.value",
		capacity: "system.capacity.max",
		usage: "system.usage.value",
		special: "system.special",
		description: "system.description.value",
		source: "system.source",
		rarity: "system.rarity",
		equipped: "system.equipped"
	},
	armor: {
		name: "name",
		level: "system.level",
		price: "system.price",
		bulk: "system.bulk",
		type: "system.type",
		eac: "system.armor.eac",
		kac: "system.armor.kac",
		maxDex: "system.maxDexBonus",
		acp: "system.armorCheckPenalty",
		speedAdjust: "system.speedAdjustment",
		upgradeSlots: "system.upgradeSlots",
		description: "system.description.value",
		source: "system.source",
		rarity: "system.rarity",
		equipped: "system.equipped"
	},
	equipment: {
		name: "name",
		level: "system.level",
		price: "system.price",
		bulk: "system.bulk",
		type: "system.type",
		capacity: "system.capacity.max",
		usage: "system.usage.value",
		description: "system.description.value",
		source: "system.source",
		rarity: "system.rarity",
		equipped: "system.equipped"
	},
	augmentation: {
		name: "name",
		level: "system.level",
		price: "system.price",
		type: "system.type",
		system: "system.system",
		capacity: "system.capacity.max",
		description: "system.description.value",
		source: "system.source"
	},
	feat: {
		name: "name",
		type: "system.type",
		prerequisites: "system.prerequisites.value",
		description: "system.description.value",
		source: "system.source"
	},
	spell: {
		name: "name",
		level: "system.level",
		school: "system.school",
		mysticLevel: "system.lists.mystic",
		technomancerLevel: "system.lists.technomancer",
		witchwarperLevel: "system.lists.witchwarper",
		precogLevel: "system.lists.precog",
		castingTime: "system.activation.type",
		duration: "system.duration.value",
		range: "system.range.value",
		target: "system.target.value",
		save: "system.save.type",
		saveDC: "system.save.dc",
		sr: "system.sr",
		description: "system.description.value",
		source: "system.source"
	},
	race: {
		name: "name",
		type: "system.type",
		subtype: "system.subtype",
		hp: "system.hit_points",
		size: "system.size",
		speed: "system.speed.base",
		strMod: "system.abilityMods.str",
		dexMod: "system.abilityMods.dex",
		conMod: "system.abilityMods.con",
		intMod: "system.abilityMods.int",
		wisMod: "system.abilityMods.wis",
		chaMod: "system.abilityMods.cha",
		description: "system.description.value",
		source: "system.source"
	},
	theme: {
		name: "name",
		abilityModAbility: "system.abilityMod.ability",
		abilityModValue: "system.abilityMod.value",
		description: "system.description.value",
		source: "system.source"
	},
	"class": {
		name: "name",
		hpPerLevel: "system.hpPerLevel",
		sp: "system.sp",
		bab: "system.bab",
		skillRanksPerLevel: "system.skillRanksPerLevel",
		keyAbility: "system.keyAbility",
		description: "system.description.value",
		source: "system.source"
	},
	archetypeFeature: {
		name: "name",
		description: "system.description.value",
		source: "system.source"
	},
	npc: {
		name: "name",
		cr: "system.details.cr",
		xp: "system.details.xp.value",
		alignment: "system.details.alignment",
		type: "system.details.type",
		subtype: "system.details.subtype",
		hp: "system.attributes.hp.value",
		hpMax: "system.attributes.hp.max",
		sp: "system.attributes.sp.value",
		eac: "system.attributes.eac.value",
		kac: "system.attributes.kac.value",
		fort: "system.attributes.fort.value",
		ref: "system.attributes.ref.value",
		will: "system.attributes.will.value",
		speed: "system.attributes.speed.value",
		str: "system.abilities.str.value",
		dex: "system.abilities.dex.value",
		con: "system.abilities.con.value",
		int: "system.abilities.int.value",
		wis: "system.abilities.wis.value",
		cha: "system.abilities.cha.value",
		description: "system.description.value",
		source: "system.source"
	},
	starship: {
		name: "name",
		tier: "system.details.tier",
		frame: "system.details.frame",
		size: "system.details.size",
		hp: "system.attributes.hp.value",
		hpMax: "system.attributes.hp.max",
		speed: "system.attributes.speed",
		maneuverability: "system.attributes.maneuverability",
		description: "system.description.value",
		source: "system.source"
	},
	vehicle: {
		name: "name",
		level: "system.details.level",
		price: "system.details.price",
		type: "system.details.type",
		hp: "system.attributes.hp.value",
		hpMax: "system.attributes.hp.max",
		eac: "system.attributes.eac.value",
		kac: "system.attributes.kac.value",
		landSpeed: "system.attributes.speed.land",
		description: "system.description.value",
		source: "system.source"
	},
	hazard: {
		name: "name",
		cr: "system.details.cr",
		xp: "system.details.xp.value",
		type: "system.details.type",
		description: "system.description.value",
		source: "system.source"
	},
	journal: {
		name: "name",
		content: "pages[0].text.content"
	}
};
var schemaMappings = {
	fieldMappings: fieldMappings
};

/**
 * Starfinder 1E System Adapter
 *
 * Transforms raw parsed data into SFRPG-compatible Foundry document data.
 * Uses schema-mappings.json for field-level mapping (updateable without
 * code changes) and item-type-mappings.ts for type identity resolution.
 */
// ---------------------------------------------------------------------------
// Default system data skeletons
// ---------------------------------------------------------------------------
/** Returns a minimal valid SFRPG description block. */
function emptyDescription() {
    return { value: "", chat: "", unidentified: "" };
}
/** Default system data skeletons per content type. */
const DEFAULT_SYSTEM_DATA = {
    weapon: {
        description: emptyDescription(),
        source: "",
        type: "small arm",
        weaponType: "ranged",
        level: 1,
        price: 0,
        bulk: "L",
        damage: [{ formula: "1d6", type: "B" }],
        critical: { parts: [] },
        range: { value: 30, units: "ft" },
        capacity: { value: 20, max: 20 },
        usage: { value: 1, per: "shot" },
        special: "",
        properties: {},
        equipped: false,
        identified: true,
        quantity: 1,
        rarity: "common",
    },
    armor: {
        description: emptyDescription(),
        source: "",
        type: "light",
        level: 1,
        price: 0,
        bulk: "1",
        armor: { eac: 1, kac: 2 },
        maxDexBonus: 5,
        armorCheckPenalty: 0,
        speedAdjustment: 0,
        upgradeSlots: 0,
        equipped: false,
        identified: true,
        quantity: 1,
        rarity: "common",
        properties: {},
        container: { contents: [] },
    },
    equipment: {
        description: emptyDescription(),
        source: "",
        type: "technological",
        level: 1,
        price: 0,
        bulk: "L",
        equipped: false,
        identified: true,
        quantity: 1,
        capacity: { value: 0, max: 0 },
        usage: { value: 0, per: "" },
        rarity: "common",
        container: { contents: [] },
    },
    augmentation: {
        description: emptyDescription(),
        source: "",
        type: "cybernetic",
        system: "universal",
        level: 1,
        price: 0,
        capacity: { value: 0, max: 0 },
        usage: { value: 0, per: "" },
        equipped: false,
        identified: true,
        quantity: 1,
    },
    feat: {
        description: emptyDescription(),
        source: "",
        type: "general",
        prerequisites: { value: [] },
        activation: { type: "none", cost: 0, condition: "" },
        uses: { value: 0, max: 0, per: "" },
        recharge: { value: "" },
        requirements: "",
        level: 0,
    },
    spell: {
        description: emptyDescription(),
        source: "",
        level: 1,
        school: "evo",
        components: { value: "V, S", verbal: true, somatic: true, material: false, focus: false, divineFocus: false },
        lists: { mystic: null, technomancer: null, witchwarper: null, precog: null },
        activation: { type: "action", cost: 1, condition: "" },
        duration: { value: "instantaneous", units: "inst", concentration: false, dismissal: false, discharge: false },
        target: { value: "one creature" },
        range: { value: "medium", units: "medium", additional: "" },
        area: { value: "", units: "", type: "", shapable: false, effect: "" },
        save: { type: "", dc: "", descriptor: "" },
        sr: false,
        damage: [],
        actionType: "save",
    },
    race: {
        description: emptyDescription(),
        source: "",
        type: "humanoid",
        subtype: "",
        hit_points: 4,
        size: "medium",
        speed: { base: 30, special: "" },
        abilityMods: {},
        traits: [],
        languages: { value: ["common"], custom: "" },
    },
    theme: {
        description: emptyDescription(),
        source: "",
        abilityMod: { ability: "", value: 0 },
    },
    class: {
        description: emptyDescription(),
        source: "",
        levels: 20,
        bab: "medium",
        hpPerLevel: 6,
        sp: 6,
        skillRanksPerLevel: 4,
        isMaster: false,
        proficiencies: {
            armor: ["light"],
            weapon: ["basic melee", "small arm"],
            saves: { fort: "slow", ref: "slow", will: "slow" },
        },
        keyAbility: "dex",
    },
    archetypeFeature: {
        description: emptyDescription(),
        source: "",
    },
    npc: {
        description: emptyDescription(),
        source: "",
        details: {
            alignment: "N",
            race: "",
            class: "",
            environment: "",
            organization: "",
            cr: 1,
            xp: { value: 400 },
            type: "humanoid",
            subtype: "",
            rarity: "",
        },
        attributes: {
            hp: { value: 15, min: 0, max: 15 },
            sp: { value: 0, min: 0, max: 0 },
            rp: { value: 0, min: 0, max: 0 },
            eac: { value: 11 },
            kac: { value: 13 },
            cmd: { value: 21 },
            init: { value: 0, total: 0 },
            bab: { value: 1 },
            fort: { value: 1 },
            ref: { value: 1 },
            will: { value: 1 },
            speed: { value: "30 ft.", special: "", land: { base: 30 }, fly: { base: 0, maneuverability: "" }, swim: { base: 0 }, burrow: { base: 0 }, climb: { base: 0 } },
            senses: { darkvision: 0, lowlightVision: false, blindsense: 0, blindsight: 0, senseText: "" },
        },
        abilities: {
            str: { value: 10, mod: 0 },
            dex: { value: 10, mod: 0 },
            con: { value: 10, mod: 0 },
            int: { value: 10, mod: 0 },
            wis: { value: 10, mod: 0 },
            cha: { value: 10, mod: 0 },
        },
        skills: {},
    },
    starship: {
        description: emptyDescription(),
        source: "",
        details: {
            tier: 1,
            frame: "",
            size: "medium",
            shields: "",
            cost: 0,
            buildPoints: 55,
        },
        attributes: {
            hp: { value: 40, min: 0, max: 40 },
            shields: { forward: 0, starboard: 0, aft: 0, port: 0, total: 0 },
            powerCoreUnits: 100,
            speed: 8,
            maneuverability: "average",
            acPiloting: 0,
            acTargeting: 0,
            driftEngine: "",
            expansionBays: 2,
        },
        crew: {
            captain: { actors: [] },
            pilot: { actors: [] },
            gunner: { actors: [] },
            engineer: { actors: [] },
            chiefMate: { actors: [] },
            magicOfficer: { actors: [] },
            scienceOfficer: { actors: [] },
        },
    },
    vehicle: {
        description: emptyDescription(),
        source: "",
        details: {
            type: "land",
            level: 1,
            price: 0,
            bulk: "—",
            passengers: 1,
            cargo: 0,
            hardness: 5,
        },
        attributes: {
            hp: { value: 20, min: 0, max: 20 },
            speed: { land: 30, water: 0, air: 0, ftl: false },
            eac: { value: 14 },
            kac: { value: 15 },
        },
    },
    hazard: {
        description: emptyDescription(),
        source: "",
        details: {
            type: "trap",
            subtype: "",
            cr: 1,
            xp: { value: 400 },
            rarity: "",
            reset: "",
        },
        attributes: {
            perception: { dc: 15 },
            disable: { dc: 15, skill: "Engineering" },
            trigger: "",
            effect: "",
            save: { type: "Reflex", dc: 15 },
        },
    },
    journal: {},
};
class StarfinderAdapter {
    info = {
        systemId: "sfrpg",
        systemName: "Starfinder 1E",
        targetSystemVersion: "0.25.0",
        adapterVersion: "1.0.0",
        supportedTypes: [
            "weapon", "armor", "equipment", "augmentation",
            "feat", "spell", "race", "theme", "class", "archetypeFeature",
            "npc", "vehicle", "starship", "hazard", "journal",
        ],
    };
    fieldMappings;
    constructor() {
        // Pull the fieldMappings section from the JSON config
        this.fieldMappings = schemaMappings.fieldMappings;
    }
    supportsContentType(contentType) {
        return this.info.supportedTypes.includes(contentType);
    }
    getDocumentType(contentType) {
        return getDocumentTypeForContent(contentType);
    }
    getSystemType(contentType) {
        return getSfrpgSystemType(contentType);
    }
    getRequiredFields(contentType) {
        return SFRPG_REQUIRED_FIELDS[contentType] ?? [];
    }
    createEmptySystemData(contentType) {
        const skeleton = DEFAULT_SYSTEM_DATA[contentType];
        return structuredClone(skeleton);
    }
    // -------------------------------------------------------------------------
    // Main transform method
    // -------------------------------------------------------------------------
    transform(entry) {
        const errors = [];
        const warnings = [];
        if (!this.supportsContentType(entry.contentType)) {
            errors.push({
                code: "UNSUPPORTED_CONTENT_TYPE",
                message: `Starfinder adapter does not support content type: ${entry.contentType}`,
                severity: "error",
                sourceReference: entry.sourceReference,
            });
            return { document: null, errors, warnings };
        }
        try {
            const documentType = this.getDocumentType(entry.contentType);
            const systemType = this.getSystemType(entry.contentType);
            // Start with a deep-cloned default system data object
            const systemData = this.createEmptySystemData(entry.contentType);
            // Apply field mappings from schema-mappings.json
            const fieldMap = this.fieldMappings[entry.contentType] ?? {};
            this.applyFieldMappings(entry.data, fieldMap, systemData, warnings, entry.sourceReference);
            // Resolve the document name
            const name = this.resolveString(entry.data["name"]) ?? "Unnamed Entry";
            if (!entry.data["name"]) {
                warnings.push({
                    code: "MISSING_NAME",
                    message: "Entry has no name field; defaulting to 'Unnamed Entry'.",
                    field: "name",
                    severity: "warning",
                    sourceReference: entry.sourceReference,
                });
            }
            // Build the metadata
            const metadata = this.buildMetadata(entry);
            // Build the transformed document
            const document = {
                documentType,
                systemType,
                name,
                system: systemData,
                metadata,
                source: entry,
            };
            ModuleLogger.debug(`[StarfinderAdapter] Transformed ${entry.contentType}: ${name}`);
            return { document, errors: [], warnings };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            ModuleLogger.error(`[StarfinderAdapter] Transform error for ${entry.contentType}: ${message}`);
            errors.push({
                code: "TRANSFORM_ERROR",
                message: `Unexpected error during transformation: ${message}`,
                severity: "error",
                sourceReference: entry.sourceReference,
                data: err,
            });
            return { document: null, errors, warnings };
        }
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    /**
     * Applies the field map by reading values from `sourceData` and writing
     * them into `targetData` using dot-notation paths.
     */
    applyFieldMappings(sourceData, fieldMap, targetData, warnings, sourceRef) {
        for (const [sourceKey, targetPath] of Object.entries(fieldMap)) {
            if (sourceKey === "name")
                continue; // handled separately
            const rawValue = sourceData[sourceKey];
            if (rawValue === undefined || rawValue === null || rawValue === "")
                continue;
            // Skip paths that go into the target root (non-system paths are unusual)
            if (!targetPath.startsWith("system.") && targetPath !== "name") {
                continue;
            }
            // Strip the "system." prefix since we're writing into systemData
            const path = targetPath.startsWith("system.") ? targetPath.slice(7) : targetPath;
            try {
                this.setNestedValue(targetData, path, rawValue);
            }
            catch {
                warnings.push({
                    code: "FIELD_MAP_ERROR",
                    message: `Could not map field '${sourceKey}' to path '${targetPath}'.`,
                    field: sourceKey,
                    severity: "warning",
                    sourceReference: sourceRef,
                });
            }
        }
    }
    /**
     * Sets a value at a dot-notation path within an object.
     * Creates intermediate objects as needed.
     */
    setNestedValue(obj, path, value) {
        const parts = path.split(".");
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
                current[part] = {};
            }
            current = current[part];
        }
        const lastPart = parts[parts.length - 1];
        current[lastPart] = value;
    }
    /** Resolves a raw value to a string or undefined. */
    resolveString(value) {
        if (typeof value === "string" && value.trim() !== "")
            return value.trim();
        if (typeof value === "number")
            return String(value);
        return undefined;
    }
    /** Builds ImportMetadata from a ParsedEntry. */
    buildMetadata(entry) {
        const partial = entry.metadata ?? {};
        return {
            sourceBook: partial.sourceBook ?? "Unknown",
            publisher: partial.publisher ?? "Unknown",
            author: partial.author ?? "",
            pageNumber: partial.pageNumber ?? 0,
            importDate: new Date().toISOString(),
            notes: partial.notes ?? "",
            tags: partial.tags ?? [],
            contentType: entry.contentType,
            schemaVersion: "1.0.0",
        };
    }
}

/**
 * Content Record Types — Milestone 2
 *
 * Defines the shape of every record stored in the SF3PL content database.
 * Records are system-agnostic staging data — they are NOT Foundry documents.
 * A future migration step (Milestone 3+) will convert them into Foundry Items,
 * Actors, and JournalEntries.
 *
 * Design principle: store as much original source data as possible so the
 * conversion step has full fidelity, without coupling to any system schema.
 */
// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------
/**
 * All supported content categories for Milestone 2.
 * Maps to logical content types for eventual Foundry document conversion.
 */
const CONTENT_CATEGORIES = [
    "weapon",
    "armor",
    "equipment",
    "augmentation",
    "feat",
    "spell",
    "race", // species
    "theme",
    "class",
    "archetypeFeature",
    "vehicle",
    "starship",
    "npc",
    "hazard",
    "journal",
];
/** Human-readable labels for each category. */
const CATEGORY_LABELS = {
    weapon: "Weapon",
    armor: "Armor",
    equipment: "Equipment",
    augmentation: "Augmentation",
    feat: "Feat",
    spell: "Spell",
    race: "Species",
    theme: "Theme",
    class: "Class",
    archetypeFeature: "Archetype",
    vehicle: "Vehicle",
    starship: "Starship",
    npc: "NPC",
    hazard: "Hazard",
    journal: "Journal Entry",
};
/** Returns true if the string is a valid ContentCategory. */
function isValidCategory(value) {
    return typeof value === "string" && CONTENT_CATEGORIES.includes(value);
}
const IMPORT_METHOD_LABELS = {
    json: "JSON File",
    csv: "CSV File",
    txt: "Text / OCR File",
    paste: "Pasted Text",
};

/**
 * Content Database — Milestone 2
 *
 * Manages a world-scoped database of ContentRecord objects persisted
 * in Foundry's settings API. Maintains an in-memory cache for fast
 * synchronous reads while async writes go to the server.
 *
 * Storage key: game.settings → "starfinder-thirdparty" → "contentDatabase"
 *
 * Usage:
 *   await ContentDatabase.initialize();          // call once on ready
 *   await ContentDatabase.add(record);
 *   const all = ContentDatabase.getAll();
 *   const results = ContentDatabase.query({ categories: ["weapon"] });
 *   await ContentDatabase.delete(id);
 */
const MODULE_ID$8 = "starfinder-thirdparty";
const DB_SETTING_KEY = "contentDatabase";
const SCHEMA_VERSION$1 = "2.0.0";
class ContentDatabase {
    /** In-memory record store. Key = record.id. */
    static cache = new Map();
    static initialized = false;
    // ── Lifecycle ────────────────────────────────────────────────────────────
    /**
     * Loads all records from Foundry settings into the in-memory cache.
     * Must be called once during the `ready` hook before any reads or writes.
     */
    static async initialize() {
        if (this.initialized)
            return;
        try {
            const raw = game.settings.get(MODULE_ID$8, DB_SETTING_KEY);
            const records = this.deserializeRecords(raw);
            this.cache.clear();
            for (const rec of records) {
                this.cache.set(rec.id, rec);
            }
            this.initialized = true;
            ModuleLogger.info(`[ContentDatabase] Initialized with ${this.cache.size} records.`);
        }
        catch (err) {
            ModuleLogger.error(`[ContentDatabase] Failed to initialize: ${String(err)}`);
            this.cache.clear();
            this.initialized = true;
        }
    }
    /** Resets the in-memory cache (useful for testing). */
    static reset() {
        this.cache.clear();
        this.initialized = false;
    }
    // ── Read operations ──────────────────────────────────────────────────────
    /** Returns true once initialize() has been called. */
    static isReady() {
        return this.initialized;
    }
    /**
     * Returns all records as an array, sorted by name ascending by default.
     */
    static getAll() {
        return [...this.cache.values()].sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Returns a single record by id, or undefined if not found.
     */
    static get(id) {
        return this.cache.get(id);
    }
    /**
     * Returns the first record whose name matches exactly (case-insensitive).
     */
    static getByName(name) {
        const lower = name.toLowerCase();
        for (const rec of this.cache.values()) {
            if (rec.name.toLowerCase() === lower)
                return rec;
        }
        return undefined;
    }
    /**
     * Returns true if any record in the database has the given name (case-insensitive).
     */
    static hasName(name) {
        return this.getByName(name) !== undefined;
    }
    /** Returns the total number of records in the database. */
    static count() {
        return this.cache.size;
    }
    /** Returns counts broken down by category. */
    static countByCategory() {
        const counts = {};
        for (const rec of this.cache.values()) {
            counts[rec.category] = (counts[rec.category] ?? 0) + 1;
        }
        return counts;
    }
    // ── Query ────────────────────────────────────────────────────────────────
    /**
     * Filters and sorts the database. All active filter conditions are ANDed.
     * @param filter Optional filter criteria.
     * @param sort Optional sort configuration.
     */
    static query(filter, sort) {
        let records = [...this.cache.values()];
        if (filter) {
            records = records.filter((rec) => this.matchesFilter(rec, filter));
        }
        const sortConfig = sort ?? { field: "name", ascending: true };
        records = this.applySorting(records, sortConfig);
        return records;
    }
    /**
     * Returns all unique values for a given field across all records.
     * Useful for populating filter dropdown options.
     */
    static getUniqueValues(field) {
        const values = new Set();
        for (const rec of this.cache.values()) {
            if (field === "tags") {
                for (const tag of rec.tags)
                    values.add(tag);
            }
            else {
                const v = rec[field];
                if (typeof v === "string" && v !== "")
                    values.add(v);
            }
        }
        return [...values].sort();
    }
    // ── Write operations ─────────────────────────────────────────────────────
    /**
     * Adds a single record to the database and persists to settings.
     * Throws if a record with the same name already exists (use addOrUpdate instead).
     */
    static async add(record) {
        if (this.cache.has(record.id)) {
            throw new Error(`[ContentDatabase] Record with id '${record.id}' already exists.`);
        }
        this.cache.set(record.id, { ...record, schemaVersion: SCHEMA_VERSION$1 });
        await this.persist();
    }
    /**
     * Updates an existing record. The record must already exist.
     */
    static async update(record) {
        if (!this.cache.has(record.id)) {
            throw new Error(`[ContentDatabase] Record '${record.id}' not found for update.`);
        }
        this.cache.set(record.id, { ...record, schemaVersion: SCHEMA_VERSION$1 });
        await this.persist();
    }
    /**
     * Adds a record if no record with that name exists; otherwise updates
     * the existing record by id (if found) or by name match.
     */
    static async addOrUpdate(record) {
        const existing = this.getByName(record.name);
        if (existing) {
            await this.update({ ...record, id: existing.id });
            return "updated";
        }
        await this.add(record);
        return "added";
    }
    /**
     * Deletes a record by id. No-op if the record does not exist.
     */
    static async delete(id) {
        if (!this.cache.has(id))
            return false;
        this.cache.delete(id);
        await this.persist();
        ModuleLogger.info(`[ContentDatabase] Deleted record: ${id}`);
        return true;
    }
    /**
     * Deletes all records from the database.
     */
    static async deleteAll() {
        this.cache.clear();
        await this.persist();
        ModuleLogger.info("[ContentDatabase] All records deleted.");
    }
    /**
     * Updates only the `notes` and `tags` fields of an existing record.
     * Used by the Content Browser's quick-edit panel.
     */
    static async updateNotesAndTags(id, notes, tags) {
        const rec = this.cache.get(id);
        if (!rec)
            throw new Error(`[ContentDatabase] Record '${id}' not found.`);
        this.cache.set(id, { ...rec, notes, tags });
        await this.persist();
    }
    // ── Batch import ─────────────────────────────────────────────────────────
    /**
     * Imports a batch of records into the database in a single settings write.
     * Checks for duplicate names and respects the overwrite flag.
     *
     * @param records Records to import.
     * @param overwriteDuplicates When true, existing records with matching names are overwritten.
     */
    static async importBatch(records, overwriteDuplicates = false) {
        const result = {
            added: [],
            skipped: [],
            overwritten: [],
            failed: [],
        };
        for (const record of records) {
            try {
                const existing = this.getByName(record.name);
                if (existing) {
                    if (overwriteDuplicates) {
                        const updated = { ...record, id: existing.id, schemaVersion: SCHEMA_VERSION$1 };
                        this.cache.set(existing.id, updated);
                        result.overwritten.push(updated);
                    }
                    else {
                        result.skipped.push(record.name);
                    }
                }
                else {
                    const newRecord = { ...record, schemaVersion: SCHEMA_VERSION$1 };
                    this.cache.set(newRecord.id, newRecord);
                    result.added.push(newRecord);
                }
            }
            catch (err) {
                result.failed.push({ name: record.name, reason: String(err) });
            }
        }
        // Single persist call for the whole batch
        await this.persist();
        ModuleLogger.info(`[ContentDatabase] Batch import: +${result.added.length} added, ` +
            `${result.overwritten.length} overwritten, ${result.skipped.length} skipped, ` +
            `${result.failed.length} failed.`);
        return result;
    }
    // ── Serialization / Persistence ──────────────────────────────────────────
    /**
     * Writes the current in-memory cache to Foundry settings.
     * This is an async operation that round-trips to the Foundry server.
     */
    static async persist() {
        const records = [...this.cache.values()];
        await game.settings.set(MODULE_ID$8, DB_SETTING_KEY, records);
        ModuleLogger.debug(`[ContentDatabase] Persisted ${records.length} records to settings.`);
    }
    /**
     * Deserializes raw settings data into typed ContentRecord objects.
     * Handles missing/extra fields gracefully for forward/backward compatibility.
     */
    static deserializeRecords(raw) {
        if (!Array.isArray(raw))
            return [];
        const records = [];
        for (const item of raw) {
            if (typeof item !== "object" || item === null)
                continue;
            const obj = item;
            // Validate and normalize category
            const category = isValidCategory(obj["category"])
                ? obj["category"]
                : "equipment";
            records.push({
                id: typeof obj["id"] === "string" ? obj["id"] : this.generateId(),
                name: typeof obj["name"] === "string" ? obj["name"] : "Unknown",
                category,
                sourceBook: typeof obj["sourceBook"] === "string" ? obj["sourceBook"] : "",
                publisher: typeof obj["publisher"] === "string" ? obj["publisher"] : "",
                author: typeof obj["author"] === "string" ? obj["author"] : "",
                pageNumber: typeof obj["pageNumber"] === "number" ? obj["pageNumber"] : 0,
                tags: Array.isArray(obj["tags"]) ? obj["tags"] : [],
                notes: typeof obj["notes"] === "string" ? obj["notes"] : "",
                rawContent: typeof obj["rawContent"] === "object" && obj["rawContent"] !== null
                    ? obj["rawContent"]
                    : {},
                importedDate: typeof obj["importedDate"] === "string"
                    ? obj["importedDate"]
                    : new Date().toISOString(),
                importMethod: ["json", "csv", "txt", "paste"].includes(obj["importMethod"])
                    ? obj["importMethod"]
                    : "json",
                schemaVersion: typeof obj["schemaVersion"] === "string" ? obj["schemaVersion"] : SCHEMA_VERSION$1,
            });
        }
        return records;
    }
    // ── Filter / Sort helpers ─────────────────────────────────────────────────
    static matchesFilter(rec, filter) {
        if (filter.searchText) {
            const needle = filter.searchText.toLowerCase();
            const inName = rec.name.toLowerCase().includes(needle);
            const inTags = rec.tags.some((t) => t.toLowerCase().includes(needle));
            const inNotes = rec.notes.toLowerCase().includes(needle);
            const inSource = rec.sourceBook.toLowerCase().includes(needle);
            if (!inName && !inTags && !inNotes && !inSource)
                return false;
        }
        if (filter.categories && filter.categories.length > 0) {
            if (!filter.categories.includes(rec.category))
                return false;
        }
        if (filter.publishers && filter.publishers.length > 0) {
            if (!filter.publishers.includes(rec.publisher))
                return false;
        }
        if (filter.sourceBooks && filter.sourceBooks.length > 0) {
            if (!filter.sourceBooks.includes(rec.sourceBook))
                return false;
        }
        if (filter.tags && filter.tags.length > 0) {
            const recTagSet = new Set(rec.tags);
            if (!filter.tags.every((t) => recTagSet.has(t)))
                return false;
        }
        if (filter.importMethod) {
            if (rec.importMethod !== filter.importMethod)
                return false;
        }
        return true;
    }
    static applySorting(records, sort) {
        const { field, ascending } = sort;
        return [...records].sort((a, b) => {
            let aVal;
            let bVal;
            switch (field) {
                case "category":
                    aVal = a.category;
                    bVal = b.category;
                    break;
                case "sourceBook":
                    aVal = a.sourceBook;
                    bVal = b.sourceBook;
                    break;
                case "publisher":
                    aVal = a.publisher;
                    bVal = b.publisher;
                    break;
                case "importedDate":
                    aVal = a.importedDate;
                    bVal = b.importedDate;
                    break;
                default:
                    aVal = a.name;
                    bVal = b.name;
            }
            const cmp = aVal.localeCompare(bVal);
            return ascending ? cmp : -cmp;
        });
    }
    // ── Utilities ─────────────────────────────────────────────────────────────
    /**
     * Generates a random ID string for a new record.
     * Uses foundry.utils.randomID when available, falls back to crypto.
     */
    static generateId() {
        if (typeof foundry !== "undefined" && foundry?.utils?.randomID) {
            return foundry.utils.randomID(16);
        }
        return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    }
    /**
     * Builds a ContentRecord from a raw data object (e.g. from a parser).
     * Fills in defaults for any missing fields.
     */
    static buildRecord(raw, category, importMethod, metadataOverrides) {
        return {
            id: this.generateId(),
            name: typeof raw["name"] === "string" ? raw["name"] : "Unnamed",
            category,
            sourceBook: metadataOverrides?.sourceBook ?? (typeof raw["sourceBook"] === "string" ? raw["sourceBook"] : ""),
            publisher: metadataOverrides?.publisher ?? (typeof raw["publisher"] === "string" ? raw["publisher"] : ""),
            author: metadataOverrides?.author ?? (typeof raw["author"] === "string" ? raw["author"] : ""),
            pageNumber: metadataOverrides?.pageNumber ?? (typeof raw["pageNumber"] === "number" ? raw["pageNumber"] : 0),
            tags: metadataOverrides?.tags ?? (Array.isArray(raw["tags"]) ? raw["tags"] : []),
            notes: metadataOverrides?.notes ?? (typeof raw["notes"] === "string" ? raw["notes"] : ""),
            rawContent: raw,
            importedDate: new Date().toISOString(),
            importMethod,
            schemaVersion: SCHEMA_VERSION$1,
        };
    }
}

/**
 * Import Validator — Milestone 2
 *
 * Validates a batch of ContentRecord drafts before they are committed to the
 * ContentDatabase. Produces structured errors and warnings per record.
 *
 * Validation rules:
 *   ERROR   — record will be rejected unless the user fixes it
 *   WARNING — record is accepted but needs attention
 *
 * Error conditions:
 *   - MISSING_NAME          : name is empty or absent
 *   - INVALID_CATEGORY      : category is not in the allowed list
 *   - DUPLICATE_NAME        : name already exists in the live database
 *
 * Warning conditions:
 *   - MISSING_SOURCE_BOOK   : sourceBook is empty
 *   - MISSING_PUBLISHER     : publisher is empty
 *   - MISSING_PAGE_NUMBER   : pageNumber is 0 or absent
 *   - POSSIBLE_DUPLICATE    : name closely matches an existing record
 *   - EMPTY_RAW_CONTENT     : rawContent has no fields beyond name/category
 */
// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------
class ImportValidator {
    /**
     * Validates a single draft object and returns a RecordValidationResult.
     * Checks the live ContentDatabase for duplicate names.
     *
     * @param draft    The raw draft object from the preview step.
     * @param index    The position of this draft in the source array (for UI use).
     * @param existingNames Optional pre-built Set of names already in the database.
     *                      Pass this when validating a batch to avoid N DB lookups.
     */
    static validateOne(draft, index, existingNames) {
        const issues = [];
        const name = typeof draft.name === "string" ? draft.name.trim() : "";
        // ── Required: name ───────────────────────────────────────────────────
        if (!name) {
            issues.push({
                level: "error",
                code: "MISSING_NAME",
                message: "Record has no name. A name is required.",
                field: "name",
            });
        }
        // ── Required: category ───────────────────────────────────────────────
        if (draft.category === undefined || draft.category === null || draft.category === "") {
            issues.push({
                level: "error",
                code: "MISSING_CATEGORY",
                message: "Record has no category. Specify one of: " + CONTENT_CATEGORIES.join(", "),
                field: "category",
            });
        }
        else if (!isValidCategory(draft.category)) {
            issues.push({
                level: "error",
                code: "INVALID_CATEGORY",
                message: `'${String(draft.category)}' is not a valid category. ` +
                    `Allowed: ${CONTENT_CATEGORIES.join(", ")}`,
                field: "category",
            });
        }
        // ── Duplicate name in database ────────────────────────────────────────
        if (name) {
            const dbNames = existingNames ?? this.buildExistingNameSet();
            if (dbNames.has(name.toLowerCase())) {
                issues.push({
                    level: "error",
                    code: "DUPLICATE_NAME",
                    message: `'${name}' already exists in the database. Enable "Overwrite Duplicates" to replace it.`,
                    field: "name",
                });
            }
        }
        // ── Warning: missing source book ─────────────────────────────────────
        const sourceBook = typeof draft.sourceBook === "string" ? draft.sourceBook.trim() : "";
        if (!sourceBook) {
            issues.push({
                level: "warning",
                code: "MISSING_SOURCE_BOOK",
                message: "Source book is not specified. Add source information for traceability.",
                field: "sourceBook",
            });
        }
        // ── Warning: missing publisher ────────────────────────────────────────
        const publisher = typeof draft.publisher === "string" ? draft.publisher.trim() : "";
        if (!publisher) {
            issues.push({
                level: "warning",
                code: "MISSING_PUBLISHER",
                message: "Publisher is not specified.",
                field: "publisher",
            });
        }
        // ── Warning: missing page number ──────────────────────────────────────
        const pageNumber = typeof draft.pageNumber === "number" ? draft.pageNumber : 0;
        if (pageNumber === 0) {
            issues.push({
                level: "warning",
                code: "MISSING_PAGE_NUMBER",
                message: "Page number is 0 or absent. Add a page number for source traceability.",
                field: "pageNumber",
            });
        }
        // ── Warning: sparse rawContent ───────────────────────────────────────
        const rawContentKeys = Object.keys(draft.rawContent ?? {}).filter((k) => k !== "name" && k !== "category");
        if (rawContentKeys.length === 0) {
            issues.push({
                level: "warning",
                code: "EMPTY_RAW_CONTENT",
                message: "Record contains no content fields beyond name and category. " +
                    "The record will save but conversion to a Foundry document may be incomplete.",
            });
        }
        const errors = issues.filter((i) => i.level === "error");
        const warnings = issues.filter((i) => i.level === "warning");
        return {
            index,
            name: name || "(no name)",
            valid: errors.length === 0,
            issues,
            errors,
            warnings,
        };
    }
    /**
     * Validates a batch of drafts in one pass.
     * Pre-builds the existing name set once for efficiency.
     *
     * @param drafts   Array of draft objects to validate.
     */
    static validateBatch(drafts) {
        const existingNames = this.buildExistingNameSet();
        const results = [];
        const errorCodes = new Set();
        const warningCodes = new Set();
        let valid = 0;
        let invalid = 0;
        let withWarnings = 0;
        for (let i = 0; i < drafts.length; i++) {
            const result = this.validateOne(drafts[i], i, existingNames);
            results.push(result);
            if (result.valid) {
                valid++;
            }
            else {
                invalid++;
                result.errors.forEach((e) => errorCodes.add(e.code));
            }
            if (result.warnings.length > 0) {
                withWarnings++;
                result.warnings.forEach((w) => warningCodes.add(w.code));
            }
        }
        return {
            totalChecked: drafts.length,
            valid,
            invalid,
            withWarnings,
            results,
            errorCodes: [...errorCodes],
            warningCodes: [...warningCodes],
            generatedAt: new Date().toISOString(),
        };
    }
    /**
     * Validates a batch with overwrite mode enabled.
     * When overwrite is true, DUPLICATE_NAME errors are suppressed and
     * replaced with WILL_OVERWRITE warnings.
     */
    static validateBatchWithOverwrite(drafts, overwrite) {
        const report = this.validateBatch(drafts);
        if (!overwrite)
            return report;
        // Promote DUPLICATE_NAME errors to warnings when overwrite is active
        for (const result of report.results) {
            const dupeErrors = result.errors.filter((e) => e.code === "DUPLICATE_NAME");
            if (dupeErrors.length === 0)
                continue;
            // Remove from errors, add as warnings
            result.errors = result.errors.filter((e) => e.code !== "DUPLICATE_NAME");
            for (const dupeErr of dupeErrors) {
                const warnIssue = {
                    level: "warning",
                    code: "WILL_OVERWRITE",
                    message: dupeErr.message.replace("Enable \"Overwrite Duplicates\" to replace it.", "This record will OVERWRITE the existing entry."),
                    field: "name",
                };
                result.warnings.push(warnIssue);
                result.issues = result.issues.map((i) => i.code === "DUPLICATE_NAME" ? warnIssue : i);
            }
            result.valid = result.errors.length === 0;
        }
        // Recount
        let valid = 0;
        let invalid = 0;
        let withWarnings = 0;
        const errorCodes = new Set();
        const warningCodes = new Set();
        for (const r of report.results) {
            if (r.valid)
                valid++;
            else
                invalid++;
            if (r.warnings.length > 0)
                withWarnings++;
            r.errors.forEach((e) => errorCodes.add(e.code));
            r.warnings.forEach((w) => warningCodes.add(w.code));
        }
        return {
            ...report,
            valid,
            invalid,
            withWarnings,
            errorCodes: [...errorCodes],
            warningCodes: [...warningCodes],
        };
    }
    /**
     * Formats a BatchValidationReport as a plain-text string for download.
     */
    static formatReportText(report) {
        const lines = [
            "=== SF3PL Import Validation Report ===",
            `Generated:     ${new Date(report.generatedAt).toLocaleString()}`,
            `Total Checked: ${report.totalChecked}`,
            `Valid:         ${report.valid}`,
            `Invalid:       ${report.invalid}`,
            `With Warnings: ${report.withWarnings}`,
            "",
        ];
        for (const result of report.results) {
            const status = result.valid ? "[PASS]" : "[FAIL]";
            lines.push(`${status} ${result.name}`);
            for (const issue of result.issues) {
                const prefix = issue.level === "error" ? "  ERROR" : "  WARN ";
                lines.push(`${prefix} [${issue.code}]: ${issue.message}`);
            }
            if (result.issues.length === 0) {
                lines.push("  No issues.");
            }
            lines.push("");
        }
        return lines.join("\n");
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    /** Builds a lowercase name set from the live database for duplicate checking. */
    static buildExistingNameSet() {
        const nameSet = new Set();
        if (ContentDatabase.isReady()) {
            for (const rec of ContentDatabase.getAll()) {
                nameSet.add(rec.name.toLowerCase());
            }
        }
        return nameSet;
    }
}

/**
 * Content Exporter — Milestone 2
 *
 * Exports ContentRecord objects from the database to JSON or CSV format
 * and triggers a browser file download.
 *
 * JSON export: full ContentRecord array — lossless, suitable for re-import.
 * CSV export:  flattened record with standard columns — suitable for spreadsheets.
 *
 * The exported JSON is designed to be directly re-importable via the JSON parser.
 */
// ── Column definitions for CSV ────────────────────────────────────────────
const CSV_COLUMNS = [
    { header: "id", resolve: (r) => r.id },
    { header: "name", resolve: (r) => r.name },
    { header: "category", resolve: (r) => r.category },
    { header: "categoryLabel", resolve: (r) => CATEGORY_LABELS[r.category] ?? r.category },
    { header: "sourceBook", resolve: (r) => r.sourceBook },
    { header: "publisher", resolve: (r) => r.publisher },
    { header: "author", resolve: (r) => r.author },
    { header: "pageNumber", resolve: (r) => String(r.pageNumber) },
    { header: "tags", resolve: (r) => r.tags.join("; ") },
    { header: "notes", resolve: (r) => r.notes },
    { header: "importedDate", resolve: (r) => r.importedDate },
    { header: "importMethod", resolve: (r) => r.importMethod },
    // Flatten the most common rawContent fields
    { header: "level", resolve: (r) => String(r.rawContent["level"] ?? "") },
    { header: "price", resolve: (r) => String(r.rawContent["price"] ?? "") },
    { header: "bulk", resolve: (r) => String(r.rawContent["bulk"] ?? "") },
    { header: "description", resolve: (r) => String(r.rawContent["description"] ?? "") },
];
class ContentExporter {
    // ── JSON export ─────────────────────────────────────────────────────────
    /**
     * Serializes a list of ContentRecord objects to a pretty-printed JSON string.
     * The output is valid for re-import via the JSON parser.
     *
     * @param records Records to export.
     */
    static toJson(records) {
        return JSON.stringify(records, null, 2);
    }
    /**
     * Creates a JSON export of a subset of records by id.
     * @param records Full record list (from database).
     * @param ids     IDs to include. If empty, all records are exported.
     */
    static toJsonFiltered(records, ids) {
        const filtered = ids.length > 0 ? records.filter((r) => ids.includes(r.id)) : records;
        return this.toJson(filtered);
    }
    // ── CSV export ──────────────────────────────────────────────────────────
    /**
     * Serializes a list of ContentRecord objects to CSV format.
     * Uses a fixed set of columns defined in CSV_COLUMNS.
     * Additional rawContent fields are not exported to keep the CSV manageable.
     *
     * @param records Records to export.
     */
    static toCsv(records) {
        const header = CSV_COLUMNS.map((c) => this.csvCell(c.header)).join(",");
        const rows = records.map((rec) => CSV_COLUMNS.map((c) => this.csvCell(c.resolve(rec))).join(","));
        return [header, ...rows].join("\r\n");
    }
    /**
     * Creates a CSV export of a subset of records by id.
     * @param records Full record list.
     * @param ids     IDs to include. If empty, all records are exported.
     */
    static toCsvFiltered(records, ids) {
        const filtered = ids.length > 0 ? records.filter((r) => ids.includes(r.id)) : records;
        return this.toCsv(filtered);
    }
    // ── Download helpers ────────────────────────────────────────────────────
    /**
     * Triggers a browser download for a JSON export of the given records.
     * @param records Records to export and download.
     * @param filename Suggested filename (default: sf3pl-export-<date>.json).
     */
    static downloadJson(records, filename) {
        const content = this.toJson(records);
        const name = filename ?? `sf3pl-export-${this.dateSuffix()}.json`;
        this.triggerDownload(content, name, "application/json");
    }
    /**
     * Triggers a browser download for a CSV export of the given records.
     * @param records Records to export and download.
     * @param filename Suggested filename (default: sf3pl-export-<date>.csv).
     */
    static downloadCsv(records, filename) {
        const content = this.toCsv(records);
        const name = filename ?? `sf3pl-export-${this.dateSuffix()}.csv`;
        this.triggerDownload(content, name, "text/csv;charset=utf-8;");
    }
    /**
     * Triggers a browser download for a validation report as plain text.
     * @param content Report text.
     * @param filename Suggested filename.
     */
    static downloadText(content, filename = "sf3pl-validation-report.txt") {
        this.triggerDownload(content, filename, "text/plain;charset=utf-8");
    }
    /**
     * Downloads the rawContent of a single record as a standalone JSON file.
     * Useful for debugging the parsed data.
     */
    static downloadRawContent(record) {
        const content = JSON.stringify({ name: record.name, category: record.category, ...record.rawContent }, null, 2);
        this.triggerDownload(content, `sf3pl-raw-${this.slugify(record.name)}.json`, "application/json");
    }
    // ── Private helpers ──────────────────────────────────────────────────────
    /**
     * Wraps a cell value in quotes and escapes internal quotes per RFC 4180.
     */
    static csvCell(value) {
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
    }
    /** Returns an ISO date suffix suitable for filenames (YYYY-MM-DD). */
    static dateSuffix() {
        return new Date().toISOString().slice(0, 10);
    }
    /** Converts a display name to a safe filename slug. */
    static slugify(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 40);
    }
    /**
     * Creates a Blob URL and triggers a download anchor click.
     * Cleans up the URL after a short delay.
     */
    static triggerDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
}

/**
 * Import Wizard Application — Milestone 2
 *
 * A multi-step Foundry V13 ApplicationV2 window that guides the GM through
 * the Milestone 2 content-management import pipeline:
 *
 *   Step 1 — Select Source  : Choose format (JSON/CSV/TXT/Paste) and provide data
 *   Step 2 — Preview        : Inspect parsed record drafts before validating
 *   Step 3 — Validate       : Review errors and warnings per record
 *   Step 4 — Save to DB     : Commit valid records to the ContentDatabase
 *
 * Records are staged in the ContentDatabase — not yet converted to Foundry
 * documents. That conversion is planned for a future milestone.
 */
// ── Shared defaults ──────────────────────────────────────────────────────────
const DEFAULT_METADATA = {
    sourceBook: "",
    publisher: "",
    author: "",
    pageNumber: 0,
    tags: [],
    notes: "",
};
// ── ApplicationV2 class ──────────────────────────────────────────────────────
const { ApplicationV2: ApplicationV2$8, HandlebarsApplicationMixin: HandlebarsApplicationMixin$8 } = foundry.applications.api;
class ImportWizardApp extends HandlebarsApplicationMixin$8(ApplicationV2$8) {
    static DEFAULT_OPTIONS = {
        id: "sf3pl-import-wizard",
        title: "SF3PL: Import Wizard",
        classes: ["sf3pl-app", "sf3pl-import-wizard"],
        window: { resizable: true },
        position: { width: 720, height: 640 },
    };
    static PARTS = {
        main: { template: "modules/starfinder-thirdparty/templates/import-wizard.hbs" },
    };
    state = {
        step: 1,
        importMethod: "json",
        rawInput: "",
        fileName: "",
        defaultCategory: "weapon",
        globalMetadata: { ...DEFAULT_METADATA },
        overwriteDuplicates: false,
        drafts: [],
        validationReport: null,
        savedCount: 0,
        saveErrors: [],
    };
    // ── Context preparation ───────────────────────────────────────────────────
    async _prepareContext(_options) {
        const { step, importMethod, drafts, validationReport } = this.state;
        // Build category select options
        const categoryOptions = CONTENT_CATEGORIES.map((c) => ({
            value: c,
            label: CATEGORY_LABELS[c],
            selected: c === this.state.defaultCategory,
        }));
        // Build import method options
        const methodOptions = ["json", "csv", "txt", "paste"].map((m) => ({
            value: m,
            label: IMPORT_METHOD_LABELS[m],
            selected: m === importMethod,
        }));
        // Preview table — show up to 10 drafts in Step 2
        const previewRows = drafts.slice(0, 50).map((d, i) => ({
            index: i + 1,
            name: String(d["name"] ?? "(no name)"),
            category: String(d["category"] ?? this.state.defaultCategory),
            sourceBook: String((d["sourceBook"] ?? this.state.globalMetadata.sourceBook) || "—"),
            publisher: String((d["publisher"] ?? this.state.globalMetadata.publisher) || "—"),
        }));
        // Validation summary
        let validationSummary = null;
        if (validationReport) {
            validationSummary = {
                totalChecked: validationReport.totalChecked,
                valid: validationReport.valid,
                invalid: validationReport.invalid,
                withWarnings: validationReport.withWarnings,
                passRate: validationReport.totalChecked > 0
                    ? Math.round((validationReport.valid / validationReport.totalChecked) * 100)
                    : 0,
                results: validationReport.results.map((r) => ({
                    index: r.index + 1,
                    name: r.name || "(no name)",
                    valid: r.valid,
                    issueCount: r.issues.length,
                    errorCount: r.errors.length,
                    warnCount: r.warnings.length,
                    issues: r.issues.map((iss) => ({
                        level: iss.level,
                        code: iss.code,
                        message: iss.message,
                        field: iss.field ?? "",
                        isError: iss.level === "error",
                    })),
                })),
            };
        }
        // Step 4 — save results
        const saveResults = step === 4
            ? {
                savedCount: this.state.savedCount,
                errorCount: this.state.saveErrors.length,
                errors: this.state.saveErrors,
            }
            : null;
        return {
            step,
            isStep1: step === 1,
            isStep2: step === 2,
            isStep3: step === 3,
            isStep4: step === 4,
            canGoBack: step > 1 && step < 4,
            canGoNext: this.canAdvance(),
            methodOptions,
            categoryOptions,
            globalMetadata: this.state.globalMetadata,
            overwriteDuplicates: this.state.overwriteDuplicates,
            fileName: this.state.fileName,
            draftCount: drafts.length,
            previewRows,
            showMoreCount: drafts.length > 50 ? drafts.length - 50 : 0,
            validationSummary,
            saveResults,
        };
    }
    // ── Render binding ────────────────────────────────────────────────────────
    _onRender(_context, _options) {
        const el = this.element;
        if (!el)
            return;
        // --- Step 1 controls ---
        const fileInput = el.querySelector("#sf3pl-file-input");
        if (fileInput) {
            fileInput.addEventListener("change", (evt) => void this.onFileChange(evt));
        }
        const textarea = el.querySelector("#sf3pl-paste-input");
        if (textarea) {
            textarea.addEventListener("input", () => {
                this.state.rawInput = textarea.value;
            });
        }
        const methodSelect = el.querySelector("#sf3pl-import-method");
        if (methodSelect) {
            methodSelect.addEventListener("change", () => {
                this.state.importMethod = methodSelect.value;
                void this.render(true);
            });
        }
        const categorySelect = el.querySelector("#sf3pl-default-category");
        if (categorySelect) {
            categorySelect.addEventListener("change", () => {
                this.state.defaultCategory = categorySelect.value;
            });
        }
        // Global metadata fields
        this.bindMetadataInputs(el);
        const overwriteCheck = el.querySelector("#sf3pl-overwrite");
        if (overwriteCheck) {
            overwriteCheck.addEventListener("change", () => {
                this.state.overwriteDuplicates = overwriteCheck.checked;
            });
        }
        // --- Navigation buttons ---
        el.querySelector("#sf3pl-btn-next")?.addEventListener("click", () => void this.goNext());
        el.querySelector("#sf3pl-btn-back")?.addEventListener("click", () => void this.goBack());
        el.querySelector("#sf3pl-btn-save")?.addEventListener("click", () => void this.saveToDatabase());
        // --- Download buttons ---
        el.querySelector("#sf3pl-btn-download-report")?.addEventListener("click", () => {
            this.downloadValidationReport();
        });
        el.querySelector("#sf3pl-btn-download-json")?.addEventListener("click", () => {
            this.downloadValidJson();
        });
        // --- Dismiss / start over ---
        el.querySelector("#sf3pl-btn-start-over")?.addEventListener("click", () => {
            this.resetWizard();
            void this.render(true);
        });
    }
    // ── Navigation logic ──────────────────────────────────────────────────────
    async goNext() {
        if (!this.canAdvance())
            return;
        switch (this.state.step) {
            case 1:
                await this.parseInput();
                if (this.state.drafts.length === 0) {
                    ui.notifications.warn("No records were parsed from the input. Check the format.");
                    return;
                }
                break;
            case 2:
                await this.validateDrafts();
                break;
        }
        this.state.step = (this.state.step + 1);
        await this.render(true);
    }
    async goBack() {
        if (this.state.step > 1 && this.state.step < 4) {
            this.state.step = (this.state.step - 1);
            await this.render(true);
        }
    }
    canAdvance() {
        switch (this.state.step) {
            case 1: return this.state.rawInput.trim().length > 0;
            case 2: return this.state.drafts.length > 0;
            case 3: return this.state.validationReport !== null;
            case 4: return false;
        }
    }
    // ── Pipeline steps ────────────────────────────────────────────────────────
    /**
     * Step 1 → Step 2: Parse raw input into ContentDraft objects.
     * Each parser returns an array of ParsedEntry objects. We flatten them
     * into the generic ContentDraft shape that the ImportValidator expects.
     */
    async parseInput() {
        const parserTypeMap = {
            json: "json",
            csv: "csv",
            txt: "ocr",
            paste: "json",
        };
        const parserType = parserTypeMap[this.state.importMethod];
        const parser = ParserRegistry.get(parserType);
        if (!parser) {
            ui.notifications.error(`No parser registered for type: ${parserType}`);
            return;
        }
        try {
            const parseResult = parser.parse(this.state.rawInput, {
                defaultContentType: this.state.defaultCategory,
                sourceMetadata: {
                    sourceBook: this.state.globalMetadata.sourceBook,
                    publisher: this.state.globalMetadata.publisher,
                    author: this.state.globalMetadata.author,
                    pageNumber: this.state.globalMetadata.pageNumber,
                },
            });
            // Convert ParsedEntry → ContentDraft, merging global metadata as defaults
            this.state.drafts = parseResult.entries.map((entry) => {
                const draft = {
                    name: entry.data["name"] ?? entry.data["Name"],
                    category: entry.data["category"] ?? entry.data["type"] ?? entry.contentType,
                    sourceBook: entry.metadata?.sourceBook ?? this.state.globalMetadata.sourceBook,
                    publisher: entry.metadata?.publisher ?? this.state.globalMetadata.publisher,
                    author: entry.metadata?.author ?? this.state.globalMetadata.author,
                    pageNumber: entry.metadata?.pageNumber ??
                        entry.data["pageNumber"] ??
                        this.state.globalMetadata.pageNumber,
                    rawContent: { ...entry.data },
                };
                return draft;
            });
            if (parseResult.errors.length > 0) {
                ui.notifications.warn(`Parsing completed with ${parseResult.errors.length} error(s). Some records may be incomplete.`);
            }
            ModuleLogger.info(`[ImportWizard] Parsed ${this.state.drafts.length} draft(s) from ${parserType} input.`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            ui.notifications.error(`Parsing failed: ${message}`);
            ModuleLogger.error(`[ImportWizard] Parse error: ${message}`);
            this.state.drafts = [];
        }
    }
    /**
     * Step 2 → Step 3: Run the ImportValidator on all drafts.
     * Duplicate detection uses the live ContentDatabase.
     */
    async validateDrafts() {
        if (this.state.overwriteDuplicates) {
            this.state.validationReport = ImportValidator.validateBatchWithOverwrite(this.state.drafts, this.state.overwriteDuplicates);
        }
        else {
            this.state.validationReport = ImportValidator.validateBatch(this.state.drafts);
        }
        const { valid, invalid } = this.state.validationReport;
        ModuleLogger.info(`[ImportWizard] Validation: ${valid} valid, ${invalid} invalid.`);
        if (invalid > 0) {
            ui.notifications.warn(`${invalid} record(s) failed validation and will be skipped unless you go back and fix the input.`);
        }
    }
    /**
     * Step 3 → Step 4: Save valid records to ContentDatabase.
     * Invalid records (with errors) are skipped automatically.
     */
    async saveToDatabase() {
        if (!this.state.validationReport)
            return;
        // Extract only drafts that passed validation
        const validDrafts = this.state.validationReport.results
            .filter((r) => r.valid)
            .map((r) => this.state.drafts[r.index])
            .filter(Boolean);
        if (validDrafts.length === 0) {
            ui.notifications.warn("No valid records to save.");
            return;
        }
        const importMethod = this.state.importMethod;
        const globalMeta = this.state.globalMetadata;
        // Build ContentRecord drafts from validated ContentDrafts
        const now = new Date().toISOString();
        const records = validDrafts.map((d) => ({
            id: `record_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            importedDate: now,
            schemaVersion: "2.0.0",
            name: String(d["name"] ?? ""),
            category: (isValidCategoryValue(d["category"])
                ? d["category"]
                : this.state.defaultCategory),
            sourceBook: String(d["sourceBook"] ?? globalMeta.sourceBook ?? ""),
            publisher: String(d["publisher"] ?? globalMeta.publisher ?? ""),
            author: String(d["author"] ?? globalMeta.author ?? ""),
            pageNumber: Number(d["pageNumber"] ?? globalMeta.pageNumber ?? 0),
            tags: parseTags(d["tags"] ?? globalMeta.tags),
            notes: String(d["notes"] ?? globalMeta.notes ?? ""),
            rawContent: d["rawContent"] ?? {},
            importMethod: importMethod,
        }));
        try {
            const result = await ContentDatabase.importBatch(records, this.state.overwriteDuplicates);
            this.state.savedCount = result.added.length + result.overwritten.length;
            this.state.saveErrors = result.failed.map((e) => e.reason);
            ui.notifications.info(`Saved ${result.added.length} new record(s)${result.overwritten.length > 0 ? `, updated ${result.overwritten.length}` : ""}` +
                `${result.skipped.length > 0 ? `, skipped ${result.skipped.length} duplicate(s)` : ""}.`);
            ModuleLogger.info(`[ImportWizard] DB save: ${result.added.length} created, ${result.overwritten.length} updated, ` +
                `${result.skipped.length} skipped, ${result.failed.length} error(s).`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.state.saveErrors = [message];
            ui.notifications.error(`Save failed: ${message}`);
            ModuleLogger.error(`[ImportWizard] Save error: ${message}`);
        }
        this.state.step = 4;
        await this.render(true);
    }
    // ── File handling ─────────────────────────────────────────────────────────
    async onFileChange(evt) {
        const input = evt.target;
        const file = input.files?.[0];
        if (!file)
            return;
        this.state.fileName = file.name;
        // Auto-detect import method from file extension
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "json")
            this.state.importMethod = "json";
        else if (ext === "csv")
            this.state.importMethod = "csv";
        else if (ext === "txt")
            this.state.importMethod = "txt";
        this.state.rawInput = await file.text();
        await this.render(true);
    }
    // ── Metadata binding ──────────────────────────────────────────────────────
    bindMetadataInputs(el) {
        const textFields = ["sourceBook", "publisher", "author", "notes"];
        for (const field of textFields) {
            const input = el.querySelector(`[name="meta.${field}"]`);
            if (input) {
                input.addEventListener("input", () => {
                    this.state.globalMetadata[field] = input.value;
                });
            }
        }
        const pageInput = el.querySelector('[name="meta.pageNumber"]');
        if (pageInput) {
            pageInput.addEventListener("input", () => {
                this.state.globalMetadata.pageNumber = parseInt(pageInput.value, 10) || 0;
            });
        }
        const tagsInput = el.querySelector('[name="meta.tags"]');
        if (tagsInput) {
            tagsInput.addEventListener("input", () => {
                this.state.globalMetadata.tags = tagsInput.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
            });
        }
    }
    // ── Download helpers ──────────────────────────────────────────────────────
    downloadValidationReport() {
        if (!this.state.validationReport)
            return;
        const text = ImportValidator.formatReportText(this.state.validationReport);
        ContentExporter.downloadText(text, "sf3pl-validation-report.txt");
    }
    downloadValidJson() {
        if (!this.state.validationReport)
            return;
        const validDrafts = this.state.validationReport.results
            .filter((r) => r.valid)
            .map((r) => this.state.drafts[r.index])
            .filter(Boolean);
        const json = JSON.stringify(validDrafts, null, 2);
        ContentExporter.downloadText(json, "sf3pl-valid-records.json");
    }
    // ── Reset ─────────────────────────────────────────────────────────────────
    resetWizard() {
        this.state = {
            step: 1,
            importMethod: "json",
            rawInput: "",
            fileName: "",
            defaultCategory: "weapon",
            globalMetadata: { ...DEFAULT_METADATA },
            overwriteDuplicates: false,
            drafts: [],
            validationReport: null,
            savedCount: 0,
            saveErrors: [],
        };
    }
}
// ── Module-level helpers ─────────────────────────────────────────────────────
function isValidCategoryValue(value) {
    return (typeof value === "string" &&
        CONTENT_CATEGORIES.includes(value));
}
function parseTags(value) {
    if (Array.isArray(value))
        return value.map(String).filter(Boolean);
    if (typeof value === "string")
        return value.split(",").map((t) => t.trim()).filter(Boolean);
    return [];
}

/**
 * Converter Types — Milestone 3
 *
 * Defines the interfaces and data shapes used by all Starfinder 1E
 * content converters. Converters transform ContentRecord objects (from
 * the M2 database) into Foundry-compatible document data ready for
 * insertion into compendium packs.
 *
 * Design: each converter is a stateless class implementing ICategoryConverter.
 * A ConverterRegistry maps ContentCategory values to the appropriate converter.
 */
const FLAGS_NAMESPACE = "starfinder-thirdparty";
const FLAGS_SCHEMA_VERSION = "3.0.0";
// ── Helper utilities ──────────────────────────────────────────────────────────
/**
 * Safely reads a value from rawContent by key.
 * Returns `fallback` when the key is missing or the value is null/undefined.
 */
function raw(rawContent, key, fallback) {
    const val = rawContent[key];
    if (val === undefined || val === null)
        return fallback;
    return val;
}
/** Coerces a value to a number, returning `fallback` on NaN. */
function toNum(value, fallback = 0) {
    const n = Number(value);
    return isNaN(n) ? fallback : n;
}
/** Coerces a value to a string. */
function toStr(value, fallback = "") {
    if (value === undefined || value === null)
        return fallback;
    return String(value);
}
/** Builds the standard SF3PL flags object from a ContentRecord. */
function buildFlags(record) {
    return {
        [FLAGS_NAMESPACE]: {
            sourceBook: record.sourceBook,
            publisher: record.publisher,
            author: record.author,
            pageNumber: record.pageNumber,
            importDate: new Date().toISOString(),
            recordId: record.id,
            tags: record.tags,
            notes: record.notes,
            importMethod: record.importMethod,
            schemaVersion: FLAGS_SCHEMA_VERSION,
        },
    };
}

/**
 * Converter Base Class — Milestone 3
 *
 * Abstract base class for all category-specific converters.
 * Provides:
 *   - Common document-wrapping logic
 *   - Flag injection from ContentRecord metadata
 *   - A `merge()` helper for deep-merging skeleton + mapped fields
 *   - Default ConversionResult builders (success / failure)
 *
 * Subclasses must implement:
 *   - buildSystemData(record) → category-specific SFRPG system data object
 *   - getDefaultSkeleton()    → base system data with all required defaults
 */
const MODULE_ID$7 = "starfinder-thirdparty";
class ConverterBase {
    /**
     * The full pack collection ID for this category.
     * E.g. "starfinder-thirdparty.sftpl-weapons"
     */
    get packId() {
        return `${MODULE_ID$7}.${this.packSuffix}`;
    }
    /**
     * Convert a ContentRecord into a Foundry document data object.
     * Wraps buildSystemData() with metadata injection and error handling.
     */
    convert(record) {
        const warnings = [];
        try {
            const systemData = this.buildSystemData(record);
            const flags = buildFlags(record);
            let documentData;
            if (this.documentType === "Item") {
                documentData = {
                    name: record.name,
                    type: this.sfrpgType,
                    system: systemData,
                    flags,
                };
            }
            else {
                documentData = {
                    name: record.name,
                    type: this.sfrpgType,
                    system: systemData,
                    flags,
                };
            }
            if (!record.sourceBook)
                warnings.push("Missing source book.");
            if (!record.publisher)
                warnings.push("Missing publisher.");
            if (record.pageNumber <= 0)
                warnings.push("Missing page number.");
            return {
                success: true,
                documentData,
                documentType: this.documentType,
                packId: this.packId,
                warnings,
                errors: [],
                recordName: record.name,
                recordId: record.id,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            ModuleLogger.error(`[${this.category}Converter] Conversion failed for "${record.name}": ${message}`);
            return {
                success: false,
                documentData: null,
                documentType: this.documentType,
                packId: this.packId,
                warnings,
                errors: [message],
                recordName: record.name,
                recordId: record.id,
            };
        }
    }
    // ── Shared field-extraction helpers ──────────────────────────────────────
    str(record, key, fallback = "") {
        return toStr(raw(record.rawContent, key, fallback), fallback);
    }
    num(record, key, fallback = 0) {
        return toNum(raw(record.rawContent, key, fallback), fallback);
    }
    bool(record, key, fallback = false) {
        const val = raw(record.rawContent, key, fallback);
        if (typeof val === "boolean")
            return val;
        const s = String(val).toLowerCase();
        return s === "true" || s === "yes" || s === "1";
    }
    /** Builds the standard description object used by all SFRPG items/actors. */
    description(record) {
        const value = this.str(record, "description");
        return { value, chat: "", unidentified: "" };
    }
    /**
     * Deep-merges `overrides` onto `base`.
     * Only one level deep — sufficient for SFRPG system data objects.
     */
    merge(base, overrides) {
        const result = { ...base };
        for (const [key, value] of Object.entries(overrides)) {
            if (value !== null &&
                typeof value === "object" &&
                !Array.isArray(value) &&
                typeof result[key] === "object" &&
                result[key] !== null &&
                !Array.isArray(result[key])) {
                result[key] = {
                    ...result[key],
                    ...value,
                };
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
}

/**
 * Weapon Converter — Milestone 3
 *
 * Converts a ContentRecord with category "weapon" into a Foundry SFRPG
 * weapon Item document. Supports both ranged and melee weapons including
 * damage formula parsing, range, capacity, and usage.
 */
class WeaponConverter extends ConverterBase {
    category = "weapon";
    documentType = "Item";
    sfrpgType = "weapon";
    packSuffix = "sftpl-weapons";
    buildSystemData(record) {
        const r = record.rawContent;
        const weaponType = this.str(record, "weaponType") || this.str(record, "type") || "smallArm";
        const isRanged = !["battleglove", "club", "dagger", "longsword", "sword", "melee"].some((t) => String(r["type"] ?? "").toLowerCase().includes(t));
        const damageFormula = this.str(record, "damageFormula") || this.str(record, "damage") || "1d6";
        const damageTypes = this.parseDamageTypes(this.str(record, "damageType") || this.str(record, "damageTypes") || "B");
        const critEffect = this.str(record, "critical") || this.str(record, "critEffect") || "";
        return {
            quantity: this.num(record, "quantity", 1),
            bulk: this.parseBulk(this.str(record, "bulk", "1")),
            level: this.num(record, "level", 1),
            price: this.num(record, "price", 0),
            description: this.description(record),
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            type: weaponType,
            weaponType: isRanged ? "ranged" : "melee",
            damage: [
                {
                    formula: damageFormula,
                    type: { values: damageTypes, custom: "" },
                },
            ],
            critical: {
                parts: critEffect ? [critEffect] : [],
            },
            range: {
                value: this.num(record, "range", isRanged ? 30 : 5),
                units: "ft",
                additional: "",
                increment: this.num(record, "rangeIncrement", isRanged ? 5 : 0),
            },
            capacity: {
                value: this.num(record, "capacity", 20),
                max: this.num(record, "capacity", 20),
            },
            usage: {
                value: this.num(record, "usage", 1),
                per: "shot",
            },
            special: this.str(record, "special"),
            equipped: false,
            proficient: false,
            rarity: this.str(record, "rarity", "common"),
        };
    }
    parseDamageTypes(raw) {
        const typeMap = {
            bludgeoning: "B", b: "B",
            piercing: "P", p: "P",
            slashing: "S", s: "S",
            fire: "F", f: "F",
            cold: "C", c: "C",
            electricity: "E", e: "E",
            acid: "A", a: "A",
            sonic: "So",
            force: "force",
        };
        return raw
            .split(/[\s,&]+/)
            .map((t) => typeMap[t.toLowerCase()] ?? t.toUpperCase())
            .filter(Boolean);
    }
    parseBulk(raw) {
        if (raw.toLowerCase() === "l")
            return 0.1;
        if (raw === "-" || raw === "")
            return 0;
        return Number(raw) || 1;
    }
}

/**
 * Armor Converter — Milestone 3
 *
 * Converts a ContentRecord with category "armor" into a Foundry SFRPG
 * armor Item document. Handles light, heavy, and powered armor types
 * including EAC/KAC bonuses, Max Dex, ACP, speed adjustment, and upgrade slots.
 */
class ArmorConverter extends ConverterBase {
    category = "armor";
    documentType = "Item";
    sfrpgType = "armor";
    packSuffix = "sftpl-armor";
    buildSystemData(record) {
        const armorType = this.resolveArmorType(this.str(record, "type") || this.str(record, "armorType"));
        return {
            quantity: this.num(record, "quantity", 1),
            bulk: this.parseBulk(this.str(record, "bulk", "1")),
            level: this.num(record, "level", 1),
            price: this.num(record, "price", 0),
            description: this.description(record),
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            type: armorType,
            armor: {
                eac: this.num(record, "eac", 0),
                kac: this.num(record, "kac", 0),
            },
            maxDexBonus: this.parseMaxDex(this.str(record, "maxDex") || this.str(record, "maxDexBonus")),
            armorCheckPenalty: this.num(record, "acp", 0) || this.num(record, "armorCheckPenalty", 0),
            speedAdjustment: this.parseSpeedAdjust(this.str(record, "speedAdjust") || this.str(record, "speedAdjustment")),
            upgradeSlots: this.num(record, "upgradeSlots", 0),
            equipped: false,
            rarity: this.str(record, "rarity", "common"),
        };
    }
    resolveArmorType(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("powered"))
            return "powered";
        if (lower.includes("heavy"))
            return "heavy";
        return "light";
    }
    parseMaxDex(raw) {
        if (!raw || raw === "-" || raw === "—")
            return 99;
        return Number(raw) || 5;
    }
    parseSpeedAdjust(raw) {
        if (!raw || raw === "-" || raw === "—")
            return 0;
        const n = parseInt(raw, 10);
        return isNaN(n) ? 0 : n;
    }
    parseBulk(raw) {
        if (raw.toLowerCase() === "l")
            return 0.1;
        if (raw === "-" || raw === "")
            return 0;
        return Number(raw) || 1;
    }
}

/**
 * Equipment Converter — Milestone 3
 *
 * Converts a ContentRecord with category "equipment" into a Foundry SFRPG
 * equipment Item document. Equipment covers general gear, technological
 * items, hybrid items, magic items, and consumables.
 */
class EquipmentConverter extends ConverterBase {
    category = "equipment";
    documentType = "Item";
    sfrpgType = "equipment";
    packSuffix = "sftpl-equipment";
    buildSystemData(record) {
        return {
            quantity: this.num(record, "quantity", 1),
            bulk: this.parseBulk(this.str(record, "bulk", "L")),
            level: this.num(record, "level", 1),
            price: this.num(record, "price", 0),
            description: this.description(record),
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            type: this.resolveEquipType(this.str(record, "type") || this.str(record, "equipType")),
            capacity: {
                value: this.num(record, "capacity", 0),
                max: this.num(record, "capacity", 0),
            },
            usage: {
                value: this.num(record, "usage", 0),
                per: this.str(record, "usagePer", "charge"),
            },
            equipped: false,
            rarity: this.str(record, "rarity", "common"),
        };
    }
    resolveEquipType(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("tech"))
            return "technological";
        if (lower.includes("magic"))
            return "magic";
        if (lower.includes("hybrid"))
            return "hybrid";
        if (lower.includes("augment"))
            return "augmentation";
        if (lower.includes("consum"))
            return "consumable";
        return "technological";
    }
    parseBulk(raw) {
        if (raw.toLowerCase() === "l")
            return 0.1;
        if (raw === "-" || raw === "")
            return 0;
        return Number(raw) || 0.1;
    }
}

/**
 * Augmentation Converter — Milestone 3
 *
 * Converts a ContentRecord with category "augmentation" into a Foundry SFRPG
 * augmentation Item document. Handles biotech, cybernetic, magitech, and
 * necrografts with system slot assignment.
 */
class AugmentationConverter extends ConverterBase {
    category = "augmentation";
    documentType = "Item";
    sfrpgType = "augmentation";
    packSuffix = "sftpl-augmentations";
    buildSystemData(record) {
        return {
            quantity: this.num(record, "quantity", 1),
            bulk: this.parseBulk(this.str(record, "bulk", "0")),
            level: this.num(record, "level", 1),
            price: this.num(record, "price", 0),
            description: this.description(record),
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            type: this.resolveAugType(this.str(record, "type") || this.str(record, "augType")),
            system: this.str(record, "system") || this.str(record, "bodySlot", ""),
            equipped: false,
            rarity: this.str(record, "rarity", "common"),
        };
    }
    resolveAugType(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("bio"))
            return "biotech";
        if (lower.includes("cyber"))
            return "cybernetic";
        if (lower.includes("magi"))
            return "magitech";
        if (lower.includes("necro"))
            return "necrograft";
        if (lower.includes("personal"))
            return "personal-upgrade";
        return "cybernetic";
    }
    parseBulk(raw) {
        if (raw.toLowerCase() === "l")
            return 0.1;
        if (raw === "-" || raw === "")
            return 0;
        return Number(raw) || 0;
    }
}

/**
 * Feat Converter — Milestone 3
 *
 * Converts a ContentRecord with category "feat" into a Foundry SFRPG
 * feat Item document. Supports combat, general, racial, and skill feats
 * with prerequisite parsing.
 */
class FeatConverter extends ConverterBase {
    category = "feat";
    documentType = "Item";
    sfrpgType = "feat";
    packSuffix = "sftpl-feats";
    buildSystemData(record) {
        const featType = this.resolveFeatType(this.str(record, "featType") || this.str(record, "type"));
        return {
            description: this.description(record),
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            type: featType,
            prerequisites: {
                parts: this.parsePrerequisites(this.str(record, "prerequisites") || this.str(record, "prereqs")),
            },
            activation: {
                type: this.str(record, "activation") || "passive",
                cost: this.num(record, "activationCost", 0),
                condition: this.str(record, "activationCondition"),
            },
            abilityMods: {
                parts: [],
            },
            modifiers: [],
            rarity: this.str(record, "rarity", "common"),
        };
    }
    resolveFeatType(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("combat"))
            return "combat";
        if (lower.includes("racial") || lower.includes("species"))
            return "racial";
        if (lower.includes("skill"))
            return "skill";
        if (lower.includes("general"))
            return "general";
        if (lower.includes("story"))
            return "story";
        return "general";
    }
    parsePrerequisites(raw) {
        if (!raw)
            return [];
        return raw.split(";").map((p) => p.trim()).filter(Boolean);
    }
}

/**
 * Spell Converter — Milestone 3
 *
 * Converts a ContentRecord with category "spell" into a Foundry SFRPG
 * spell Item document. Handles all spell parameters including school,
 * level, casting time, range, area, duration, saving throws, and SR.
 */
class SpellConverter extends ConverterBase {
    category = "spell";
    documentType = "Item";
    sfrpgType = "spell";
    packSuffix = "sftpl-spells";
    buildSystemData(record) {
        return {
            description: this.description(record),
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            level: this.num(record, "level", 1),
            school: this.resolveSchool(this.str(record, "school")),
            subschool: this.str(record, "subschool"),
            descriptors: {
                value: this.parseDescriptors(this.str(record, "descriptors")),
                custom: "",
            },
            activation: {
                type: this.resolveActivation(this.str(record, "castingTime") || this.str(record, "activation")),
                cost: 1,
                condition: "",
            },
            range: {
                value: this.str(record, "range", ""),
                units: this.resolveRangeUnits(this.str(record, "range")),
                additional: "",
            },
            area: {
                value: this.str(record, "area", ""),
                units: "ft",
                shape: this.str(record, "areaShape", ""),
            },
            effect: {
                value: this.str(record, "effect", ""),
                units: "",
                shape: "",
            },
            targets: {
                value: this.str(record, "targets", ""),
            },
            duration: {
                value: this.str(record, "duration", ""),
                units: this.str(record, "durationUnits", ""),
                dismissible: this.bool(record, "dismissible"),
            },
            save: {
                type: this.str(record, "save") || this.str(record, "savingThrow", ""),
                dc: this.str(record, "saveDC", ""),
                harmless: this.bool(record, "harmless"),
            },
            sr: this.bool(record, "sr"),
            damage: {
                parts: this.parseDamage(this.str(record, "damage") || this.str(record, "damageFormula")),
            },
            rarity: this.str(record, "rarity", "common"),
        };
    }
    resolveSchool(raw) {
        const map = {
            abjuration: "abj",
            conjuration: "con",
            divination: "div",
            enchantment: "enc",
            evocation: "evo",
            illusion: "ill",
            necromancy: "nec",
            transmutation: "trs",
            universal: "uni",
        };
        return map[raw.toLowerCase()] ?? raw.toLowerCase() ?? "uni";
    }
    resolveActivation(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("swift") || lower.includes("bonus"))
            return "swift";
        if (lower.includes("full"))
            return "full";
        if (lower.includes("reaction"))
            return "reaction";
        if (lower.includes("minute"))
            return "minute";
        return "standard";
    }
    resolveRangeUnits(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("close"))
            return "close";
        if (lower.includes("medium"))
            return "medium";
        if (lower.includes("long"))
            return "long";
        if (lower.includes("touch"))
            return "touch";
        if (lower.includes("personal"))
            return "personal";
        if (lower.includes("ft") || lower.includes("feet"))
            return "ft";
        return "ft";
    }
    parseDescriptors(raw) {
        if (!raw)
            return [];
        return raw.split(/[,;]/).map((d) => d.trim().toLowerCase()).filter(Boolean);
    }
    parseDamage(raw) {
        if (!raw)
            return [];
        return [{ formula: raw, type: { values: [], custom: "" } }];
    }
}

/**
 * Species Converter — Milestone 3+
 *
 * Converts a ContentRecord with category "race" into a Foundry SFRPG
 * race Item document.
 *
 * SFRPG race items store:
 *   - hp           — base hit points granted at level 1
 *   - size         — "fine" | "diminutive" | "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal"
 *   - subtype      — creature subtype string (e.g. "humanoid")
 *   - abilityMods  — { parts: [[modifier, abilityKey], …] }
 *   - damage       — { parts: [] } for natural weapon entries (usually empty on import)
 *   - modifiers    — flat modifier array (empty on import; user can fill later)
 *
 * The rawContent produced by SpeciesDetector includes:
 *   abilityMods   → Array<{ mod: string; ability: string }>
 *   hp            → number
 *   size          → string
 *   subtype       → string
 *   racialAbilities → Array<{ name, type, description }>
 *   description   → string
 */
const VALID_SIZES = new Set([
    "fine", "diminutive", "tiny", "small", "medium",
    "large", "huge", "gargantuan", "colossal",
]);
class SpeciesConverter extends ConverterBase {
    category = "race";
    documentType = "Item";
    sfrpgType = "race";
    packSuffix = "sftpl-species";
    buildSystemData(record) {
        const raw = record.rawContent;
        const hp = typeof raw["hp"] === "number" ? raw["hp"] : 4;
        const rawSize = typeof raw["size"] === "string" ? raw["size"].toLowerCase() : "medium";
        const size = VALID_SIZES.has(rawSize) ? rawSize : "medium";
        const subtype = typeof raw["subtype"] === "string" ? raw["subtype"] : "humanoid";
        const abilityModParts = this.buildAbilityModParts(raw["abilityMods"]);
        const racialAbilityDesc = this.buildRacialAbilitiesHtml(raw["racialAbilities"]);
        const baseDescription = this.str(record, "description");
        const fullDescription = racialAbilityDesc
            ? `${baseDescription}\n\n${racialAbilityDesc}`.trim()
            : baseDescription;
        return {
            description: {
                value: fullDescription,
                chat: "",
                unidentified: "",
            },
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            hp,
            size,
            subtype,
            abilityMods: {
                parts: abilityModParts,
            },
            damage: {
                parts: [],
            },
            modifiers: [],
            rarity: this.str(record, "rarity", "common"),
        };
    }
    /**
     * Converts the SpeciesDetector abilityMods array into the format
     * expected by SFRPG: [["+2", "str"], ["-2", "int"], …]
     */
    buildAbilityModParts(raw) {
        if (!Array.isArray(raw))
            return [];
        const parts = [];
        for (const entry of raw) {
            if (entry &&
                typeof entry === "object" &&
                !Array.isArray(entry) &&
                typeof entry.mod === "string" &&
                typeof entry.ability === "string") {
                const { mod, ability } = entry;
                if (mod && ability) {
                    parts.push([mod, ability]);
                }
            }
        }
        return parts;
    }
    /**
     * Renders racial abilities as a simple HTML list to embed in the description.
     * Users can refine this in the item sheet.
     */
    buildRacialAbilitiesHtml(raw) {
        if (!Array.isArray(raw) || raw.length === 0)
            return "";
        const items = raw.map((entry) => {
            const e = entry;
            const name = e.name ?? "Racial Ability";
            const type = e.type ? ` (${e.type})` : "";
            const desc = e.description ?? "";
            return `<li><strong>${name}${type}:</strong> ${desc}</li>`;
        });
        return `<ul>${items.join("")}</ul>`;
    }
}

/**
 * Theme Converter — Milestone 3
 *
 * Converts a ContentRecord with category "theme" into a Foundry SFRPG
 * theme Item document. Themes provide ability score modifiers and class
 * skill bonuses from levels 1, 6, 12, and 18.
 */
class ThemeConverter extends ConverterBase {
    category = "theme";
    documentType = "Item";
    sfrpgType = "theme";
    packSuffix = "sftpl-themes";
    buildSystemData(record) {
        return {
            description: this.description(record),
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            abilityMod: {
                ability: this.resolveAbility(this.str(record, "abilityMod") || this.str(record, "keyAbility")),
                value: this.num(record, "abilityModValue", 1),
            },
            skill: this.str(record, "classSkill") || this.str(record, "themeSkill", ""),
            themeKnowledge: {
                subtype: this.str(record, "knowledgeSubtype", ""),
                skill: this.str(record, "knowledgeSkill", ""),
            },
            rarity: this.str(record, "rarity", "common"),
        };
    }
    resolveAbility(raw) {
        const map = {
            strength: "str", str: "str",
            dexterity: "dex", dex: "dex",
            constitution: "con", con: "con",
            intelligence: "int", int: "int",
            wisdom: "wis", wis: "wis",
            charisma: "cha", cha: "cha",
            any: "any",
        };
        return map[raw.toLowerCase()] ?? "any";
    }
}

/**
 * Class Converter — Milestone 3
 *
 * Converts a ContentRecord with category "class" into a Foundry SFRPG
 * class Item document. Handles key ability, hit points, stamina points,
 * BAB progression, saving throw progressions, and skill ranks.
 */
class ClassConverter extends ConverterBase {
    category = "class";
    documentType = "Item";
    sfrpgType = "class";
    packSuffix = "sftpl-classes";
    buildSystemData(record) {
        return {
            description: this.description(record),
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            keyAbility: this.resolveAbility(this.str(record, "keyAbility") || this.str(record, "abilityScore")),
            hp: this.num(record, "hp", 6),
            sp: this.num(record, "sp", 6),
            skillRanks: this.num(record, "skillRanks", 4),
            levels: 20,
            bab: this.resolveProgression(this.str(record, "bab") || this.str(record, "babProgression")),
            saves: {
                fort: this.resolveProgression(this.str(record, "fortSave") || this.str(record, "fort", "poor")),
                ref: this.resolveProgression(this.str(record, "refSave") || this.str(record, "ref", "poor")),
                will: this.resolveProgression(this.str(record, "willSave") || this.str(record, "will", "poor")),
            },
            proficiencies: {
                weapon: this.parseList(this.str(record, "weaponProficiencies")),
                armor: this.parseList(this.str(record, "armorProficiencies")),
            },
            rarity: this.str(record, "rarity", "common"),
        };
    }
    resolveAbility(raw) {
        const map = {
            strength: "str", str: "str",
            dexterity: "dex", dex: "dex",
            constitution: "con", con: "con",
            intelligence: "int", int: "int",
            wisdom: "wis", wis: "wis",
            charisma: "cha", cha: "cha",
        };
        return map[raw.toLowerCase()] ?? "str";
    }
    resolveProgression(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("full") || lower === "1" || lower === "good")
            return "full";
        if (lower.includes("3/4") || lower.includes("3") || lower === "medium")
            return "3/4";
        if (lower.includes("1/2") || lower.includes("half") || lower === "poor")
            return "1/2";
        return "poor";
    }
    parseList(raw) {
        if (!raw)
            return [];
        return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    }
}

/**
 * Archetype Converter — Milestone 3
 *
 * Converts a ContentRecord with category "archetypeFeature" into a Foundry SFRPG
 * archetypeFeature Item document. Handles alternate class feature substitutions
 * for archetypes including level requirements and replaced features.
 */
class ArchetypeConverter extends ConverterBase {
    category = "archetypeFeature";
    documentType = "Item";
    sfrpgType = "archetypeFeature";
    packSuffix = "sftpl-archetypes";
    buildSystemData(record) {
        return {
            description: this.description(record),
            source: `${record.sourceBook} pg. ${record.pageNumber}`,
            levels: this.parseLevels(this.str(record, "levels") || this.str(record, "level")),
            replaces: this.parseList(this.str(record, "replaces") || this.str(record, "replacedFeatures")),
            archetype: {
                name: this.str(record, "archetype") || this.str(record, "archetypeName", ""),
            },
            rarity: this.str(record, "rarity", "common"),
        };
    }
    parseLevels(raw) {
        if (!raw)
            return [];
        return raw.split(/[,;]/)
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n) && n >= 1 && n <= 20);
    }
    parseList(raw) {
        if (!raw)
            return [];
        return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    }
}

/**
 * Item Converters Index — Milestone 3
 *
 * Exports all SFRPG item category converters and provides a convenience
 * factory function that returns a pre-constructed array of all item converters
 * for registration in the ConverterRegistry.
 */
/**
 * Returns an array of all item converter instances.
 * Use this to bulk-register item converters with the ConverterRegistry.
 */
function createItemConverters() {
    return [
        new WeaponConverter(),
        new ArmorConverter(),
        new EquipmentConverter(),
        new AugmentationConverter(),
        new FeatConverter(),
        new SpellConverter(),
        new SpeciesConverter(),
        new ThemeConverter(),
        new ClassConverter(),
        new ArchetypeConverter(),
    ];
}

/**
 * NPC Converter — Milestone 3
 *
 * Converts a ContentRecord with category "npc" into a Foundry SFRPG
 * npc2 Actor document. Builds the full NPC stat block including ability
 * scores, defensive stats (EAC/KAC/HP), speed, attack entries, and skills.
 *
 * The SFRPG system uses "npc2" as the actor type for the revised NPC format.
 */
class NpcConverter extends ConverterBase {
    category = "npc";
    documentType = "Actor";
    sfrpgType = "npc2";
    packSuffix = "sftpl-npcs";
    buildSystemData(record) {
        return {
            details: {
                alignment: this.str(record, "alignment", "N"),
                cr: this.parseCR(this.str(record, "cr") || this.str(record, "challengeRating", "1")),
                xp: {
                    value: this.num(record, "xp", this.crToXP(this.str(record, "cr", "1"))),
                },
                source: `${record.sourceBook} pg. ${record.pageNumber}`,
                type: this.str(record, "creatureType") || this.str(record, "type", ""),
                subtype: this.str(record, "creatureSubtype") || this.str(record, "subtype", ""),
                size: this.resolveSize(this.str(record, "size", "medium")),
                biography: { value: this.str(record, "description") },
            },
            attributes: {
                eac: {
                    value: this.num(record, "eac", 10),
                    min: 0,
                },
                kac: {
                    value: this.num(record, "kac", 10),
                    min: 0,
                },
                hp: {
                    value: this.num(record, "hp", 6),
                    max: this.num(record, "hp", 6),
                    min: 0,
                },
                sp: {
                    value: 0,
                    max: 0,
                    min: 0,
                },
                init: {
                    value: this.num(record, "initiative") || this.num(record, "init", 0),
                    bonus: 0,
                    total: this.num(record, "initiative") || this.num(record, "init", 0),
                },
                fort: {
                    bonus: this.num(record, "fort", 0),
                    misc: 0,
                    value: this.num(record, "fort", 0),
                },
                reflex: {
                    bonus: this.num(record, "ref", 0),
                    misc: 0,
                    value: this.num(record, "ref", 0),
                },
                will: {
                    bonus: this.num(record, "will", 0),
                    misc: 0,
                    value: this.num(record, "will", 0),
                },
                bab: this.num(record, "bab", 0),
                cmd: {
                    value: this.num(record, "cmd", 10),
                },
            },
            abilities: this.buildAbilities(record),
            skills: this.buildSkills(record),
            traits: {
                dr: this.str(record, "dr") || this.str(record, "damageReduction", ""),
                immunities: {
                    value: this.parseList(this.str(record, "immunities")),
                },
                weaknesses: {
                    value: this.parseList(this.str(record, "weaknesses")),
                },
                resistances: this.parseResistances(this.str(record, "resistances") || this.str(record, "sr", "")),
                senses: this.str(record, "senses", ""),
                languages: {
                    value: this.parseList(this.str(record, "languages")),
                    custom: "",
                },
            },
            speed: {
                value: this.num(record, "speed", 30),
                special: this.str(record, "otherSpeed", ""),
            },
        };
    }
    parseCR(raw) {
        if (raw.includes("/")) {
            const [num, den] = raw.split("/").map(Number);
            return num / den;
        }
        return Number(raw) || 1;
    }
    crToXP(cr) {
        const crMap = {
            "1/6": 65, "1/4": 100, "1/3": 135, "1/2": 200,
            "1": 400, "2": 600, "3": 800, "4": 1200, "5": 1600,
            "6": 2400, "7": 3200, "8": 4800, "9": 6400, "10": 9600,
            "11": 12800, "12": 19200, "13": 25600, "14": 38400, "15": 51200,
            "16": 76800, "17": 102400, "18": 153600, "19": 204800, "20": 307200,
            "21": 409600, "22": 614400, "23": 819200, "24": 1228800, "25": 1638400,
        };
        return crMap[cr] ?? 400;
    }
    resolveSize(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("fine"))
            return "fine";
        if (lower.includes("dim"))
            return "diminutive";
        if (lower.includes("tiny"))
            return "tiny";
        if (lower.includes("small"))
            return "small";
        if (lower.includes("large"))
            return "large";
        if (lower.includes("huge"))
            return "huge";
        if (lower.includes("garg"))
            return "gargantuan";
        if (lower.includes("col"))
            return "colossal";
        return "medium";
    }
    buildAbilities(record) {
        const abilities = ["str", "dex", "con", "int", "wis", "cha"];
        const result = {};
        for (const ab of abilities) {
            const score = this.num(record, ab, 10);
            result[ab] = {
                value: score,
                min: 3,
                misc: 0,
                mod: Math.floor((score - 10) / 2),
                base: score,
            };
        }
        return result;
    }
    buildSkills(record) {
        const skillsRaw = this.str(record, "skills");
        if (!skillsRaw)
            return {};
        const skills = {};
        const entries = skillsRaw.split(",");
        for (const entry of entries) {
            const match = entry.trim().match(/^(\w[\w\s]*?)\s*([+-]\d+)$/);
            if (match) {
                const skillName = match[1].trim().toLowerCase().replace(/\s+/g, "");
                const bonus = parseInt(match[2], 10);
                skills[skillName] = { value: 0, misc: bonus, ranks: 0, mod: bonus };
            }
        }
        return skills;
    }
    parseList(raw) {
        if (!raw)
            return [];
        return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    }
    parseResistances(raw) {
        return raw ?? "";
    }
}

/**
 * Vehicle Converter — Milestone 3
 *
 * Converts a ContentRecord with category "vehicle" into a Foundry SFRPG
 * vehicle Actor document. Handles land vehicles, aircraft, and water vehicles
 * including speed, drive/pilot DC, attack profiles, and crew.
 */
class VehicleConverter extends ConverterBase {
    category = "vehicle";
    documentType = "Actor";
    sfrpgType = "vehicle";
    packSuffix = "sftpl-vehicles";
    buildSystemData(record) {
        return {
            details: {
                source: `${record.sourceBook} pg. ${record.pageNumber}`,
                type: this.resolveVehicleType(this.str(record, "type") || this.str(record, "vehicleType")),
                biography: { value: this.str(record, "description") },
            },
            attributes: {
                eac: {
                    value: this.num(record, "eac", 10),
                    min: 0,
                },
                kac: {
                    value: this.num(record, "kac", 10),
                    min: 0,
                },
                hp: {
                    value: this.num(record, "hp", 20),
                    max: this.num(record, "hp", 20),
                    min: 0,
                },
                hardness: this.num(record, "hardness", 0),
                cover: this.str(record, "cover", "total"),
            },
            frame: {
                size: this.resolveSize(this.str(record, "size", "large")),
                bulk: this.num(record, "bulk", 50),
                price: this.num(record, "price", 0),
                level: this.num(record, "level", 1),
            },
            movement: {
                speed: this.num(record, "speed", 30),
                speedType: this.str(record, "speedType", "land"),
                fullSpeed: this.num(record, "fullSpeed") || this.num(record, "speed", 30) * 3,
                pilotingBonus: this.num(record, "pilotingBonus", 0),
                driveDC: this.num(record, "driveDC", 15),
                maneuver: this.resolveManeuver(this.str(record, "maneuver")),
            },
            crew: {
                minimumCrew: this.num(record, "minCrew") || this.num(record, "crew", 1),
                maximumPassengers: this.num(record, "maxPassengers") || this.num(record, "passengers", 0),
            },
        };
    }
    resolveVehicleType(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("air") || lower.includes("fly"))
            return "air";
        if (lower.includes("water") || lower.includes("sea") || lower.includes("aqua"))
            return "water";
        return "land";
    }
    resolveSize(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("small"))
            return "small";
        if (lower.includes("medium"))
            return "medium";
        if (lower.includes("large"))
            return "large";
        if (lower.includes("huge"))
            return "huge";
        if (lower.includes("garg"))
            return "gargantuan";
        if (lower.includes("col"))
            return "colossal";
        return "large";
    }
    resolveManeuver(raw) {
        const lower = (raw ?? "").toLowerCase();
        if (lower.includes("perfect"))
            return "perfect";
        if (lower.includes("good"))
            return "good";
        if (lower.includes("average"))
            return "average";
        if (lower.includes("poor"))
            return "poor";
        if (lower.includes("clumsy"))
            return "clumsy";
        return "average";
    }
}

/**
 * Starship Converter — Milestone 3
 *
 * Converts a ContentRecord with category "starship" into a Foundry SFRPG
 * starship Actor document. Handles frame, tier, PCU, shields, AC, TL,
 * DT, crew actions, and speed/maneuverability.
 */
class StarshipConverter extends ConverterBase {
    category = "starship";
    documentType = "Actor";
    sfrpgType = "starship";
    packSuffix = "sftpl-starships";
    buildSystemData(record) {
        return {
            details: {
                source: `${record.sourceBook} pg. ${record.pageNumber}`,
                biography: { value: this.str(record, "description") },
                frame: this.str(record, "frame", ""),
                manufacturer: this.str(record, "manufacturer", ""),
                model: this.str(record, "model", ""),
                tier: this.parseTier(this.str(record, "tier", "1")),
                size: this.resolveSize(this.str(record, "size", "medium")),
                price: this.num(record, "price", 0),
            },
            attributes: {
                hp: {
                    value: this.num(record, "hp", 30),
                    max: this.num(record, "hp", 30),
                    min: 0,
                },
                dt: this.num(record, "dt", 0),
                ct: Math.floor(this.num(record, "hp", 30) / 5),
                shields: {
                    forward: this.num(record, "shieldsForward") || this.num(record, "shields", 0),
                    starboard: this.num(record, "shieldsStarboard") || this.num(record, "shields", 0),
                    port: this.num(record, "shieldsPort") || this.num(record, "shields", 0),
                    aft: this.num(record, "shieldsAft") || this.num(record, "shields", 0),
                },
                ac: {
                    value: this.num(record, "ac", 10),
                    misc: 0,
                },
                tl: {
                    value: this.num(record, "tl", 10),
                    misc: 0,
                },
                pcu: this.num(record, "pcu", 30),
                powerCoreUnits: this.num(record, "pcu", 30),
                bsp: this.num(record, "bsp", 0),
            },
            movement: {
                speed: this.num(record, "speed", 6),
                maneuverability: this.resolveManeuverability(this.str(record, "maneuver") || this.str(record, "maneuverability")),
            },
            crew: {
                captain: { limit: 1 },
                pilot: { limit: 1 },
                gunners: { limit: this.num(record, "gunners", 1) },
                engineers: { limit: this.num(record, "engineers", 1) },
                science: { limit: this.num(record, "scienceOfficers", 1) },
            },
        };
    }
    parseTier(raw) {
        if (raw.includes("/")) {
            const [num, den] = raw.split("/").map(Number);
            return num / den;
        }
        return Number(raw) || 1;
    }
    resolveSize(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("tiny"))
            return "tiny";
        if (lower.includes("small"))
            return "small";
        if (lower.includes("medium"))
            return "medium";
        if (lower.includes("large"))
            return "large";
        if (lower.includes("huge"))
            return "huge";
        if (lower.includes("garg"))
            return "gargantuan";
        if (lower.includes("col"))
            return "colossal";
        return "medium";
    }
    resolveManeuverability(raw) {
        const lower = (raw ?? "").toLowerCase();
        if (lower.includes("perfect"))
            return "perfect";
        if (lower.includes("good"))
            return "good";
        if (lower.includes("average"))
            return "average";
        if (lower.includes("poor"))
            return "poor";
        if (lower.includes("clumsy"))
            return "clumsy";
        return "average";
    }
}

/**
 * Hazard Converter — Milestone 3
 *
 * Converts a ContentRecord with category "hazard" into a Foundry SFRPG
 * hazard Actor document. Hazards include traps, environmental hazards,
 * and haunts. They are represented as Actors in SFRPG.
 */
class HazardConverter extends ConverterBase {
    category = "hazard";
    documentType = "Actor";
    sfrpgType = "hazard";
    packSuffix = "sftpl-hazards";
    buildSystemData(record) {
        return {
            details: {
                source: `${record.sourceBook} pg. ${record.pageNumber}`,
                type: this.resolveHazardType(this.str(record, "type") || this.str(record, "hazardType")),
                cr: this.parseCR(this.str(record, "cr") || this.str(record, "challengeRating", "1")),
                xp: {
                    value: this.num(record, "xp", 400),
                },
                biography: { value: this.str(record, "description") },
                reset: this.str(record, "reset", ""),
                disarm: this.str(record, "disarm", ""),
                trigger: this.str(record, "trigger", ""),
                effect: this.str(record, "effect", ""),
            },
            attributes: {
                hp: {
                    value: this.num(record, "hp", 0),
                    max: this.num(record, "hp", 0),
                    min: 0,
                },
                hardness: this.num(record, "hardness", 0),
                noticePerception: this.num(record, "noticePerception") || this.num(record, "noticedc", 20),
                disableEngineering: this.num(record, "disableEngineering") || this.num(record, "disabledc", 20),
                senses: this.str(record, "senses", ""),
            },
            saves: {
                fort: {
                    value: this.num(record, "fort", 0),
                },
                reflex: {
                    value: this.num(record, "ref", 0),
                },
                will: {
                    value: this.num(record, "will", 0),
                },
            },
        };
    }
    parseCR(raw) {
        if (raw.includes("/")) {
            const [num, den] = raw.split("/").map(Number);
            return num / den;
        }
        return Number(raw) || 1;
    }
    resolveHazardType(raw) {
        const lower = raw.toLowerCase();
        if (lower.includes("trap"))
            return "trap";
        if (lower.includes("haunt"))
            return "haunt";
        if (lower.includes("environ"))
            return "environmental";
        return "trap";
    }
}

/**
 * Actor Converters Index — Milestone 3
 *
 * Exports all SFRPG actor category converters and provides a convenience
 * factory function that returns a pre-constructed array for bulk registration.
 */
/**
 * Returns an array of all actor converter instances.
 * Use this to bulk-register actor converters with the ConverterRegistry.
 */
function createActorConverters() {
    return [
        new NpcConverter(),
        new VehicleConverter(),
        new StarshipConverter(),
        new HazardConverter(),
    ];
}

/**
 * Journal Converter — Milestone 3
 *
 * Converts a ContentRecord with category "journal" into a Foundry V13
 * JournalEntry document with a single HTML text page.
 *
 * Supports four sub-types via the `journalType` rawContent field:
 *   - "lore"       : general world lore and setting content
 *   - "rules"      : game-rule reference text
 *   - "pdf"        : a page with a PDF reference link
 *   - "sourcebook" : structured source-book entry (default)
 */
const MODULE_ID$6 = "starfinder-thirdparty";
class JournalConverter {
    category = "journal";
    documentType = "JournalEntry";
    sfrpgType = "journalEntry";
    packSuffix = "sftpl-journals";
    get packId() {
        return `${MODULE_ID$6}.${this.packSuffix}`;
    }
    convert(record) {
        const warnings = [];
        try {
            const journalType = String(record.rawContent["journalType"] ?? "sourcebook");
            const content = this.buildPageContent(record, journalType);
            const pageName = this.resolvePageName(record, journalType);
            const documentData = {
                name: record.name,
                pages: [
                    {
                        name: pageName,
                        type: "text",
                        text: { content, format: 1 },
                    },
                ],
                flags: buildFlags(record),
            };
            if (!record.sourceBook)
                warnings.push("Missing source book.");
            if (!record.publisher)
                warnings.push("Missing publisher.");
            return {
                success: true,
                documentData,
                documentType: "JournalEntry",
                packId: this.packId,
                warnings,
                errors: [],
                recordName: record.name,
                recordId: record.id,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            ModuleLogger.error(`[JournalConverter] Failed to convert "${record.name}": ${message}`);
            return {
                success: false,
                documentData: null,
                documentType: "JournalEntry",
                packId: this.packId,
                warnings,
                errors: [message],
                recordName: record.name,
                recordId: record.id,
            };
        }
    }
    buildPageContent(record, journalType) {
        const rawContent = record.rawContent;
        const description = String(rawContent["description"] ?? "");
        const source = `${record.sourceBook} pg. ${record.pageNumber}`;
        switch (journalType) {
            case "pdf": {
                const pdfUrl = String(rawContent["pdfUrl"] ?? "");
                return [
                    `<h2>${record.name}</h2>`,
                    `<p><em>Source: ${source}</em></p>`,
                    pdfUrl ? `<p><a href="${pdfUrl}" target="_blank">Open PDF</a></p>` : "",
                    description ? `<p>${description}</p>` : "",
                ].filter(Boolean).join("\n");
            }
            case "rules": {
                const ruleText = String(rawContent["ruleText"] ?? description);
                return [
                    `<h2>${record.name}</h2>`,
                    `<p><em>Source: ${source}</em></p>`,
                    `<div class="rule-text">${ruleText}</div>`,
                ].join("\n");
            }
            case "lore": {
                const loreText = String(rawContent["loreText"] ?? description);
                return [
                    `<h2>${record.name}</h2>`,
                    `<p><em>Source: ${source}</em></p>`,
                    `<p>${loreText}</p>`,
                    record.tags.length > 0 ? `<p><strong>Tags:</strong> ${record.tags.join(", ")}</p>` : "",
                ].filter(Boolean).join("\n");
            }
            default: {
                const parts = [
                    `<h2>${record.name}</h2>`,
                    `<p><em>Source: ${source}</em></p>`,
                    `<p><strong>Publisher:</strong> ${record.publisher}</p>`,
                    record.author ? `<p><strong>Author:</strong> ${record.author}</p>` : "",
                    description ? `<hr/><p>${description}</p>` : "",
                    record.notes ? `<hr/><p><strong>GM Notes:</strong> ${record.notes}</p>` : "",
                ];
                return parts.filter(Boolean).join("\n");
            }
        }
    }
    resolvePageName(_record, journalType) {
        const typeLabels = {
            pdf: "PDF Reference",
            rules: "Rules Reference",
            lore: "Lore",
            sourcebook: "Entry",
        };
        return typeLabels[journalType] ?? "Entry";
    }
}

/**
 * Converter Registry — Milestone 3
 *
 * Central registry that maps every ContentCategory to the converter
 * responsible for producing the corresponding Foundry document.
 *
 * Usage:
 *   const registry = ConverterRegistry.build();
 *   const converter = registry.get("weapon");
 *   const result = converter.convert(record);
 */
class ConverterRegistry {
    registry = new Map();
    constructor() { }
    /**
     * Builds and returns a ConverterRegistry pre-populated with all
     * Starfinder 1E converters (items, actors, and journals).
     */
    static build() {
        const instance = new ConverterRegistry();
        for (const converter of createItemConverters()) {
            instance.register(converter);
        }
        for (const converter of createActorConverters()) {
            instance.register(converter);
        }
        const journalConverter = new JournalConverter();
        instance.registry.set(journalConverter.category, journalConverter);
        ModuleLogger.info(`[ConverterRegistry] Registered ${instance.registry.size} converters: ` +
            [...instance.registry.keys()].join(", "));
        return instance;
    }
    /**
     * Registers a converter instance. Overwrites any existing converter for
     * the same category (allows runtime overrides for testing or modding).
     */
    register(converter) {
        if (this.registry.has(converter.category)) {
            ModuleLogger.warn(`[ConverterRegistry] Overwriting existing converter for category: ${converter.category}`);
        }
        this.registry.set(converter.category, converter);
    }
    /**
     * Returns the converter for the given category, or undefined if not registered.
     */
    get(category) {
        return this.registry.get(category);
    }
    /**
     * Returns true if a converter is registered for the given category.
     */
    has(category) {
        return this.registry.has(category);
    }
    /**
     * Returns the list of all registered categories.
     */
    getRegisteredCategories() {
        return [...this.registry.keys()];
    }
    /**
     * Returns all registered converters as an array.
     */
    getAll() {
        return [...this.registry.values()];
    }
}

/**
 * Pipeline Report Types — Milestone 3
 *
 * Defines the data structures produced by the ConversionPipeline after
 * converting a batch of ContentRecords into Foundry documents.
 *
 * Every run produces a PipelineReport which can be displayed in the
 * ConversionReportApp UI and exported as JSON.
 */
// ── Report builder helpers ────────────────────────────────────────────────────
/** Creates a new, empty PipelineReport with runId + startedAt pre-populated. */
function createReport() {
    const startMs = Date.now();
    return {
        runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        startedAt: new Date(startMs).toISOString(),
        finishedAt: "",
        stats: { total: 0, imported: 0, updated: 0, skipped: 0, failed: 0, elapsedMs: 0 },
        results: [],
        _startMs: startMs,
    };
}
/** Finalizes the report, setting finishedAt and elapsedMs. */
function finalizeReport(report) {
    const endMs = Date.now();
    report.finishedAt = new Date(endMs).toISOString();
    report.stats.elapsedMs = endMs - report._startMs;
    const { _startMs: _unused, ...clean } = report;
    return clean;
}
/** Adds a record result to the report and increments the relevant stat counter. */
function addResult(report, result) {
    report.results.push(result);
    report.stats.total++;
    switch (result.disposition) {
        case "imported":
            report.stats.imported++;
            break;
        case "updated":
            report.stats.updated++;
            break;
        case "skipped":
            report.stats.skipped++;
            break;
        case "failed":
            report.stats.failed++;
            break;
    }
}
/** Serializes a PipelineReport to a formatted JSON string for export. */
function reportToJson(report) {
    return JSON.stringify(report, null, 2);
}

/**
 * Conversion Pipeline — Milestone 3
 *
 * Orchestrates the full conversion flow:
 *
 *   ContentRecord (database)
 *     → ConverterRegistry (category-specific converter)
 *     → ConversionResult (Foundry document data)
 *     → Compendium Pack (Item.create / Actor.create / JournalEntry.create)
 *     → PipelineRecordResult
 *
 * Designed for batch processing with real-time progress callbacks so the
 * UI can display a live progress indicator during large imports.
 *
 * Compendium packs are created on-demand if they do not already exist.
 * Duplicate detection: if a document with the same name already exists in
 * the target pack, it is updated (overwrite) rather than creating a duplicate.
 */
// ── Pipeline class ────────────────────────────────────────────────────────────
class ConversionPipeline {
    registry;
    constructor(registry) {
        this.registry = registry ?? ConverterRegistry.build();
    }
    /**
     * Runs the conversion pipeline for the given options.
     * Returns a PipelineReport summarising every record's outcome.
     */
    async run(options = {}) {
        const { recordIds, categories, overwriteExisting = true, onProgress } = options;
        const allRecords = ContentDatabase.getAll();
        let records = allRecords;
        if (recordIds && recordIds.length > 0) {
            const idSet = new Set(recordIds);
            records = records.filter((r) => idSet.has(r.id));
        }
        if (categories && categories.length > 0) {
            const catSet = new Set(categories);
            records = records.filter((r) => catSet.has(r.category));
        }
        const report = createReport();
        const total = records.length;
        ModuleLogger.info(`[ConversionPipeline] Starting run: ${total} record(s) to convert.`);
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            onProgress?.({ processed: i, total, currentRecord: record.name });
            const result = await this.processRecord(record, overwriteExisting);
            addResult(report, result);
        }
        onProgress?.({ processed: total, total, currentRecord: "" });
        const finalReport = finalizeReport(report);
        ModuleLogger.info(`[ConversionPipeline] Run complete. ` +
            `Imported: ${finalReport.stats.imported}, Updated: ${finalReport.stats.updated}, ` +
            `Skipped: ${finalReport.stats.skipped}, Failed: ${finalReport.stats.failed}`);
        return finalReport;
    }
    // ── Private: per-record processing ─────────────────────────────────────────
    async processRecord(record, overwrite) {
        const base = {
            recordId: record.id,
            recordName: record.name,
            category: record.category,
            packId: "",
            processedAt: new Date().toISOString(),
        };
        const converter = this.registry.get(record.category);
        if (!converter) {
            return {
                ...base,
                disposition: "skipped",
                documentName: "",
                warnings: [],
                errors: [`No converter registered for category "${record.category}".`],
            };
        }
        let convResult;
        try {
            convResult = converter.convert(record);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                ...base,
                packId: "",
                disposition: "failed",
                documentName: "",
                warnings: [],
                errors: [`Converter threw an exception: ${msg}`],
            };
        }
        if (!convResult.success || !convResult.documentData) {
            return {
                ...base,
                packId: convResult.packId,
                disposition: "failed",
                documentName: "",
                warnings: convResult.warnings,
                errors: convResult.errors,
            };
        }
        try {
            const { documentName, disposition } = await this.writeToCompendium(convResult, overwrite);
            return {
                ...base,
                packId: convResult.packId,
                disposition,
                documentName,
                warnings: convResult.warnings,
                errors: [],
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                ...base,
                packId: convResult.packId,
                disposition: "failed",
                documentName: "",
                warnings: convResult.warnings,
                errors: [`Compendium write failed: ${msg}`],
            };
        }
    }
    // ── Private: compendium write ─────────────────────────────────────────────
    async writeToCompendium(result, overwrite) {
        const pack = await this.getOrCreatePack(result.packId, result.documentType);
        if (!pack) {
            throw new Error(`Could not open or create compendium pack "${result.packId}".`);
        }
        const name = result.documentData.name;
        const existing = pack.index.find((e) => e.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            if (!overwrite) {
                return { documentName: name, disposition: "skipped" };
            }
            const doc = await pack.getDocument(existing._id);
            if (doc) {
                await doc.update(result.documentData);
                return { documentName: name, disposition: "updated" };
            }
        }
        await this.createDocument(result, pack);
        return { documentName: name, disposition: "imported" };
    }
    async createDocument(result, pack) {
        const opts = { pack: pack.collection };
        switch (result.documentType) {
            case "Item":
                await Item.create(result.documentData, opts);
                break;
            case "Actor":
                await Actor.create(result.documentData, opts);
                break;
            case "JournalEntry":
                await JournalEntry.create(result.documentData, opts);
                break;
            default:
                throw new Error(`Unknown document type: ${String(result.documentType)}`);
        }
    }
    async getOrCreatePack(packId, documentType) {
        let pack = game.packs.get(packId);
        if (!pack) {
            ModuleLogger.info(`[ConversionPipeline] Creating compendium pack: ${packId}`);
            const [moduleId, packName] = packId.split(".");
            try {
                pack = await CompendiumCollection.createCompendium({
                    name: packName,
                    label: packName
                        .replace(/sftpl-/, "")
                        .split("-")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" "),
                    type: documentType,
                    package: moduleId,
                    system: "sfrpg",
                });
            }
            catch (err) {
                ModuleLogger.error(`[ConversionPipeline] Failed to create pack ${packId}: ${String(err)}`);
                return null;
            }
        }
        await pack.getIndex();
        return pack;
    }
}

/**
 * Content Browser Application — Milestone 2
 *
 * A Foundry V13 ApplicationV2 window that provides a searchable,
 * filterable, and sortable browser over the SF3PL ContentDatabase.
 *
 * Features:
 *   - Full-text search across name, publisher, sourceBook, tags
 *   - Category / publisher / sourceBook filter sidebars
 *   - Sortable column headers (name, category, publisher, sourceBook, level)
 *   - Detail panel showing all fields of a selected record
 *   - Inline notes/tags editing
 *   - Delete confirmation dialog
 *   - JSON and CSV export for selected or all records
 */
const { ApplicationV2: ApplicationV2$7, HandlebarsApplicationMixin: HandlebarsApplicationMixin$7 } = foundry.applications.api;
// ── Icons per category ────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
    weapon: "fa-sword",
    armor: "fa-shield-halved",
    equipment: "fa-toolbox",
    augmentation: "fa-microchip",
    feat: "fa-star",
    spell: "fa-wand-sparkles",
    race: "fa-person",
    theme: "fa-masks-theater",
    class: "fa-graduation-cap",
    archetypeFeature: "fa-puzzle-piece",
    vehicle: "fa-car",
    starship: "fa-rocket",
    npc: "fa-user-secret",
    hazard: "fa-triangle-exclamation",
    journal: "fa-book-open",
};
// ── ApplicationV2 class ──────────────────────────────────────────────────────
class ContentBrowserApp extends HandlebarsApplicationMixin$7(ApplicationV2$7) {
    static DEFAULT_OPTIONS = {
        id: "sf3pl-content-browser",
        title: "SF3PL: Content Browser",
        classes: ["sf3pl-app", "sf3pl-content-browser"],
        window: { resizable: true },
        position: { width: 960, height: 680 },
    };
    static PARTS = {
        main: { template: "modules/starfinder-thirdparty/templates/content-browser.hbs" },
    };
    state = {
        loaded: false,
        allRecords: [],
        filter: {},
        sort: { field: "name", ascending: true },
        selectedId: null,
        selectedIds: new Set(),
        editingNotes: false,
        notesBuffer: "",
        tagsBuffer: "",
    };
    // ── Context preparation ───────────────────────────────────────────────────
    async _prepareContext(_options) {
        if (!this.state.loaded) {
            await this.loadRecords();
        }
        const { allRecords, filter, sort, selectedId } = this.state;
        // Apply filter + sort from database
        const filtered = ContentDatabase.query(filter, sort);
        const selected = selectedId ? ContentDatabase.get(selectedId) ?? null : null;
        // Unique values for filter dropdowns
        const publishers = ContentDatabase.getUniqueValues("publisher");
        const sourceBooks = ContentDatabase.getUniqueValues("sourceBook");
        const allTags = ContentDatabase.getUniqueValues("tags");
        // Category filter options with counts
        const categoryCounts = new Map();
        for (const rec of allRecords) {
            categoryCounts.set(rec.category, (categoryCounts.get(rec.category) ?? 0) + 1);
        }
        const categoryFilterOptions = CONTENT_CATEGORIES.map((c) => ({
            value: c,
            label: CATEGORY_LABELS[c],
            count: categoryCounts.get(c) ?? 0,
            active: (filter.categories ?? []).includes(c),
        })).filter((opt) => opt.count > 0);
        // Table rows
        const rows = filtered.map((rec) => ({
            id: rec.id,
            name: rec.name,
            category: rec.category,
            categoryLabel: CATEGORY_LABELS[rec.category] ?? rec.category,
            categoryIcon: CATEGORY_ICONS[rec.category] ?? "fa-box",
            sourceBook: rec.sourceBook || "—",
            publisher: rec.publisher || "—",
            level: String(rec.rawContent["level"] ?? "—"),
            tags: rec.tags.slice(0, 3).join(", "),
            isSelected: rec.id === selectedId,
            isChecked: this.state.selectedIds.has(rec.id),
            importedDate: new Date(rec.importedDate).toLocaleDateString(),
        }));
        // Detail panel for the selected record
        let detailPanel = null;
        if (selected) {
            detailPanel = {
                id: selected.id,
                name: selected.name,
                category: selected.category,
                categoryLabel: CATEGORY_LABELS[selected.category],
                categoryIcon: CATEGORY_ICONS[selected.category] ?? "fa-box",
                sourceBook: selected.sourceBook || "—",
                publisher: selected.publisher || "—",
                author: selected.author || "—",
                pageNumber: selected.pageNumber > 0 ? selected.pageNumber : "—",
                tags: selected.tags.join(", ") || "—",
                notes: selected.notes || "",
                importedDate: new Date(selected.importedDate).toLocaleDateString(),
                importMethod: selected.importMethod,
                rawContentJson: JSON.stringify(selected.rawContent, null, 2),
                editingNotes: this.state.editingNotes,
                notesBuffer: this.state.notesBuffer,
                tagsBuffer: this.state.tagsBuffer,
            };
        }
        const checkedCount = this.state.selectedIds.size;
        return {
            loaded: this.state.loaded,
            totalCount: allRecords.length,
            filteredCount: filtered.length,
            rows,
            filter: {
                searchText: filter.searchText ?? "",
                publisher: (filter.publishers ?? [])[0] ?? "",
                sourceBook: (filter.sourceBooks ?? [])[0] ?? "",
                tag: (filter.tags ?? [])[0] ?? "",
            },
            sort: {
                field: sort.field,
                ascending: sort.ascending,
                isAscName: sort.field === "name" && sort.ascending,
                isDescName: sort.field === "name" && !sort.ascending,
            },
            categoryFilterOptions,
            publisherOptions: publishers.map((p) => ({ value: p, label: p })),
            sourceBookOptions: sourceBooks.map((s) => ({ value: s, label: s })),
            tagOptions: allTags.map((t) => ({ value: t, label: t })),
            detailPanel,
            hasSelection: selectedId !== null,
            checkedCount,
            hasChecked: checkedCount > 0,
            isEmpty: allRecords.length === 0,
        };
    }
    // ── Render binding ────────────────────────────────────────────────────────
    _onRender(_context, _options) {
        const el = this.element;
        if (!el)
            return;
        // --- Search ---
        el.querySelector("#sf3pl-search")?.addEventListener("input", (e) => {
            this.state.filter.searchText = e.target.value;
            void this.render(true);
        });
        // --- Category checkboxes ---
        el.querySelectorAll(".sf3pl-category-filter").forEach((cb) => {
            cb.addEventListener("change", () => {
                const checked = Array.from(el.querySelectorAll(".sf3pl-category-filter:checked"))
                    .map((c) => c.value);
                this.state.filter.categories = checked.length > 0 ? checked : undefined;
                void this.render(true);
            });
        });
        // --- Publisher / SourceBook / Tag filter selects ---
        el.querySelector("#sf3pl-filter-publisher")?.addEventListener("change", (e) => {
            const v = e.target.value;
            this.state.filter.publishers = v ? [v] : undefined;
            void this.render(true);
        });
        el.querySelector("#sf3pl-filter-sourcebook")?.addEventListener("change", (e) => {
            const v = e.target.value;
            this.state.filter.sourceBooks = v ? [v] : undefined;
            void this.render(true);
        });
        el.querySelector("#sf3pl-filter-tag")?.addEventListener("change", (e) => {
            const v = e.target.value;
            this.state.filter.tags = v ? [v] : undefined;
            void this.render(true);
        });
        // --- Clear filters ---
        el.querySelector("#sf3pl-btn-clear-filter")?.addEventListener("click", () => {
            this.state.filter = {};
            void this.render(true);
        });
        // --- Sort headers ---
        el.querySelectorAll("[data-sort]").forEach((header) => {
            header.addEventListener("click", () => {
                const field = header.dataset["sort"];
                if (this.state.sort.field === field) {
                    this.state.sort.ascending = !this.state.sort.ascending;
                }
                else {
                    this.state.sort = { field, ascending: true };
                }
                void this.render(true);
            });
        });
        // --- Row click → select record ---
        el.querySelectorAll(".sf3pl-row[data-id]").forEach((row) => {
            row.addEventListener("click", (evt) => {
                if (evt.target.matches("input[type='checkbox']"))
                    return;
                const id = row.dataset["id"] ?? null;
                if (this.state.selectedId === id) {
                    this.state.selectedId = null;
                }
                else {
                    this.state.selectedId = id;
                    this.state.editingNotes = false;
                }
                void this.render(true);
            });
        });
        // --- Row checkboxes (bulk select) ---
        el.querySelectorAll(".sf3pl-row-check").forEach((cb) => {
            cb.addEventListener("change", () => {
                const id = cb.dataset["id"] ?? "";
                if (cb.checked) {
                    this.state.selectedIds.add(id);
                }
                else {
                    this.state.selectedIds.delete(id);
                }
                void this.render(true);
            });
        });
        // --- Select all ---
        el.querySelector("#sf3pl-select-all")?.addEventListener("change", (e) => {
            const checked = e.target.checked;
            const filtered = ContentDatabase.query(this.state.filter, this.state.sort);
            if (checked) {
                filtered.forEach((r) => this.state.selectedIds.add(r.id));
            }
            else {
                filtered.forEach((r) => this.state.selectedIds.delete(r.id));
            }
            void this.render(true);
        });
        // --- Refresh ---
        el.querySelector("#sf3pl-btn-refresh")?.addEventListener("click", () => {
            this.state.loaded = false;
            void this.render(true);
        });
        // --- Export buttons ---
        el.querySelector("#sf3pl-btn-export-json")?.addEventListener("click", () => {
            this.exportJson();
        });
        el.querySelector("#sf3pl-btn-export-csv")?.addEventListener("click", () => {
            this.exportCsv();
        });
        // --- Detail panel actions ---
        el.querySelector("#sf3pl-btn-delete")?.addEventListener("click", () => {
            void this.deleteSelected();
        });
        el.querySelector("#sf3pl-btn-edit-notes")?.addEventListener("click", () => {
            if (this.state.selectedId) {
                const rec = ContentDatabase.get(this.state.selectedId);
                if (rec) {
                    this.state.editingNotes = true;
                    this.state.notesBuffer = rec.notes;
                    this.state.tagsBuffer = rec.tags.join(", ");
                    void this.render(true);
                }
            }
        });
        el.querySelector("#sf3pl-btn-save-notes")?.addEventListener("click", () => {
            void this.saveNotes();
        });
        el.querySelector("#sf3pl-btn-cancel-notes")?.addEventListener("click", () => {
            this.state.editingNotes = false;
            void this.render(true);
        });
        // Sync notes/tags buffers as user types
        el.querySelector("#sf3pl-notes-editor")?.addEventListener("input", (e) => {
            this.state.notesBuffer = e.target.value;
        });
        el.querySelector("#sf3pl-tags-editor")?.addEventListener("input", (e) => {
            this.state.tagsBuffer = e.target.value;
        });
        // --- Bulk delete ---
        el.querySelector("#sf3pl-btn-bulk-delete")?.addEventListener("click", () => {
            void this.bulkDelete();
        });
        // --- Download raw content of selected ---
        el.querySelector("#sf3pl-btn-download-raw")?.addEventListener("click", () => {
            if (!this.state.selectedId)
                return;
            const rec = ContentDatabase.get(this.state.selectedId);
            if (rec)
                ContentExporter.downloadRawContent(rec);
        });
        // --- M3: Convert Selected ---
        el.querySelector("#sf3pl-btn-convert-selected")?.addEventListener("click", () => {
            void this.convertSelected();
        });
        // --- M3: Convert Category (category of the currently selected row) ---
        el.querySelector("#sf3pl-btn-convert-category")?.addEventListener("click", () => {
            void this.convertCurrentCategory();
        });
        // --- M3: Build Compendium (all records in current filter set) ---
        el.querySelector("#sf3pl-btn-build-compendium")?.addEventListener("click", () => {
            void this.buildCompendium();
        });
        // --- M3: Rebuild Compendium (all records, force overwrite) ---
        el.querySelector("#sf3pl-btn-rebuild-compendium")?.addEventListener("click", () => {
            void this.buildCompendium(true);
        });
    }
    // ── Private operations ────────────────────────────────────────────────────
    async loadRecords() {
        try {
            this.state.allRecords = ContentDatabase.getAll();
            this.state.loaded = true;
            ModuleLogger.info(`[ContentBrowser] Loaded ${this.state.allRecords.length} record(s).`);
        }
        catch (err) {
            ModuleLogger.error(`[ContentBrowser] Load failed: ${String(err)}`);
            this.state.allRecords = [];
            this.state.loaded = true;
        }
    }
    exportJson() {
        const ids = [...this.state.selectedIds];
        const records = ids.length > 0
            ? this.state.allRecords.filter((r) => ids.includes(r.id))
            : ContentDatabase.query(this.state.filter, this.state.sort);
        ContentExporter.downloadJson(records, `sf3pl-export-${ids.length > 0 ? `${ids.length}-records` : "filtered"}.json`);
        ModuleLogger.info(`[ContentBrowser] Exported ${records.length} record(s) as JSON.`);
    }
    exportCsv() {
        const ids = [...this.state.selectedIds];
        const records = ids.length > 0
            ? this.state.allRecords.filter((r) => ids.includes(r.id))
            : ContentDatabase.query(this.state.filter, this.state.sort);
        ContentExporter.downloadCsv(records, `sf3pl-export-${ids.length > 0 ? `${ids.length}-records` : "filtered"}.csv`);
        ModuleLogger.info(`[ContentBrowser] Exported ${records.length} record(s) as CSV.`);
    }
    async deleteSelected() {
        if (!this.state.selectedId)
            return;
        const rec = ContentDatabase.get(this.state.selectedId);
        if (!rec)
            return;
        const confirmed = await Dialog.confirm({
            title: "Delete Record",
            content: `<p>Delete "<strong>${rec.name}</strong>" from the database? This cannot be undone.</p>`,
        });
        if (!confirmed)
            return;
        await ContentDatabase.delete(this.state.selectedId);
        this.state.selectedId = null;
        this.state.allRecords = ContentDatabase.getAll();
        ui.notifications.info(`Deleted "${rec.name}".`);
        await this.render(true);
    }
    async bulkDelete() {
        const ids = [...this.state.selectedIds];
        if (ids.length === 0)
            return;
        const confirmed = await Dialog.confirm({
            title: "Bulk Delete",
            content: `<p>Delete <strong>${ids.length}</strong> selected record(s)? This cannot be undone.</p>`,
        });
        if (!confirmed)
            return;
        for (const id of ids) {
            await ContentDatabase.delete(id);
        }
        this.state.selectedIds.clear();
        if (this.state.selectedId && ids.includes(this.state.selectedId)) {
            this.state.selectedId = null;
        }
        this.state.allRecords = ContentDatabase.getAll();
        ui.notifications.info(`Deleted ${ids.length} record(s).`);
        await this.render(true);
    }
    async saveNotes() {
        if (!this.state.selectedId)
            return;
        const tags = this.state.tagsBuffer
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        await ContentDatabase.updateNotesAndTags(this.state.selectedId, this.state.notesBuffer, tags);
        this.state.editingNotes = false;
        this.state.allRecords = ContentDatabase.getAll();
        ui.notifications.info("Notes and tags saved.");
        await this.render(true);
    }
    // ── M3: Conversion operations ─────────────────────────────────────────────
    async convertSelected() {
        const ids = [...this.state.selectedIds];
        if (ids.length === 0) {
            ui.notifications.warn("No records selected. Use the checkboxes to select records first.");
            return;
        }
        ui.notifications.info(`Converting ${ids.length} selected record(s)…`);
        const pipeline = new ConversionPipeline();
        const report = await pipeline.run({ recordIds: ids });
        this.openConversionReport(report);
    }
    async convertCurrentCategory() {
        if (!this.state.selectedId) {
            ui.notifications.warn("Select a record first to determine the category to convert.");
            return;
        }
        const rec = ContentDatabase.get(this.state.selectedId);
        if (!rec)
            return;
        ui.notifications.info(`Converting all "${CATEGORY_LABELS[rec.category]}" records…`);
        const pipeline = new ConversionPipeline();
        const report = await pipeline.run({ categories: [rec.category] });
        this.openConversionReport(report);
    }
    async buildCompendium(forceRebuild = false) {
        const records = ContentDatabase.query(this.state.filter, this.state.sort);
        if (records.length === 0) {
            ui.notifications.warn("No records to convert. Import content first.");
            return;
        }
        const label = forceRebuild ? "Rebuilding" : "Building";
        ui.notifications.info(`${label} compendium for ${records.length} record(s)…`);
        const pipeline = new ConversionPipeline();
        const report = await pipeline.run({
            recordIds: records.map((r) => r.id),
            overwriteExisting: forceRebuild || true,
        });
        this.openConversionReport(report);
    }
    openConversionReport(report) {
        Promise.resolve().then(function () { return conversionReport; })
            .then(({ ConversionReportApp }) => {
            void new ConversionReportApp(report).render(true);
        })
            .catch((err) => {
            ModuleLogger.error(`[ContentBrowser] Could not open ConversionReportApp: ${String(err)}`);
        });
    }
}

/**
 * Schema Types — Milestone 4
 *
 * Shared type definitions for the Schema Discovery, Registry, and Mapping
 * systems. All other schema modules import from this file.
 *
 * Design:
 *   A DiscoveredSchema captures every field path discovered in a live Foundry
 *   document type at a specific point in time. Schemas are versioned via a
 *   content hash so changes can be detected automatically.
 */
// ── Schema key ────────────────────────────────────────────────────────────────
/** Canonical key used to look up a schema in the registry. */
function makeSchemaKey(documentType, subtype) {
    return `${documentType}.${subtype}`;
}
// ── Hash helper ───────────────────────────────────────────────────────────────
/**
 * Produces a short, stable hash string from a sorted list of field paths.
 * Used to detect schema changes between module loads.
 *
 * Uses a simple djb2-style hash — sufficient for change detection, not
 * intended to be cryptographically secure.
 */
function hashFieldPaths(paths) {
    const sorted = [...paths].sort().join("|");
    let hash = 5381;
    for (let i = 0; i < sorted.length; i++) {
        hash = ((hash << 5) + hash) ^ sorted.charCodeAt(i);
        hash = hash >>> 0; // keep unsigned 32-bit
    }
    return hash.toString(16).padStart(8, "0");
}

/**
 * Schema Discovery Engine — Milestone 4
 *
 * Inspects the live Foundry game system to extract document field schemas.
 * Uses three strategies in descending order of authority:
 *
 *   1. DataModel inspection  — Foundry V10+ DataModel classes expose a
 *      `schema` property (SchemaField) with full field definitions.
 *
 *   2. System model (legacy) — `game.system.model.Item[subtype]` holds
 *      template.json data (SFRPG and many older systems use this approach).
 *
 *   3. Document inspection   — Examine actual document instances from
 *      `game.items`, `game.actors`, or a compendium pack.
 *
 * All strategies produce a DiscoveredSchema with full field paths, inferred
 * types, and where possible required/default information.
 */
// ── Internal helpers ──────────────────────────────────────────────────────────
/** Maps a JavaScript value to a FieldDataType string. */
function inferType(value) {
    if (value === null)
        return "null";
    if (Array.isArray(value))
        return "array";
    switch (typeof value) {
        case "string": return "string";
        case "number": return "number";
        case "boolean": return "boolean";
        case "object": return "object";
        default: return "unknown";
    }
}
/**
 * Recursively extracts flat field descriptors from an arbitrary object.
 * Arrays are treated as typed containers — we inspect element 0 when present.
 *
 * @param obj        The object (system data or nested sub-object).
 * @param prefix     Dot-path prefix accumulated during recursion.
 * @param maxDepth   Stop recursing beyond this depth to avoid blowup.
 */
function extractFieldsFromObject(obj, prefix = "", maxDepth = 6) {
    if (maxDepth <= 0 || typeof obj !== "object" || obj === null)
        return [];
    const fields = [];
    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        const type = inferType(value);
        const field = {
            path,
            type,
            required: false,
            nullable: value === null,
            defaultValue: value,
        };
        if (type === "object" && value !== null) {
            field.children = extractFieldsFromObject(value, path, maxDepth - 1);
            fields.push(field, ...field.children);
        }
        else if (type === "array" && Array.isArray(value) && value.length > 0) {
            const element = value[0];
            if (typeof element === "object" && element !== null && !Array.isArray(element)) {
                field.children = extractFieldsFromObject(element, `${path}[0]`, maxDepth - 1);
                fields.push(field, ...field.children);
            }
            else {
                fields.push(field);
            }
        }
        else {
            fields.push(field);
        }
    }
    return fields;
}
/**
 * Attempts to extract fields from a Foundry V10+ DataModel schema.
 * Returns null if the DataModel pattern is not available.
 */
function extractFromDataModel(modelClass) {
    if (!modelClass || typeof modelClass !== "function")
        return null;
    try {
        const cls = modelClass;
        if (!cls.schema || !cls.schema.fields)
            return null;
        const fields = [];
        processDataModelFields(cls.schema.fields, "", fields);
        return fields.length > 0 ? fields : null;
    }
    catch {
        return null;
    }
}
/** Recurses into a SchemaField.fields map to produce DiscoveredField list. */
function processDataModelFields(fieldMap, prefix, out) {
    for (const [key, fieldDef] of Object.entries(fieldMap)) {
        const path = prefix ? `${prefix}.${key}` : key;
        const fd = fieldDef;
        const type = inferDataModelType(fd);
        const required = Boolean(fd["required"]);
        const nullable = Boolean(fd["nullable"]);
        const defaultValue = fd["initial"] ?? fd["default"] ?? null;
        const label = typeof fd["label"] === "string" ? fd["label"] : undefined;
        const choices = extractChoices(fd);
        const field = { path, type, required, nullable, defaultValue, label, choices };
        out.push(field);
        // Recurse into SchemaField children
        if (fd["fields"] && typeof fd["fields"] === "object") {
            processDataModelFields(fd["fields"], path, out);
        }
        // Recurse into ArrayField's element model
        if (fd["element"] && typeof fd["element"] === "object") {
            const elem = fd["element"];
            if (elem["fields"] && typeof elem["fields"] === "object") {
                processDataModelFields(elem["fields"], `${path}[0]`, out);
            }
        }
    }
}
function inferDataModelType(fd) {
    const constructor = fd.constructor?.name ?? "";
    if (constructor.includes("String"))
        return "string";
    if (constructor.includes("Number") || constructor.includes("Integer"))
        return "number";
    if (constructor.includes("Boolean"))
        return "boolean";
    if (constructor.includes("Array"))
        return "array";
    if (constructor.includes("Object") || constructor.includes("Schema"))
        return "object";
    return "unknown";
}
function extractChoices(fd) {
    const choices = fd["choices"];
    if (!choices)
        return undefined;
    if (Array.isArray(choices))
        return choices.map(String);
    if (typeof choices === "object" && choices !== null) {
        return Object.keys(choices);
    }
    return undefined;
}
// ── SchemaDiscovery class ─────────────────────────────────────────────────────
class SchemaDiscovery {
    /**
     * Discovers the schema for a single document subtype.
     * Tries strategies in order: DataModel → system.model → document inspection.
     *
     * @param documentType "Item" | "Actor" | "JournalEntry"
     * @param subtype      The SFRPG type string, e.g. "weapon", "npc2"
     */
    static discoverSchema(documentType, subtype) {
        ModuleLogger.debug(`[SchemaDiscovery] Discovering ${documentType}.${subtype}`);
        let fields = null;
        let source = "document-inspection";
        // Strategy 1: DataModel
        fields = this.tryDataModel(documentType, subtype);
        if (fields) {
            source = "datamodel";
            ModuleLogger.debug(`[SchemaDiscovery] ${documentType}.${subtype} → DataModel (${fields.length} fields)`);
        }
        // Strategy 2: game.system.model (legacy template.json)
        if (!fields) {
            fields = this.trySystemModel(documentType, subtype);
            if (fields) {
                source = "system-model";
                ModuleLogger.debug(`[SchemaDiscovery] ${documentType}.${subtype} → system.model (${fields.length} fields)`);
            }
        }
        // Strategy 3: Live document inspection
        if (!fields) {
            fields = this.tryDocumentInspection(documentType, subtype);
            if (fields) {
                source = "document-inspection";
                ModuleLogger.debug(`[SchemaDiscovery] ${documentType}.${subtype} → document inspection (${fields.length} fields)`);
            }
        }
        if (!fields || fields.length === 0) {
            ModuleLogger.warn(`[SchemaDiscovery] No schema found for ${documentType}.${subtype}`);
            return null;
        }
        const paths = fields.map((f) => f.path);
        return {
            systemId: game.system.id,
            documentType,
            subtype,
            fields,
            discoveredAt: new Date().toISOString(),
            schemaHash: hashFieldPaths(paths),
            source,
        };
    }
    /**
     * Discovers schemas for all registered subtypes of a document class.
     * Returns an array of schemas (skipping any that could not be discovered).
     */
    static discoverAll(documentType) {
        const subtypes = this.getRegisteredSubtypes(documentType);
        const results = [];
        for (const subtype of subtypes) {
            const schema = this.discoverSchema(documentType, subtype);
            if (schema)
                results.push(schema);
        }
        ModuleLogger.info(`[SchemaDiscovery] Discovered ${results.length}/${subtypes.length} ${documentType} schemas.`);
        return results;
    }
    /**
     * Builds a DiscoveredSchema from a user-provided template document.
     * Inspects the document's `.system` data directly.
     */
    static discoverFromTemplate(doc, documentType) {
        const fields = extractFieldsFromObject(doc.system);
        const paths = fields.map((f) => f.path);
        return {
            systemId: game.system.id,
            documentType,
            subtype: doc.type,
            fields,
            discoveredAt: new Date().toISOString(),
            schemaHash: hashFieldPaths(paths),
            source: "template",
            sourceDocumentUuid: doc.uuid,
        };
    }
    // ── Private strategies ────────────────────────────────────────────────────
    static tryDataModel(documentType, subtype) {
        try {
            const CONFIG = globalThis.CONFIG;
            if (!CONFIG)
                return null;
            const docConfig = CONFIG[documentType];
            if (!docConfig)
                return null;
            const systemDataModels = docConfig["systemDataModels"];
            if (!systemDataModels)
                return null;
            const modelClass = systemDataModels[subtype];
            return extractFromDataModel(modelClass);
        }
        catch (err) {
            ModuleLogger.debug(`[SchemaDiscovery] DataModel strategy failed for ${documentType}.${subtype}: ${String(err)}`);
            return null;
        }
    }
    static trySystemModel(documentType, subtype) {
        try {
            const g = game;
            const modelRoot = g.system.model;
            if (!modelRoot)
                return null;
            const typeModel = documentType === "Item" ? modelRoot.Item?.[subtype] :
                documentType === "Actor" ? modelRoot.Actor?.[subtype] : undefined;
            if (!typeModel)
                return null;
            return extractFieldsFromObject(typeModel);
        }
        catch (err) {
            ModuleLogger.debug(`[SchemaDiscovery] system.model strategy failed: ${String(err)}`);
            return null;
        }
    }
    static tryDocumentInspection(documentType, subtype) {
        try {
            const g = game;
            const collection = documentType === "Item" ? g.items :
                documentType === "Actor" ? g.actors : null;
            if (collection) {
                const doc = collection.find((d) => d.type === subtype);
                if (doc?.system && Object.keys(doc.system).length > 0) {
                    return extractFieldsFromObject(doc.system);
                }
            }
            return null;
        }
        catch (err) {
            ModuleLogger.debug(`[SchemaDiscovery] Document inspection failed: ${String(err)}`);
            return null;
        }
    }
    /** Returns all registered subtypes for a document class. */
    static getRegisteredSubtypes(documentType) {
        try {
            const g = game;
            const types = g.system.documentTypes?.[documentType] ?? [];
            return types.filter((t) => t !== "base");
        }
        catch {
            return [];
        }
    }
}

/**
 * Schema Cache — Milestone 4
 *
 * Persists discovered schemas to Foundry's settings API so they survive
 * page reloads. Maintains an in-memory cache for fast synchronous access.
 *
 * The cache is keyed by "documentType.subtype" (e.g. "Item.weapon").
 * Change detection uses the `schemaHash` field — if the hash differs from
 * the previously stored value, the schema is considered updated.
 *
 * Storage key: game.settings → "starfinder-thirdparty" → "schemaCache"
 */
const MODULE_ID$5 = "starfinder-thirdparty";
const CACHE_SETTING_KEY = "schemaCache";
const CACHE_SCHEMA_VERSION = "4.0.0";
class SchemaCache {
    /** In-memory cache. Key = "DocumentType.subtype". */
    static cache = new Map();
    static initialized = false;
    /** Set of keys whose hash changed since the last loaded cache. */
    static changedKeys = new Set();
    // ── Lifecycle ─────────────────────────────────────────────────────────────
    /** Loads persisted schemas into memory. Call once during `ready`. */
    static async initialize() {
        if (this.initialized)
            return;
        try {
            const raw = game.settings.get(MODULE_ID$5, CACHE_SETTING_KEY);
            const payload = this.deserialize(raw);
            this.cache.clear();
            for (const [key, schema] of Object.entries(payload.schemas)) {
                this.cache.set(key, schema);
            }
            this.initialized = true;
            ModuleLogger.info(`[SchemaCache] Initialized with ${this.cache.size} cached schema(s).`);
        }
        catch (err) {
            ModuleLogger.warn(`[SchemaCache] Could not load cache: ${String(err)}. Starting fresh.`);
            this.cache.clear();
            this.initialized = true;
        }
    }
    /** Persists all in-memory schemas to Foundry settings. */
    static async persist() {
        const schemas = {};
        for (const [key, schema] of this.cache) {
            schemas[key] = schema;
        }
        const payload = {
            schemaVersion: CACHE_SCHEMA_VERSION,
            systemId: game.system?.id ?? "unknown",
            savedAt: new Date().toISOString(),
            schemas,
        };
        await game.settings.set(MODULE_ID$5, CACHE_SETTING_KEY, payload);
        ModuleLogger.info(`[SchemaCache] Persisted ${this.cache.size} schema(s).`);
    }
    /** Clears all cached schemas from memory and storage. */
    static async clear() {
        this.cache.clear();
        this.changedKeys.clear();
        await game.settings.set(MODULE_ID$5, CACHE_SETTING_KEY, {
            schemaVersion: CACHE_SCHEMA_VERSION,
            systemId: "",
            savedAt: new Date().toISOString(),
            schemas: {},
        });
        ModuleLogger.info("[SchemaCache] Cache cleared.");
    }
    static reset() {
        this.cache.clear();
        this.changedKeys.clear();
        this.initialized = false;
    }
    // ── Read operations ───────────────────────────────────────────────────────
    static get(documentType, subtype) {
        return this.cache.get(makeSchemaKey(documentType, subtype));
    }
    static getAll() {
        return [...this.cache.values()];
    }
    static has(documentType, subtype) {
        return this.cache.has(makeSchemaKey(documentType, subtype));
    }
    /** Returns the set of keys that were updated during the last store() call. */
    static getChangedKeys() {
        return new Set(this.changedKeys);
    }
    // ── Write operations ──────────────────────────────────────────────────────
    /**
     * Stores a schema in the in-memory cache.
     * Detects hash changes and records them in `changedKeys`.
     * Does NOT automatically persist to settings — call `persist()` explicitly.
     */
    static store(schema) {
        const key = makeSchemaKey(schema.documentType, schema.subtype);
        const existing = this.cache.get(key);
        if (existing && existing.schemaHash !== schema.schemaHash) {
            this.changedKeys.add(key);
            ModuleLogger.info(`[SchemaCache] Schema changed: ${key} ` +
                `(${existing.schemaHash} → ${schema.schemaHash})`);
        }
        else if (!existing) {
            this.changedKeys.add(key);
        }
        this.cache.set(key, schema);
    }
    /** Removes a schema from the in-memory cache. */
    static remove(documentType, subtype) {
        this.cache.delete(makeSchemaKey(documentType, subtype));
    }
    // ── Serialization ─────────────────────────────────────────────────────────
    static deserialize(raw) {
        const empty = {
            schemaVersion: CACHE_SCHEMA_VERSION,
            systemId: "",
            savedAt: new Date().toISOString(),
            schemas: {},
        };
        if (!raw || typeof raw !== "object")
            return empty;
        const payload = raw;
        return {
            schemaVersion: payload.schemaVersion ?? CACHE_SCHEMA_VERSION,
            systemId: payload.systemId ?? "",
            savedAt: payload.savedAt ?? new Date().toISOString(),
            schemas: payload.schemas ?? {},
        };
    }
}

/**
 * Schema Registry — Milestone 4
 *
 * Central registry that holds all discovered schemas for the current game
 * system. Coordinates SchemaDiscovery (live scan), SchemaCache (persistence),
 * and SchemaReporter (diff generation).
 *
 * Lifecycle:
 *   1. SchemaRegistry.initialize() is called in the `ready` hook.
 *   2. It loads the persisted cache, then runs a live scan.
 *   3. Changed schemas (detected via hash comparison) are logged/reported.
 *   4. All subsequent systems use SchemaRegistry.get() synchronously.
 */
class SchemaRegistry {
    /** In-memory live schemas (may differ from cache after a system update). */
    static live = new Map();
    /** Schema diffs generated during the last scan. */
    static lastDiffs = [];
    static initialized = false;
    // ── Lifecycle ─────────────────────────────────────────────────────────────
    /**
     * Initializes the registry:
     *   1. Load persisted cache.
     *   2. Run live schema scan.
     *   3. Detect changes, update cache, persist.
     */
    static async initialize() {
        if (this.initialized)
            return;
        await SchemaCache.initialize();
        const diffs = await this.scanAll();
        this.lastDiffs = diffs;
        if (diffs.length > 0) {
            ModuleLogger.info(`[SchemaRegistry] ${diffs.length} schema change(s) detected since last session.`);
            await SchemaCache.persist();
        }
        this.initialized = true;
        ModuleLogger.info(`[SchemaRegistry] Ready. ${this.live.size} schema(s) in registry.`);
    }
    /**
     * Forces a full re-scan of all document types. Updates the cache and
     * returns an array of diffs (one per changed schema).
     */
    static async rescan() {
        ModuleLogger.info("[SchemaRegistry] Rescanning all document schemas…");
        const diffs = await this.scanAll();
        this.lastDiffs = diffs;
        await SchemaCache.persist();
        ModuleLogger.info(`[SchemaRegistry] Rescan complete. ${diffs.length} change(s).`);
        return diffs;
    }
    // ── Read operations ───────────────────────────────────────────────────────
    static get(documentType, subtype) {
        return this.live.get(makeSchemaKey(documentType, subtype));
    }
    static getAll() {
        return [...this.live.values()];
    }
    static has(documentType, subtype) {
        return this.live.has(makeSchemaKey(documentType, subtype));
    }
    /** Returns all schema diffs from the most recent scan. */
    static getLastDiffs() {
        return [...this.lastDiffs];
    }
    /** Returns all registered Item subtypes with available schemas. */
    static getItemSubtypes() {
        return [...this.live.values()]
            .filter((s) => s.documentType === "Item")
            .map((s) => s.subtype);
    }
    /** Returns all registered Actor subtypes with available schemas. */
    static getActorSubtypes() {
        return [...this.live.values()]
            .filter((s) => s.documentType === "Actor")
            .map((s) => s.subtype);
    }
    // ── Write operations ──────────────────────────────────────────────────────
    /**
     * Registers a schema from a user-selected template document.
     * Overwrites any existing schema for the same document type + subtype.
     */
    static async registerTemplate(schema) {
        const key = makeSchemaKey(schema.documentType, schema.subtype);
        this.live.set(key, schema);
        SchemaCache.store(schema);
        await SchemaCache.persist();
        ModuleLogger.info(`[SchemaRegistry] Template schema registered for ${key}.`);
    }
    // ── Private implementation ────────────────────────────────────────────────
    static async scanAll() {
        const diffs = [];
        const itemSchemas = SchemaDiscovery.discoverAll("Item");
        const actorSchemas = SchemaDiscovery.discoverAll("Actor");
        for (const schema of [...itemSchemas, ...actorSchemas]) {
            const key = makeSchemaKey(schema.documentType, schema.subtype);
            const previous = SchemaCache.get(schema.documentType, schema.subtype);
            if (previous && previous.schemaHash !== schema.schemaHash) {
                diffs.push(buildDiff(previous, schema));
            }
            this.live.set(key, schema);
            SchemaCache.store(schema);
        }
        return diffs;
    }
}
// ── Diff builder ──────────────────────────────────────────────────────────────
function buildDiff(prev, curr) {
    const prevPaths = new Map(prev.fields.map((f) => [f.path, f]));
    const currPaths = new Map(curr.fields.map((f) => [f.path, f]));
    const addedFields = [];
    const removedFields = [];
    const changedTypes = [];
    const newlyRequired = [];
    for (const [path, currField] of currPaths) {
        const prevField = prevPaths.get(path);
        if (!prevField) {
            addedFields.push(path);
        }
        else {
            if (prevField.type !== currField.type) {
                changedTypes.push({ path, from: prevField.type, to: currField.type });
            }
            if (!prevField.required && currField.required) {
                newlyRequired.push(path);
            }
        }
    }
    for (const path of prevPaths.keys()) {
        if (!currPaths.has(path))
            removedFields.push(path);
    }
    return {
        systemId: curr.systemId,
        documentType: curr.documentType,
        subtype: curr.subtype,
        previousHash: prev.schemaHash,
        currentHash: curr.schemaHash,
        addedFields,
        removedFields,
        changedTypes,
        newlyRequired,
        comparedAt: new Date().toISOString(),
        isCompatible: addedFields.length === 0 && removedFields.length === 0 &&
            changedTypes.length === 0 && newlyRequired.length === 0,
    };
}

/**
 * Schema Reporter — Milestone 4
 *
 * Generates human-readable and machine-readable reports from:
 *   - SchemaDiff objects (schema change reports)
 *   - BatchCompatibilityResult objects (pre-import validation reports)
 *
 * All report methods return plain strings suitable for display in the UI
 * or download as text/JSON files.
 */
class SchemaReporter {
    // ── Schema diff reports ───────────────────────────────────────────────────
    /**
     * Formats a SchemaDiff as a human-readable text report.
     */
    static formatDiff(diff) {
        const lines = [
            `=== Schema Change Report ===`,
            `System       : ${diff.systemId}`,
            `Document     : ${diff.documentType}.${diff.subtype}`,
            `Previous Hash: ${diff.previousHash}`,
            `Current Hash : ${diff.currentHash}`,
            `Compared At  : ${diff.comparedAt}`,
            ``,
        ];
        if (diff.isCompatible) {
            lines.push("✓ No changes detected.");
            return lines.join("\n");
        }
        if (diff.addedFields.length > 0) {
            lines.push(`Added Fields (${diff.addedFields.length}):`);
            diff.addedFields.forEach((f) => lines.push(`  + ${f}`));
            lines.push("");
        }
        if (diff.removedFields.length > 0) {
            lines.push(`Removed Fields (${diff.removedFields.length}):`);
            diff.removedFields.forEach((f) => lines.push(`  - ${f}`));
            lines.push("");
        }
        if (diff.changedTypes.length > 0) {
            lines.push(`Type Changes (${diff.changedTypes.length}):`);
            diff.changedTypes.forEach((c) => lines.push(`  ~ ${c.path}: ${c.from} → ${c.to}`));
            lines.push("");
        }
        if (diff.newlyRequired.length > 0) {
            lines.push(`Newly Required Fields (${diff.newlyRequired.length}):`);
            diff.newlyRequired.forEach((f) => lines.push(`  ! ${f}`));
            lines.push("");
        }
        return lines.join("\n");
    }
    /**
     * Formats all diffs from the last scan as a combined text report.
     */
    static formatAllDiffs() {
        const diffs = SchemaRegistry.getLastDiffs();
        if (diffs.length === 0) {
            return "No schema changes detected since the last session.";
        }
        return diffs
            .map((d) => this.formatDiff(d))
            .join("\n" + "─".repeat(60) + "\n");
    }
    /**
     * Serializes a SchemaDiff to a JSON string.
     */
    static diffToJson(diff) {
        return JSON.stringify(diff, null, 2);
    }
    // ── Compatibility reports ─────────────────────────────────────────────────
    /**
     * Formats a batch compatibility result as human-readable text.
     */
    static formatCompatibilityReport(result) {
        const lines = [
            `=== Schema Compatibility Report ===`,
            `Generated  : ${result.generatedAt}`,
            `Total      : ${result.total}`,
            `Compatible : ${result.compatible}`,
            `Issues     : ${result.incompatible}`,
            ``,
        ];
        const incompatible = result.reports.filter((r) => !r.compatible);
        const compatible = result.reports.filter((r) => r.compatible);
        if (incompatible.length > 0) {
            lines.push(`=== Records With Issues ===`);
            for (const report of incompatible) {
                lines.push(`\n✗ ${report.recordName} [${report.category}]`);
                if (report.missingRequiredFields.length > 0) {
                    lines.push(`  Missing Required:`);
                    report.missingRequiredFields.forEach((f) => lines.push(`    • ${f}`));
                }
                if (report.unknownFields.length > 0) {
                    lines.push(`  Unknown Fields:`);
                    report.unknownFields.forEach((f) => lines.push(`    ? ${f}`));
                }
                if (report.suggestions.length > 0) {
                    lines.push(`  Suggestions:`);
                    report.suggestions.forEach((s) => lines.push(`    → ${s.field}: ${s.suggestion}`));
                }
            }
            lines.push("");
        }
        if (compatible.length > 0) {
            lines.push(`=== Compatible Records (${compatible.length}) ===`);
            compatible.forEach((r) => lines.push(`  ✓ ${r.recordName} [${r.category}]`));
        }
        return lines.join("\n");
    }
    /**
     * Serializes a batch compatibility result to JSON.
     */
    static compatibilityToJson(result) {
        return JSON.stringify(result, null, 2);
    }
    // ── Schema summary ────────────────────────────────────────────────────────
    /**
     * Returns a brief summary of all schemas in the registry.
     */
    static formatRegistrySummary() {
        const schemas = SchemaRegistry.getAll();
        if (schemas.length === 0) {
            return "No schemas registered. Run a schema scan first.";
        }
        const lines = [
            `=== Schema Registry Summary ===`,
            `Total schemas: ${schemas.length}`,
            "",
        ];
        const byType = {};
        for (const s of schemas) {
            (byType[s.documentType] ??= []).push(s);
        }
        for (const [type, group] of Object.entries(byType)) {
            lines.push(`${type} (${group.length}):`);
            for (const s of group.sort((a, b) => a.subtype.localeCompare(b.subtype))) {
                lines.push(`  ${s.subtype.padEnd(20)} ${s.fields.length.toString().padStart(4)} fields` +
                    `  [${s.source}]  hash: ${s.schemaHash}`);
            }
            lines.push("");
        }
        const diffs = SchemaRegistry.getLastDiffs();
        if (diffs.length > 0) {
            lines.push(`⚠ ${diffs.length} schema change(s) detected since last session.`);
            diffs.forEach((d) => lines.push(`  ${d.documentType}.${d.subtype}: +${d.addedFields.length} -${d.removedFields.length} ~${d.changedTypes.length}`));
        }
        else {
            lines.push("✓ No schema changes since last session.");
        }
        return lines.join("\n");
    }
    // ── Download helpers ──────────────────────────────────────────────────────
    /** Triggers a browser download for a text or JSON report. */
    static downloadReport(content, filename, mimeType = "text/plain") {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    /** Downloads the registry summary as a text file. */
    static downloadRegistrySummary() {
        this.downloadReport(this.formatRegistrySummary(), `sf3pl-schema-summary-${Date.now()}.txt`);
    }
    /** Downloads all current schema diffs as JSON. */
    static downloadDiffsJson() {
        const diffs = SchemaRegistry.getLastDiffs();
        this.downloadReport(JSON.stringify(diffs, null, 2), `sf3pl-schema-diffs-${Date.now()}.json`, "application/json");
    }
    /** Downloads a compatibility report as JSON. */
    static downloadCompatibilityReport(result) {
        this.downloadReport(this.compatibilityToJson(result), `sf3pl-compatibility-${Date.now()}.json`, "application/json");
    }
    /** Downloads a single record compatibility report as text. */
    static downloadSingleReport(report) {
        const lines = [
            `Record: ${report.recordName} [${report.category}]`,
            `Status: ${report.compatible ? "Compatible" : "Issues found"}`,
            `Generated: ${report.generatedAt}`,
            "",
        ];
        if (!report.compatible) {
            lines.push(`Missing Required: ${report.missingRequiredFields.join(", ") || "none"}`);
            lines.push(`Unknown Fields: ${report.unknownFields.join(", ") || "none"}`);
            report.suggestions.forEach((s) => lines.push(`→ ${s.field}: ${s.suggestion}`));
        }
        this.downloadReport(lines.join("\n"), `sf3pl-record-${report.recordId}.txt`);
    }
}

/**
 * Mapping Profiles — Milestone 4
 *
 * A MappingProfile is a named, category-specific ordered list of MappingRules.
 * Profiles are generated from:
 *   1. The hard-coded config/[category]-mapping.json files (base rules)
 *   2. The discovered schema (fills in defaults for fields not covered by rules)
 *   3. User-added custom rules (persisted in Foundry settings)
 *
 * Profiles are stored by category name and rebuilt when:
 *   - The schema changes (hash mismatch)
 *   - The user adds/removes a custom rule
 *   - The user runs "Rebuild Schema Registry"
 */
// ── Static mapping of category → doc type ────────────────────────────────────
const CATEGORY_DOC_MAP = {
    weapon: { documentType: "Item", subtype: "weapon" },
    armor: { documentType: "Item", subtype: "armor" },
    equipment: { documentType: "Item", subtype: "equipment" },
    augmentation: { documentType: "Item", subtype: "augmentation" },
    feat: { documentType: "Item", subtype: "feat" },
    spell: { documentType: "Item", subtype: "spell" },
    race: { documentType: "Item", subtype: "race" },
    theme: { documentType: "Item", subtype: "theme" },
    class: { documentType: "Item", subtype: "class" },
    archetypeFeature: { documentType: "Item", subtype: "archetypeFeature" },
    npc: { documentType: "Actor", subtype: "npc2" },
    vehicle: { documentType: "Actor", subtype: "vehicle" },
    starship: { documentType: "Actor", subtype: "starship" },
    hazard: { documentType: "Actor", subtype: "hazard" },
};
// ── Base rules derived from config JSON files ─────────────────────────────────
/**
 * The base rules loaded from config/[category]-mapping.json files.
 * These are the same field mappings the M3 converters use, expressed as
 * MappingRule objects so the MappingEngine can execute them.
 */
const BASE_RULES = {
    weapon: [
        { kind: "alias", targetPath: "level", sourceKeys: ["level"], coerce: "number", defaultValue: 1 },
        { kind: "alias", targetPath: "price", sourceKeys: ["price"], coerce: "number", defaultValue: 0 },
        { kind: "alias", targetPath: "quantity", sourceKeys: ["quantity"], coerce: "number", defaultValue: 1 },
        { kind: "transform", targetPath: "bulk", sourceKey: "bulk", transformName: "parseBulk", defaultValue: 1 },
        { kind: "alias", targetPath: "damage[0].formula", sourceKeys: ["damage", "damageFormula"], coerce: "string", defaultValue: "1d6" },
        { kind: "alias", targetPath: "range.value", sourceKeys: ["range"], coerce: "number", defaultValue: 30 },
        { kind: "alias", targetPath: "capacity.max", sourceKeys: ["capacity"], coerce: "number", defaultValue: 20 },
        { kind: "alias", targetPath: "usage.value", sourceKeys: ["usage"], coerce: "number", defaultValue: 1 },
        { kind: "alias", targetPath: "special", sourceKeys: ["special"], coerce: "string", defaultValue: "" },
        { kind: "alias", targetPath: "rarity", sourceKeys: ["rarity"], coerce: "string", defaultValue: "common" },
        { kind: "alias", targetPath: "description.value", sourceKeys: ["description"], coerce: "string", defaultValue: "" },
        { kind: "default", targetPath: "equipped", value: false },
        { kind: "default", targetPath: "proficient", value: false },
    ],
    armor: [
        { kind: "alias", targetPath: "level", sourceKeys: ["level"], coerce: "number", defaultValue: 1 },
        { kind: "alias", targetPath: "price", sourceKeys: ["price"], coerce: "number", defaultValue: 0 },
        { kind: "alias", targetPath: "quantity", sourceKeys: ["quantity"], coerce: "number", defaultValue: 1 },
        { kind: "transform", targetPath: "bulk", sourceKey: "bulk", transformName: "parseBulk", defaultValue: 1 },
        { kind: "alias", targetPath: "armor.eac", sourceKeys: ["eac"], coerce: "number", defaultValue: 0 },
        { kind: "alias", targetPath: "armor.kac", sourceKeys: ["kac"], coerce: "number", defaultValue: 0 },
        { kind: "transform", targetPath: "maxDexBonus", sourceKey: "maxDex", transformName: "parseMaxDex", defaultValue: 99 },
        { kind: "alias", targetPath: "armorCheckPenalty", sourceKeys: ["acp", "armorCheckPenalty"], coerce: "number", defaultValue: 0 },
        { kind: "alias", targetPath: "upgradeSlots", sourceKeys: ["upgradeSlots"], coerce: "number", defaultValue: 0 },
        { kind: "alias", targetPath: "description.value", sourceKeys: ["description"], coerce: "string", defaultValue: "" },
        { kind: "default", targetPath: "equipped", value: false },
    ],
    feat: [
        { kind: "alias", targetPath: "description.value", sourceKeys: ["description"], coerce: "string", defaultValue: "" },
        { kind: "transform", targetPath: "prerequisites.parts", sourceKey: "prerequisites", transformName: "parseList", defaultValue: [] },
        { kind: "alias", targetPath: "activation.type", sourceKeys: ["activation"], coerce: "string", defaultValue: "passive" },
        { kind: "alias", targetPath: "rarity", sourceKeys: ["rarity"], coerce: "string", defaultValue: "common" },
    ],
    spell: [
        { kind: "alias", targetPath: "level", sourceKeys: ["level"], coerce: "number", defaultValue: 1 },
        { kind: "alias", targetPath: "school", sourceKeys: ["school"], coerce: "string", defaultValue: "uni" },
        { kind: "alias", targetPath: "range.value", sourceKeys: ["range"], coerce: "string", defaultValue: "" },
        { kind: "alias", targetPath: "duration.value", sourceKeys: ["duration"], coerce: "string", defaultValue: "" },
        { kind: "alias", targetPath: "save.type", sourceKeys: ["save", "savingThrow"], coerce: "string", defaultValue: "" },
        { kind: "alias", targetPath: "sr", sourceKeys: ["sr"], coerce: "boolean", defaultValue: false },
        { kind: "alias", targetPath: "description.value", sourceKeys: ["description"], coerce: "string", defaultValue: "" },
    ],
    npc: [
        { kind: "transform", targetPath: "details.cr", sourceKey: "cr", transformName: "parseCR", defaultValue: 1 },
        { kind: "alias", targetPath: "details.alignment", sourceKeys: ["alignment"], coerce: "string", defaultValue: "n" },
        { kind: "transform", targetPath: "details.size", sourceKey: "size", transformName: "parseSize", defaultValue: "medium" },
        { kind: "alias", targetPath: "attributes.eac.value", sourceKeys: ["eac"], coerce: "number", defaultValue: 10 },
        { kind: "alias", targetPath: "attributes.kac.value", sourceKeys: ["kac"], coerce: "number", defaultValue: 10 },
        { kind: "alias", targetPath: "attributes.hp.max", sourceKeys: ["hp"], coerce: "number", defaultValue: 6 },
        { kind: "alias", targetPath: "attributes.fort.bonus", sourceKeys: ["fort"], coerce: "number", defaultValue: 0 },
        { kind: "alias", targetPath: "attributes.reflex.bonus", sourceKeys: ["ref"], coerce: "number", defaultValue: 0 },
        { kind: "alias", targetPath: "attributes.will.bonus", sourceKeys: ["will"], coerce: "number", defaultValue: 0 },
        { kind: "alias", targetPath: "abilities.str.value", sourceKeys: ["str"], coerce: "number", defaultValue: 10 },
        { kind: "alias", targetPath: "abilities.dex.value", sourceKeys: ["dex"], coerce: "number", defaultValue: 10 },
        { kind: "alias", targetPath: "abilities.con.value", sourceKeys: ["con"], coerce: "number", defaultValue: 10 },
        { kind: "alias", targetPath: "abilities.int.value", sourceKeys: ["int"], coerce: "number", defaultValue: 10 },
        { kind: "alias", targetPath: "abilities.wis.value", sourceKeys: ["wis"], coerce: "number", defaultValue: 10 },
        { kind: "alias", targetPath: "abilities.cha.value", sourceKeys: ["cha"], coerce: "number", defaultValue: 10 },
        { kind: "alias", targetPath: "speed.value", sourceKeys: ["speed"], coerce: "number", defaultValue: 30 },
        { kind: "alias", targetPath: "details.biography.value", sourceKeys: ["description"], coerce: "string", defaultValue: "" },
    ],
};
// ── Profile registry ──────────────────────────────────────────────────────────
class MappingProfiles {
    static profiles = new Map();
    /**
     * Returns the profile for a category, building it first if not cached.
     */
    static get(category) {
        if (!this.profiles.has(category)) {
            this.build(category);
        }
        return this.profiles.get(category);
    }
    /**
     * Builds (or rebuilds) the profile for a category by combining base rules
     * with schema-derived defaults.
     */
    static build(category) {
        const mapping = CATEGORY_DOC_MAP[category];
        if (!mapping)
            return null;
        const schema = SchemaRegistry.get(mapping.documentType, mapping.subtype);
        const baseRules = [...(BASE_RULES[category] ?? [])];
        // Auto-generate ExactRule entries for schema fields not covered by base rules
        if (schema) {
            const coveredTargets = new Set(baseRules.map((r) => r.targetPath));
            for (const field of schema.fields) {
                if (!coveredTargets.has(field.path) && field.defaultValue !== null && field.defaultValue !== undefined) {
                    const autoRule = {
                        kind: "exact",
                        sourceKey: field.path.split(".").pop() ?? field.path,
                        targetPath: field.path,
                        coerce: field.type === "string" ? "string" :
                            field.type === "number" ? "number" :
                                field.type === "boolean" ? "boolean" :
                                    field.type === "array" ? "array" : undefined,
                        defaultValue: field.defaultValue,
                    };
                    baseRules.push(autoRule);
                }
            }
        }
        const profile = {
            category,
            documentType: mapping.documentType,
            sfrpgSubtype: mapping.subtype,
            schemaHash: schema?.schemaHash ?? "no-schema",
            builtAt: new Date().toISOString(),
            rules: baseRules,
        };
        this.profiles.set(category, profile);
        ModuleLogger.debug(`[MappingProfiles] Built profile for "${category}" (${baseRules.length} rules).`);
        return profile;
    }
    /**
     * Rebuilds all known profiles. Called after a schema rescan.
     */
    static buildAll() {
        for (const category of Object.keys(CATEGORY_DOC_MAP)) {
            this.build(category);
        }
        ModuleLogger.info(`[MappingProfiles] Rebuilt ${this.profiles.size} profile(s).`);
    }
    /**
     * Serializes all profiles to JSON for export.
     */
    static toJson() {
        const obj = {};
        for (const [cat, profile] of this.profiles) {
            obj[cat] = profile;
        }
        return JSON.stringify(obj, null, 2);
    }
    static getAllProfiles() {
        return [...this.profiles.values()];
    }
    static clear() {
        this.profiles.clear();
    }
    static isStale(category) {
        const profile = this.profiles.get(category);
        if (!profile)
            return true;
        const mapping = CATEGORY_DOC_MAP[category];
        if (!mapping)
            return false;
        const schema = SchemaRegistry.get(mapping.documentType, mapping.subtype);
        return !!schema && schema.schemaHash !== profile.schemaHash;
    }
}

/**
 * Mapping Validator — Milestone 4
 *
 * Validates a MappingProfile against a DiscoveredSchema to identify:
 *   - Required schema fields not covered by any rule
 *   - Rules that reference unknown schema paths (possible typos)
 *   - Rules targeting paths removed in a schema update
 *
 * Produces a MappingValidationReport used by the Schema Manager UI.
 */
// ── Validator ─────────────────────────────────────────────────────────────────
class MappingValidator {
    /**
     * Validates a MappingProfile against a DiscoveredSchema.
     */
    static validate(profile, schema) {
        const coveredTargets = this.collectCoveredPaths(profile.rules);
        const schemaPathMap = new Map(schema.fields.map((f) => [f.path, f]));
        const missingRequiredRules = [];
        const missingOptionalRules = [];
        const staleRules = [];
        // Check schema fields against covered targets
        for (const [path, field] of schemaPathMap) {
            const isCovered = [...coveredTargets].some((t) => t === path || path.startsWith(`${t}.`) || t.startsWith(`${path}.`));
            if (!isCovered) {
                const gap = {
                    schemaPath: path,
                    required: field.required,
                    suggestedSourceKey: this.suggestSourceKey(path),
                };
                if (field.required) {
                    missingRequiredRules.push(gap);
                }
                else {
                    missingOptionalRules.push(gap);
                }
            }
        }
        // Check rules for stale targets
        for (const rule of profile.rules) {
            if (rule.kind === "default")
                continue; // defaults are always valid
            const target = rule.targetPath;
            const knownInSchema = [...schemaPathMap.keys()].some((p) => p === target || p.startsWith(`${target}.`) || target.startsWith(`${p}.`));
            if (!knownInSchema) {
                staleRules.push({
                    rule,
                    reason: `Target path "${target}" not found in current schema.`,
                });
            }
        }
        return {
            category: profile.category,
            schemaHash: schema.schemaHash,
            profileHash: profile.schemaHash,
            missingRequiredRules,
            missingOptionalRules,
            staleRules,
            isValid: missingRequiredRules.length === 0 && staleRules.length === 0,
            generatedAt: new Date().toISOString(),
        };
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    static collectCoveredPaths(rules) {
        const paths = new Set();
        for (const rule of rules) {
            paths.add(rule.targetPath);
            if (rule.kind === "nested") {
                for (const p of this.collectCoveredPaths(rule.rules)) {
                    paths.add(p);
                }
            }
        }
        return paths;
    }
    /** Guesses a rawContent key name from a dot-path schema field path. */
    static suggestSourceKey(path) {
        return path.split(".").pop()?.split("[")[0] ?? path;
    }
    /**
     * Serializes a MappingValidationReport to a formatted text string.
     */
    static formatReport(report) {
        const lines = [
            `=== Mapping Validation Report ===`,
            `Category    : ${report.category}`,
            `Schema Hash : ${report.schemaHash}`,
            `Profile Hash: ${report.profileHash}`,
            `Generated   : ${report.generatedAt}`,
            `Status      : ${report.isValid ? "✓ Valid" : "✗ Issues found"}`,
            "",
        ];
        if (report.staleRules.length > 0) {
            lines.push(`Stale Rules (${report.staleRules.length}):`);
            report.staleRules.forEach((s) => lines.push(`  ! ${s.rule.targetPath} — ${s.reason}`));
            lines.push("");
        }
        if (report.missingRequiredRules.length > 0) {
            lines.push(`Missing Required Rules (${report.missingRequiredRules.length}):`);
            report.missingRequiredRules.forEach((g) => lines.push(`  * ${g.schemaPath}` +
                (g.suggestedSourceKey ? ` (suggested source: "${g.suggestedSourceKey}")` : "")));
            lines.push("");
        }
        if (report.missingOptionalRules.length > 0) {
            lines.push(`Missing Optional Rules (${report.missingOptionalRules.length}):`);
            report.missingOptionalRules.forEach((g) => lines.push(`  - ${g.schemaPath}`));
        }
        return lines.join("\n");
    }
}

/**
 * Schema Validator — Milestone 4
 *
 * Validates a ContentRecord's rawContent against a DiscoveredSchema.
 * Produces a SchemaCompatibilityReport for each record detailing:
 *   - Missing required fields
 *   - Missing optional fields
 *   - Unknown fields (potential typos in import data)
 *   - Actionable fix suggestions
 *
 * This supplements the M2 ImportValidator (which checks database-level
 * constraints) by adding system-schema-level field validation.
 */
/** Maps ContentCategory values to SFRPG document type + subtype. */
const CATEGORY_TO_DOC_TYPE$1 = {
    weapon: { documentType: "Item", subtype: "weapon" },
    armor: { documentType: "Item", subtype: "armor" },
    equipment: { documentType: "Item", subtype: "equipment" },
    augmentation: { documentType: "Item", subtype: "augmentation" },
    feat: { documentType: "Item", subtype: "feat" },
    spell: { documentType: "Item", subtype: "spell" },
    race: { documentType: "Item", subtype: "race" },
    theme: { documentType: "Item", subtype: "theme" },
    class: { documentType: "Item", subtype: "class" },
    archetypeFeature: { documentType: "Item", subtype: "archetypeFeature" },
    npc: { documentType: "Actor", subtype: "npc2" },
    vehicle: { documentType: "Actor", subtype: "vehicle" },
    starship: { documentType: "Actor", subtype: "starship" },
    hazard: { documentType: "Actor", subtype: "hazard" },
};
class SchemaValidator {
    /**
     * Validates a single ContentRecord against the schema for its category.
     * Returns null if no schema is registered for the category.
     */
    static validate(record) {
        const mapping = CATEGORY_TO_DOC_TYPE$1[record.category];
        if (!mapping)
            return null;
        const schema = SchemaRegistry.get(mapping.documentType, mapping.subtype);
        if (!schema)
            return null;
        return this.validateAgainstSchema(record, schema);
    }
    /**
     * Validates a record against a specific schema directly.
     * Useful when testing or when the registry is not yet initialized.
     */
    static validateAgainstSchema(record, schema) {
        const rawKeys = this.flattenKeys(record.rawContent);
        const schemaFieldMap = new Map(schema.fields.map((f) => [f.path, f]));
        const missingRequiredFields = [];
        const missingOptionalFields = [];
        const unknownFields = [];
        const suggestions = [];
        // Check schema fields against rawContent
        for (const [path, field] of schemaFieldMap) {
            const topKey = path.split(".")[0].split("[")[0];
            const hasTopKey = rawKeys.some((k) => k === topKey || k === path || k.startsWith(`${topKey}.`));
            if (!hasTopKey) {
                if (field.required) {
                    missingRequiredFields.push(path);
                    suggestions.push({
                        field: path,
                        suggestion: this.buildSuggestion(path, field.defaultValue, field.type),
                    });
                }
                else {
                    missingOptionalFields.push(path);
                }
            }
        }
        // Check rawContent keys against schema (unknown fields)
        for (const rawKey of rawKeys) {
            const topKey = rawKey.split(".")[0].split("[")[0];
            const knownInSchema = [...schemaFieldMap.keys()].some((p) => p === topKey || p.startsWith(`${topKey}.`) || p.startsWith(`${topKey}[`));
            if (!knownInSchema) {
                unknownFields.push(rawKey);
            }
        }
        const compatible = missingRequiredFields.length === 0;
        return {
            recordId: record.id,
            recordName: record.name,
            category: record.category,
            compatible,
            missingRequiredFields,
            missingOptionalFields,
            unknownFields,
            suggestions,
            generatedAt: new Date().toISOString(),
        };
    }
    /**
     * Validates a batch of records. Returns aggregate stats and per-record reports.
     */
    static validateBatch(records) {
        const reports = [];
        let compatible = 0;
        let incompatible = 0;
        for (const record of records) {
            const report = this.validate(record);
            if (!report)
                continue;
            reports.push(report);
            if (report.compatible)
                compatible++;
            else
                incompatible++;
        }
        return {
            total: reports.length,
            compatible,
            incompatible,
            reports,
            generatedAt: new Date().toISOString(),
        };
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    /** Flattens a nested rawContent object into dot-path key strings. */
    static flattenKeys(obj, prefix = "", depth = 0) {
        if (depth > 5 || typeof obj !== "object" || obj === null)
            return [];
        const keys = [];
        for (const [k, v] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${k}` : k;
            keys.push(path);
            if (typeof v === "object" && v !== null && !Array.isArray(v)) {
                keys.push(...this.flattenKeys(v, path, depth + 1));
            }
        }
        return keys;
    }
    static buildSuggestion(path, defaultValue, type) {
        if (defaultValue !== null && defaultValue !== undefined) {
            return `Add "${path}" with value ${JSON.stringify(defaultValue)} (default).`;
        }
        const typeExample = {
            string: `""`,
            number: `0`,
            boolean: `false`,
            array: `[]`,
            object: `{}`,
        };
        const example = typeExample[type] ?? `null`;
        return `Add "${path}" (${type}), e.g. ${example}.`;
    }
}

/**
 * Template Store — Milestone 4
 *
 * Stores and retrieves user-selected DocumentTemplate entries in Foundry
 * world settings. Templates are used by the Template Manager UI and by
 * SchemaDiscovery.discoverFromTemplate() to learn Starfinder field structures
 * without depending solely on hard-coded mappings.
 *
 * Storage key: game.settings → "starfinder-thirdparty" → "documentTemplates"
 *
 * Lifecycle:
 *   1. TemplateStore.initialize() is called in the `ready` hook.
 *   2. Users register templates via the Template Manager UI.
 *   3. RepairEngine reads templates to fill missing rawContent fields.
 *   4. SchemaDiscovery.discoverFromTemplate() learns field paths from snapshots.
 */
const MODULE_ID$4 = "starfinder-thirdparty";
const SETTING_KEY = "documentTemplates";
const SCHEMA_VERSION = "4.0.0";
// ── TemplateStore ─────────────────────────────────────────────────────────────
class TemplateStore {
    /** In-memory map keyed by document UUID. */
    static templates = new Map();
    static initialized = false;
    // ── Lifecycle ─────────────────────────────────────────────────────────────
    /** Loads persisted templates into memory. Call once during `ready`. */
    static async initialize() {
        if (this.initialized)
            return;
        try {
            const raw = game.settings.get(MODULE_ID$4, SETTING_KEY);
            const payload = this.deserialize(raw);
            this.templates.clear();
            for (const tpl of payload.templates) {
                this.templates.set(tpl.uuid, tpl);
            }
            this.initialized = true;
            ModuleLogger.info(`[TemplateStore] Loaded ${this.templates.size} template(s).`);
        }
        catch (err) {
            ModuleLogger.warn(`[TemplateStore] Could not load templates: ${String(err)}. Starting fresh.`);
            this.templates.clear();
            this.initialized = true;
        }
    }
    // ── CRUD ──────────────────────────────────────────────────────────────────
    /**
     * Adds or replaces a template entry and persists to settings.
     * If a template with the same UUID already exists, it is overwritten.
     */
    static async add(template) {
        this.templates.set(template.uuid, template);
        await this.persist();
        ModuleLogger.info(`[TemplateStore] Registered template: ${template.name} (${template.subtype})`);
    }
    /** Removes the template with the given UUID and persists. */
    static async remove(uuid) {
        if (!this.templates.has(uuid))
            return;
        const name = this.templates.get(uuid)?.name ?? uuid;
        this.templates.delete(uuid);
        await this.persist();
        ModuleLogger.info(`[TemplateStore] Removed template: ${name}`);
    }
    /** Returns a single template by UUID, or undefined if not registered. */
    static get(uuid) {
        return this.templates.get(uuid);
    }
    /**
     * Returns all registered templates, sorted by subtype then name.
     * Safe to call before initialize() — returns an empty array.
     */
    static getAll() {
        return [...this.templates.values()].sort((a, b) => a.subtype.localeCompare(b.subtype) || a.name.localeCompare(b.name));
    }
    /**
     * Returns the first template registered for the given document subtype,
     * or undefined if none exists. Used by RepairEngine to load defaults.
     */
    static getBySubtype(subtype) {
        for (const tpl of this.templates.values()) {
            if (tpl.subtype === subtype)
                return tpl;
        }
        return undefined;
    }
    /** Returns all unique subtypes that have a registered template. */
    static getSubtypes() {
        return [...new Set([...this.templates.values()].map((t) => t.subtype))].sort();
    }
    /** Total number of registered templates. */
    static count() {
        return this.templates.size;
    }
    // ── Persistence ───────────────────────────────────────────────────────────
    /** Writes all in-memory templates to Foundry world settings. */
    static async persist() {
        const payload = {
            schemaVersion: SCHEMA_VERSION,
            savedAt: new Date().toISOString(),
            templates: [...this.templates.values()],
        };
        await game.settings.set(MODULE_ID$4, SETTING_KEY, payload);
        ModuleLogger.info(`[TemplateStore] Persisted ${this.templates.size} template(s).`);
    }
    /** Clears all templates from memory and storage. */
    static async clear() {
        this.templates.clear();
        await this.persist();
        ModuleLogger.info("[TemplateStore] All templates cleared.");
    }
    // ── Deserialization ───────────────────────────────────────────────────────
    static deserialize(raw) {
        if (typeof raw === "object" &&
            raw !== null &&
            Array.isArray(raw.templates)) {
            return raw;
        }
        return {
            schemaVersion: SCHEMA_VERSION,
            savedAt: new Date().toISOString(),
            templates: [],
        };
    }
    // ── Factory helper ────────────────────────────────────────────────────────
    /**
     * Creates a DocumentTemplate from a live Foundry document.
     * Captures the full system data snapshot at the time of registration.
     *
     * @param doc   A live Item, Actor, or JournalEntry document.
     * @param notes Optional user notes.
     */
    static fromDocument(doc, notes = "") {
        const documentType = this.detectDocumentType(doc);
        return {
            uuid: doc.uuid,
            name: doc.name,
            documentType,
            subtype: doc.type,
            systemDataSnapshot: doc.system ?? {},
            addedAt: new Date().toISOString(),
            notes,
        };
    }
    static detectDocumentType(doc) {
        const uuid = doc.uuid;
        if (uuid.includes(".Item.") || uuid.startsWith("Item."))
            return "Item";
        if (uuid.includes(".Actor.") || uuid.startsWith("Actor."))
            return "Actor";
        if (uuid.includes(".JournalEntry.") || uuid.startsWith("JournalEntry."))
            return "JournalEntry";
        return "Item";
    }
}

/**
 * Repair Engine — Milestone 4
 *
 * Analyzes a ContentRecord against its discovered DiscoveredSchema and applies
 * automatic repairs before compendium conversion:
 *
 *   1. Fill missing fields with schema default values.
 *   2. Apply system data defaults from a registered DocumentTemplate.
 *   3. Normalize values to the schema-declared type (e.g. "42" → 42).
 *   4. Produce a detailed log of every change and every remaining issue.
 *
 * RepairEngine never modifies the source record — it always returns a
 * deep-cloned copy in RepairResult.repairedRecord.
 *
 * Usage:
 *   const result = RepairEngine.repair(record);
 *   if (result.wasModified) {
 *     await ContentDatabase.update(result.repairedRecord);
 *   }
 */
// ── Category → schema type mapping ───────────────────────────────────────────
const CATEGORY_TO_DOC_TYPE = {
    weapon: { documentType: "Item", subtype: "weapon" },
    armor: { documentType: "Item", subtype: "armor" },
    equipment: { documentType: "Item", subtype: "equipment" },
    augmentation: { documentType: "Item", subtype: "augmentation" },
    feat: { documentType: "Item", subtype: "feat" },
    spell: { documentType: "Item", subtype: "spell" },
    race: { documentType: "Item", subtype: "race" },
    theme: { documentType: "Item", subtype: "theme" },
    class: { documentType: "Item", subtype: "class" },
    archetypeFeature: { documentType: "Item", subtype: "archetypeFeature" },
    npc: { documentType: "Actor", subtype: "npc2" },
    vehicle: { documentType: "Actor", subtype: "vehicle" },
    starship: { documentType: "Actor", subtype: "starship" },
    hazard: { documentType: "Actor", subtype: "hazard" },
};
// ── RepairEngine ──────────────────────────────────────────────────────────────
class RepairEngine {
    // ── Public API ─────────────────────────────────────────────────────────────
    /**
     * Repairs a single ContentRecord against the discovered schema.
     * The original record is never mutated.
     */
    static repair(record) {
        const cloned = this.cloneRecord(record);
        const actions = [];
        const remainingIssues = [];
        const mapping = CATEGORY_TO_DOC_TYPE[record.category];
        if (!mapping) {
            return this.noOpResult(cloned, [
                `No schema mapping registered for category: "${record.category}". Cannot repair.`,
            ]);
        }
        const schema = SchemaRegistry.get(mapping.documentType, mapping.subtype);
        if (!schema) {
            return this.noOpResult(cloned, [
                `No discovered schema for ${mapping.documentType}.${mapping.subtype}. ` +
                    `Open Schema Manager and run "Scan Current System" first.`,
            ]);
        }
        const templateDefaults = this.loadTemplateDefaults(mapping.subtype);
        for (const field of schema.fields) {
            const topKey = field.path.split(".")[0].split("[")[0];
            if (this.hasKey(cloned.rawContent, topKey)) {
                // Field is present — attempt type normalization
                const rawVal = cloned.rawContent[topKey];
                const normalized = this.normalizeValue(rawVal, field.type);
                if (normalized !== rawVal) {
                    actions.push({
                        field: topKey,
                        action: "normalized",
                        oldValue: rawVal,
                        newValue: normalized,
                        reason: `Schema declares type "${field.type}", found ${typeof rawVal}. Coerced value.`,
                    });
                    cloned.rawContent[topKey] = normalized;
                }
                continue;
            }
            // Field is absent — attempt to fill it
            if (templateDefaults !== null && templateDefaults[topKey] !== undefined) {
                const val = templateDefaults[topKey];
                actions.push({
                    field: topKey,
                    action: "filled_template",
                    oldValue: undefined,
                    newValue: val,
                    reason: `Filled from registered "${mapping.subtype}" DocumentTemplate.`,
                });
                cloned.rawContent[topKey] = val;
            }
            else if (field.defaultValue !== null && field.defaultValue !== undefined) {
                actions.push({
                    field: topKey,
                    action: "filled_default",
                    oldValue: undefined,
                    newValue: field.defaultValue,
                    reason: `Applied schema-declared default value.`,
                });
                cloned.rawContent[topKey] = field.defaultValue;
            }
            else {
                const severity = field.required ? "Required" : "Optional";
                const issue = `${severity} field "${field.path}" is absent and has no default — manual fix required.`;
                actions.push({
                    field: topKey,
                    action: "skipped",
                    oldValue: undefined,
                    newValue: undefined,
                    reason: issue,
                });
                if (field.required) {
                    remainingIssues.push(issue);
                }
            }
        }
        const wasModified = actions.some((a) => a.action === "filled_default" ||
            a.action === "filled_template" ||
            a.action === "normalized");
        ModuleLogger.debug(`[RepairEngine] "${record.name}": ${actions.length} action(s), ` +
            `${remainingIssues.length} issue(s) remaining, wasModified=${wasModified}`);
        return {
            recordId: record.id,
            recordName: record.name,
            category: record.category,
            actionsApplied: actions,
            remainingIssues,
            repairedRecord: cloned,
            wasModified,
        };
    }
    /**
     * Repairs a batch of ContentRecords.
     * Returns a BatchRepairResult with one RepairResult per input record.
     */
    static repairBatch(records) {
        const results = records.map((r) => this.repair(r));
        const modified = results.filter((r) => r.wasModified).length;
        return {
            total: results.length,
            modified,
            unchanged: results.length - modified,
            results,
            generatedAt: new Date().toISOString(),
        };
    }
    /**
     * Validates a record, then repairs it.
     * Returns both reports so the UI can show before/after comparison.
     */
    static validateAndRepair(record) {
        const compatibility = SchemaValidator.validate(record);
        const repair = this.repair(record);
        return { compatibility, repair };
    }
    /**
     * Formats a RepairResult as a human-readable text block.
     */
    static formatResult(result) {
        const lines = [
            `Record: ${result.recordName} [${result.category}]`,
            `ID: ${result.recordId}`,
            `Modified: ${result.wasModified ? "Yes" : "No"}`,
            "",
        ];
        if (result.actionsApplied.length === 0) {
            lines.push("No actions applied.");
        }
        else {
            lines.push(`Actions (${result.actionsApplied.length}):`);
            for (const action of result.actionsApplied) {
                const icon = {
                    filled_default: "+",
                    filled_template: "T",
                    normalized: "~",
                    skipped: "!",
                }[action.action];
                lines.push(`  [${icon}] ${action.field}: ${action.reason}`);
            }
        }
        if (result.remainingIssues.length > 0) {
            lines.push("", `Remaining Issues (${result.remainingIssues.length}):`);
            result.remainingIssues.forEach((i) => lines.push(`  ⚠ ${i}`));
        }
        return lines.join("\n");
    }
    // ── Private helpers ────────────────────────────────────────────────────────
    static cloneRecord(record) {
        return {
            ...record,
            rawContent: { ...record.rawContent },
            tags: [...record.tags],
        };
    }
    static noOpResult(record, issues) {
        return {
            recordId: record.id,
            recordName: record.name,
            category: record.category,
            actionsApplied: [],
            remainingIssues: issues,
            repairedRecord: record,
            wasModified: false,
        };
    }
    static loadTemplateDefaults(subtype) {
        const template = TemplateStore.getBySubtype(subtype);
        return template?.systemDataSnapshot ?? null;
    }
    static hasKey(rawContent, topKey) {
        return Object.prototype.hasOwnProperty.call(rawContent, topKey);
    }
    /**
     * Attempts to coerce `value` to `targetType`.
     * Returns the original value unchanged when coercion is not needed or possible.
     */
    static normalizeValue(value, targetType) {
        if (value === null || value === undefined)
            return value;
        switch (targetType) {
            case "number": {
                if (typeof value === "number")
                    return value;
                const n = Number(value);
                return isNaN(n) ? value : n;
            }
            case "boolean": {
                if (typeof value === "boolean")
                    return value;
                if (typeof value === "string") {
                    const lower = value.toLowerCase().trim();
                    if (lower === "true" || lower === "1" || lower === "yes")
                        return true;
                    if (lower === "false" || lower === "0" || lower === "no")
                        return false;
                }
                return value;
            }
            case "string": {
                if (typeof value === "string")
                    return value;
                return String(value);
            }
            case "array": {
                if (Array.isArray(value))
                    return value;
                if (typeof value === "string" && value.includes(",")) {
                    return value.split(",").map((s) => s.trim()).filter(Boolean);
                }
                return [value];
            }
            default:
                return value;
        }
    }
}

/**
 * Schema Manager Application — Milestone 4
 *
 * A Foundry V13 ApplicationV2 window that exposes schema discovery and
 * mapping management features to the GM:
 *
 *   Registry tab  — All discovered document schemas with field counts.
 *   Diffs tab     — Schema changes detected since the last session.
 *   Mappings tab  — Auto-generated mapping profiles per content category.
 *   Repair tab    — Run RepairEngine against the content database.
 *
 * Buttons:
 *   Scan Current System    — Live-scans game system; updates registry.
 *   Rebuild Schema Registry — Clears cache then rescans.
 *   Export Diffs           — Downloads diff report as .txt.
 *   Repair All Records     — Runs RepairEngine on every database record and
 *                            saves the repaired copies back to the database.
 *   Open Template Manager  — Opens the companion Template Manager window.
 */
const { ApplicationV2: ApplicationV2$6, HandlebarsApplicationMixin: HandlebarsApplicationMixin$6 } = foundry.applications.api;
// ── SchemaManagerApp ──────────────────────────────────────────────────────────
class SchemaManagerApp extends HandlebarsApplicationMixin$6(ApplicationV2$6) {
    static DEFAULT_OPTIONS = {
        id: "sf3pl-schema-manager",
        title: "SF3PL: Schema Manager",
        classes: ["sf3pl-app", "sf3pl-schema-manager"],
        window: { resizable: true },
        position: { width: 900, height: 640 },
    };
    static PARTS = {
        main: {
            template: "modules/starfinder-thirdparty/templates/schema-manager.hbs",
        },
    };
    activeTab = "registry";
    isScanning = false;
    repairRows = [];
    // ── Context ───────────────────────────────────────────────────────────────
    async _prepareContext(_options) {
        const schemas = SchemaRegistry.getAll();
        const diffs = SchemaRegistry.getLastDiffs();
        MappingProfiles.buildAll();
        const profiles = MappingProfiles.getAllProfiles();
        const schemaRows = schemas.map((s) => this.schemaToRow(s));
        const diffRows = diffs.map((d) => this.diffToRow(d));
        const mappingRows = profiles.map((p) => this.profileToRow(p, schemas));
        const changesFound = diffs.some((d) => !d.isCompatible);
        const totalFields = schemas.reduce((sum, s) => sum + s.fields.length, 0);
        return {
            activeTab: this.activeTab,
            isScanning: this.isScanning,
            registry: {
                schemas: schemaRows,
                totalSchemas: schemaRows.length,
                totalFields,
                systemId: schemas[0]?.systemId ?? game.system?.id ?? "—",
            },
            diffs: {
                rows: diffRows,
                changesFound,
                noDiffs: diffs.length === 0,
            },
            mappings: {
                rows: mappingRows,
                noProfiles: profiles.length === 0,
            },
            repair: {
                rows: this.repairRows,
                noneRun: this.repairRows.length === 0,
                modifiedCount: this.repairRows.filter((r) => r.wasModified).length,
                totalCount: this.repairRows.length,
            },
        };
    }
    // ── Event listeners ───────────────────────────────────────────────────────
    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
        // Tab switching
        html.querySelectorAll("[data-tab]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const tab = btn.dataset.tab;
                if (tab) {
                    this.activeTab = tab;
                    void this.render();
                }
            });
        });
        // Scan button
        html
            .querySelector("[data-action='scan']")
            ?.addEventListener("click", () => void this.scanSystem());
        // Rebuild button
        html
            .querySelector("[data-action='rebuild']")
            ?.addEventListener("click", () => void this.rebuildRegistry());
        // Export diffs button
        html
            .querySelector("[data-action='export-diffs']")
            ?.addEventListener("click", () => this.exportDiffs());
        // Repair all button
        html
            .querySelector("[data-action='repair-all']")
            ?.addEventListener("click", () => void this.repairAll());
        // Open template manager
        html
            .querySelector("[data-action='open-template-manager']")
            ?.addEventListener("click", () => this.openTemplateManager());
    }
    // ── Actions ───────────────────────────────────────────────────────────────
    async scanSystem() {
        if (this.isScanning)
            return;
        this.isScanning = true;
        void this.render();
        try {
            ui.notifications.info("SF3PL: Scanning game system schemas…");
            const diffs = await SchemaRegistry.rescan();
            const changed = diffs.filter((d) => !d.isCompatible).length;
            ui.notifications.info(`SF3PL: Schema scan complete. ${SchemaRegistry.getAll().length} schema(s) found, ` +
                `${changed} change(s) detected.`);
        }
        catch (err) {
            ModuleLogger.error(`[SchemaManager] Scan failed: ${String(err)}`);
            ui.notifications.error(`SF3PL: Schema scan failed. See console for details.`);
        }
        finally {
            this.isScanning = false;
            void this.render();
        }
    }
    async rebuildRegistry() {
        if (this.isScanning)
            return;
        const confirmed = await Dialog.confirm({
            title: "Rebuild Schema Registry",
            content: "<p>This will clear the cached schema data and run a full rescan. " +
                "Mapping profiles will be regenerated. Continue?</p>",
        });
        if (!confirmed)
            return;
        this.isScanning = true;
        void this.render();
        try {
            MappingProfiles.clear();
            const diffs = await SchemaRegistry.rescan();
            ui.notifications.info(`SF3PL: Schema registry rebuilt. ${diffs.length} schema(s) processed.`);
        }
        catch (err) {
            ModuleLogger.error(`[SchemaManager] Rebuild failed: ${String(err)}`);
            ui.notifications.error("SF3PL: Rebuild failed. See console for details.");
        }
        finally {
            this.isScanning = false;
            void this.render();
        }
    }
    exportDiffs() {
        const report = SchemaReporter.formatAllDiffs();
        const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sf3pl-schema-diffs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        ui.notifications.info("SF3PL: Schema diff report downloaded.");
    }
    async repairAll() {
        const records = ContentDatabase.getAll();
        if (records.length === 0) {
            ui.notifications.warn("SF3PL: No records in the database to repair.");
            return;
        }
        ui.notifications.info(`SF3PL: Repairing ${records.length} record(s)…`);
        try {
            const batchResult = RepairEngine.repairBatch(records);
            // Persist repaired records back to the database
            let saved = 0;
            for (const result of batchResult.results) {
                if (result.wasModified) {
                    await ContentDatabase.update(result.repairedRecord);
                    saved++;
                }
            }
            this.repairRows = batchResult.results.map((r) => ({
                recordId: r.recordId,
                name: r.recordName,
                category: r.category,
                actionCount: r.actionsApplied.filter((a) => a.action !== "skipped").length,
                issueCount: r.remainingIssues.length,
                wasModified: r.wasModified,
            }));
            this.activeTab = "repair";
            void this.render();
            ui.notifications.info(`SF3PL: Repair complete. ${saved} record(s) updated, ` +
                `${batchResult.unchanged} unchanged.`);
        }
        catch (err) {
            ModuleLogger.error(`[SchemaManager] Repair failed: ${String(err)}`);
            ui.notifications.error("SF3PL: Repair failed. See console for details.");
        }
    }
    openTemplateManager() {
        Promise.resolve().then(function () { return templateManager; })
            .then(({ TemplateManagerApp }) => {
            void new TemplateManagerApp().render(true);
        })
            .catch((err) => {
            ModuleLogger.error(`[SchemaManager] Could not open TemplateManager: ${String(err)}`);
        });
    }
    // ── Row builders ──────────────────────────────────────────────────────────
    schemaToRow(schema) {
        const requiredCount = schema.fields.filter((f) => f.required).length;
        return {
            key: `${schema.documentType}.${schema.subtype}`,
            documentType: schema.documentType,
            subtype: schema.subtype,
            fieldCount: schema.fields.length,
            requiredCount,
            source: schema.source,
            schemaHash: schema.schemaHash,
            discoveredAt: new Date(schema.discoveredAt).toLocaleString(),
        };
    }
    diffToRow(diff) {
        return {
            key: `${diff.documentType}.${diff.subtype}`,
            documentType: diff.documentType,
            subtype: diff.subtype,
            isCompatible: diff.isCompatible,
            added: diff.addedFields.length,
            removed: diff.removedFields.length,
            changed: diff.changedTypes.length,
            newlyRequired: diff.newlyRequired.length,
            comparedAt: new Date(diff.comparedAt).toLocaleString(),
        };
    }
    profileToRow(profile, schemas) {
        const schema = schemas.find((s) => s.documentType === profile.documentType && s.subtype === profile.sfrpgSubtype);
        let isValid = true;
        let gapCount = 0;
        let staleCount = 0;
        if (schema) {
            const validationReport = MappingValidator.validate(profile, schema);
            isValid = validationReport.isValid;
            gapCount = validationReport.missingRequiredRules.length;
            staleCount = validationReport.staleRules.length;
        }
        return {
            category: profile.category,
            documentType: profile.documentType,
            subtype: profile.sfrpgSubtype,
            ruleCount: profile.rules.length,
            schemaHash: profile.schemaHash,
            builtAt: new Date(profile.builtAt).toLocaleString(),
            isValid,
            gapCount,
            staleCount,
        };
    }
}

/**
 * Template Manager Application — Milestone 4
 *
 * A Foundry V13 ApplicationV2 window for managing DocumentTemplate registrations.
 * Users select existing SFRPG documents (from world or compendium), mark them as
 * templates, and the module learns the field structure from their system data.
 *
 * Registered templates are used by:
 *   - RepairEngine  — to fill missing rawContent fields
 *   - SchemaDiscovery.discoverFromTemplate() — to refine the registry
 *
 * Features:
 *   - List all registered templates with subtype, field count, date added
 *   - "Add Template" — opens a UUID input dialog; fetches the document
 *   - "Refresh from Template" — re-snapshots a registered document's system data
 *   - "Remove" — removes a template from the store
 *   - "Learn Schema" — calls SchemaDiscovery.discoverFromTemplate() and updates registry
 *   - "Clear All" — removes all templates (with confirmation)
 */
const { ApplicationV2: ApplicationV2$5, HandlebarsApplicationMixin: HandlebarsApplicationMixin$5 } = foundry.applications.api;
// ── TemplateManagerApp ────────────────────────────────────────────────────────
class TemplateManagerApp extends HandlebarsApplicationMixin$5(ApplicationV2$5) {
    static DEFAULT_OPTIONS = {
        id: "sf3pl-template-manager",
        title: "SF3PL: Template Manager",
        classes: ["sf3pl-app", "sf3pl-template-manager"],
        window: { resizable: true },
        position: { width: 720, height: 520 },
    };
    static PARTS = {
        main: {
            template: "modules/starfinder-thirdparty/templates/template-manager.hbs",
        },
    };
    // ── Context ───────────────────────────────────────────────────────────────
    async _prepareContext(_options) {
        const templates = TemplateStore.getAll();
        const rows = templates.map((t) => ({
            uuid: t.uuid,
            name: t.name,
            documentType: t.documentType,
            subtype: t.subtype,
            fieldCount: Object.keys(t.systemDataSnapshot).length,
            addedAt: new Date(t.addedAt).toLocaleString(),
            notes: t.notes,
            hasSchema: SchemaRegistry.has(t.documentType, t.subtype),
        }));
        return {
            rows,
            templateCount: rows.length,
            isEmpty: rows.length === 0,
            subtypesSummary: TemplateStore.getSubtypes().join(", ") || "None",
        };
    }
    // ── Event listeners ───────────────────────────────────────────────────────
    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
        html
            .querySelector("[data-action='add-template']")
            ?.addEventListener("click", () => void this.addTemplate());
        html
            .querySelector("[data-action='clear-all']")
            ?.addEventListener("click", () => void this.clearAll());
        html.querySelectorAll("[data-action='remove']").forEach((btn) => {
            btn.addEventListener("click", () => {
                const uuid = btn.closest("[data-uuid]")?.dataset.uuid;
                if (uuid)
                    void this.removeTemplate(uuid);
            });
        });
        html.querySelectorAll("[data-action='refresh']").forEach((btn) => {
            btn.addEventListener("click", () => {
                const uuid = btn.closest("[data-uuid]")?.dataset.uuid;
                if (uuid)
                    void this.refreshTemplate(uuid);
            });
        });
        html.querySelectorAll("[data-action='learn-schema']").forEach((btn) => {
            btn.addEventListener("click", () => {
                const uuid = btn.closest("[data-uuid]")?.dataset.uuid;
                if (uuid)
                    void this.learnSchema(uuid);
            });
        });
    }
    // ── Actions ───────────────────────────────────────────────────────────────
    async addTemplate() {
        const uuid = await this.promptForUuid();
        if (!uuid)
            return;
        ui.notifications.info(`SF3PL: Fetching document ${uuid}…`);
        try {
            const doc = await fromUuid(uuid);
            if (!doc) {
                ui.notifications.error(`SF3PL: No document found at UUID: ${uuid}`);
                return;
            }
            if (!doc.type) {
                ui.notifications.error("SF3PL: The selected document has no type property. Items and Actors are supported.");
                return;
            }
            const notes = await this.promptForNotes(doc.name);
            const template = TemplateStore.fromDocument(doc, notes);
            await TemplateStore.add(template);
            ui.notifications.info(`SF3PL: Template registered: ${template.name} (${template.subtype})`);
            void this.render();
        }
        catch (err) {
            ModuleLogger.error(`[TemplateManager] Failed to add template: ${String(err)}`);
            ui.notifications.error("SF3PL: Failed to add template. See console for details.");
        }
    }
    async refreshTemplate(uuid) {
        const existing = TemplateStore.get(uuid);
        if (!existing)
            return;
        try {
            const doc = await fromUuid(uuid);
            if (!doc) {
                ui.notifications.warn(`SF3PL: Document no longer exists at UUID: ${uuid}`);
                return;
            }
            const refreshed = {
                ...existing,
                systemDataSnapshot: doc.system ?? {},
                addedAt: new Date().toISOString(),
            };
            await TemplateStore.add(refreshed);
            ui.notifications.info(`SF3PL: Template refreshed: ${existing.name}`);
            void this.render();
        }
        catch (err) {
            ModuleLogger.error(`[TemplateManager] Refresh failed: ${String(err)}`);
            ui.notifications.error("SF3PL: Failed to refresh template.");
        }
    }
    async learnSchema(uuid) {
        const template = TemplateStore.get(uuid);
        if (!template)
            return;
        ui.notifications.info(`SF3PL: Learning schema from template: ${template.name}…`);
        try {
            const doc = await fromUuid(uuid);
            if (!doc) {
                ui.notifications.warn(`SF3PL: Document not found at UUID: ${uuid}`);
                return;
            }
            const docType = template.documentType;
            const schema = SchemaDiscovery.discoverFromTemplate(doc, docType);
            if (!schema) {
                ui.notifications.warn(`SF3PL: Could not discover schema from template "${template.name}".`);
                return;
            }
            await SchemaRegistry.registerTemplate(schema);
            ui.notifications.info(`SF3PL: Schema learned from "${template.name}". ` +
                `${schema.fields.length} field(s) discovered.`);
            void this.render();
        }
        catch (err) {
            ModuleLogger.error(`[TemplateManager] Learn schema failed: ${String(err)}`);
            ui.notifications.error("SF3PL: Failed to learn schema from template.");
        }
    }
    async removeTemplate(uuid) {
        const template = TemplateStore.get(uuid);
        if (!template)
            return;
        const confirmed = await Dialog.confirm({
            title: "Remove Template",
            content: `<p>Remove template "<strong>${template.name}</strong>" (${template.subtype})?</p>`,
        });
        if (!confirmed)
            return;
        await TemplateStore.remove(uuid);
        ui.notifications.info(`SF3PL: Template removed: ${template.name}`);
        void this.render();
    }
    async clearAll() {
        if (TemplateStore.count() === 0) {
            ui.notifications.info("SF3PL: No templates to clear.");
            return;
        }
        const confirmed = await Dialog.confirm({
            title: "Clear All Templates",
            content: "<p>Remove <strong>all</strong> registered templates? This cannot be undone.</p>",
        });
        if (!confirmed)
            return;
        await TemplateStore.clear();
        ui.notifications.info("SF3PL: All templates cleared.");
        void this.render();
    }
    // ── Dialogs ───────────────────────────────────────────────────────────────
    promptForUuid() {
        return new Promise((resolve) => {
            let inputEl = null;
            const d = new Dialog({
                title: "Add Template — Enter Document UUID",
                content: `
          <div class="form-group">
            <label>Document UUID</label>
            <input type="text" id="sf3pl-uuid-input"
              placeholder="e.g. Item.abc123 or Compendium.sfrpg.items.Item.xyz"
              style="width:100%; font-size:0.85rem; font-family:monospace;" />
            <p class="hint">
              Right-click any Item or Actor in Foundry and choose
              <em>Copy UUID</em> to get its UUID.
            </p>
          </div>`,
                buttons: {
                    ok: {
                        label: "Add",
                        callback: (html) => {
                            inputEl = html.querySelector("#sf3pl-uuid-input");
                            const val = inputEl?.value?.trim() ?? "";
                            resolve(val || null);
                        },
                    },
                    cancel: {
                        label: "Cancel",
                        callback: () => resolve(null),
                    },
                },
                default: "ok",
            });
            void d.render(true);
        });
    }
    promptForNotes(docName) {
        return new Promise((resolve) => {
            const d = new Dialog({
                title: `Notes for "${docName}"`,
                content: `
          <div class="form-group">
            <label>Notes (optional)</label>
            <input type="text" id="sf3pl-notes-input"
              placeholder="e.g. Standard ranged weapon template"
              style="width:100%;" />
          </div>`,
                buttons: {
                    ok: {
                        label: "Save",
                        callback: (html) => {
                            const el = html.querySelector("#sf3pl-notes-input");
                            resolve(el?.value?.trim() ?? "");
                        },
                    },
                    skip: {
                        label: "Skip",
                        callback: () => resolve(""),
                    },
                },
                default: "skip",
            });
            void d.render(true);
        });
    }
}

var templateManager = /*#__PURE__*/Object.freeze({
    __proto__: null,
    TemplateManagerApp: TemplateManagerApp
});

const MODULE_ID$3 = "starfinder-thirdparty";
const HISTORY_SETTING_KEY = "pdfImportHistory";
const MAX_HISTORY_ENTRIES = 50;
function makeQueueId() {
    return `qi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function makeInitialProgress() {
    return {
        phase: "loading",
        currentPage: 0,
        totalPages: 0,
        recordsFound: 0,
        message: "Queued",
        percent: 0,
    };
}
/**
 * Manages a queue of PDF import jobs and persists import history to Foundry
 * world settings. Supports batch processing with pause and cancel controls.
 */
class PdfImportManager {
    static queue = [];
    static history = [];
    static activeItemId = null;
    static cancelled = false;
    static paused = false;
    static initialized = false;
    static abortController = null;
    // ── Lifecycle ────────────────────────────────────────────────────────────
    /**
     * Loads import history from Foundry settings and marks the manager as ready.
     * Safe to call multiple times.
     */
    static async initialize() {
        if (this.initialized)
            return;
        await this.loadHistory();
        this.initialized = true;
        ModuleLogger.info(`[PdfImportManager] Initialized. History entries: ${this.history.length}.`);
    }
    // ── Queue management ─────────────────────────────────────────────────────
    /**
     * Adds a PDF file to the processing queue and returns the new QueueItem's id.
     *
     * @param file - The PDF File to enqueue.
     * @param sourceBook - Source book name pre-filled from user input.
     * @param publisher - Publisher name pre-filled from user input.
     * @returns The newly created QueueItem's ID.
     */
    static enqueue(file, sourceBook, publisher) {
        const item = {
            id: makeQueueId(),
            filename: file.name,
            fileSize: file.size,
            file,
            status: "queued",
            queuedAt: new Date().toISOString(),
            sourceBook,
            publisher,
            progress: makeInitialProgress(),
        };
        this.queue.push(item);
        ModuleLogger.info(`[PdfImportManager] Enqueued "${file.name}" (${item.id}).`);
        return item.id;
    }
    /**
     * Returns the current queue including all items regardless of status.
     */
    static getQueue() {
        return [...this.queue];
    }
    /**
     * Returns all import history entries, most recent first.
     */
    static getHistory() {
        return [...this.history];
    }
    /**
     * Removes all items from the queue that have a terminal status
     * (done, failed, cancelled). Items in "queued" or "processing" are kept.
     */
    static clearCompleted() {
        const before = this.queue.length;
        this.queue = this.queue.filter((item) => item.status === "queued" ||
            item.status === "processing" ||
            item.status === "paused");
        ModuleLogger.info(`[PdfImportManager] Cleared ${before - this.queue.length} completed items.`);
    }
    /**
     * Signals the manager to stop after the current item finishes processing.
     * Any queued items are moved to "cancelled" status.
     */
    static cancel() {
        this.cancelled = true;
        if (this.abortController) {
            this.abortController.abort();
        }
        for (const item of this.queue) {
            if (item.status === "queued" || item.status === "paused") {
                item.status = "cancelled";
            }
        }
        ModuleLogger.info("[PdfImportManager] Cancelled — all queued items marked cancelled.");
    }
    /**
     * Pauses queue processing after the current item finishes.
     * Queued items remain in the queue with "paused" status.
     */
    static pause() {
        this.paused = true;
        for (const item of this.queue) {
            if (item.status === "queued") {
                item.status = "paused";
            }
        }
        ModuleLogger.info("[PdfImportManager] Paused.");
    }
    /**
     * Resumes a paused queue, restoring paused items to "queued" status.
     */
    static resume() {
        this.paused = false;
        for (const item of this.queue) {
            if (item.status === "paused") {
                item.status = "queued";
            }
        }
        ModuleLogger.info("[PdfImportManager] Resumed.");
    }
    // ── Processing ───────────────────────────────────────────────────────────
    /**
     * Processes the next queued item, if any.
     */
    static async processNext(options) {
        if (this.cancelled || this.paused)
            return;
        if (this.activeItemId !== null)
            return;
        const item = this.queue.find((i) => i.status === "queued");
        if (!item || !item.file)
            return;
        this.activeItemId = item.id;
        item.status = "processing";
        item.startedAt = new Date().toISOString();
        ModuleLogger.info(`[PdfImportManager] Processing "${item.filename}" (${item.id}).`);
        let processorModule;
        try {
            processorModule = (await Promise.resolve().then(function () { return PdfProcessor$1; }));
        }
        catch (err) {
            item.status = "failed";
            item.errorMessage = `Failed to load PdfProcessor: ${String(err)}`;
            item.completedAt = new Date().toISOString();
            this.activeItemId = null;
            ModuleLogger.error(`[PdfImportManager] ${item.errorMessage}`);
            return;
        }
        const runOptions = {
            onProgress: (progress) => {
                item.progress = progress;
                options.onProgress?.(progress);
            },
        };
        if (options.enableOcr !== undefined)
            runOptions.enableOcr = options.enableOcr;
        if (options.enableAi !== undefined)
            runOptions.enableAi = options.enableAi;
        if (options.aiApiKey !== undefined)
            runOptions.aiApiKey = options.aiApiKey;
        if (this.abortController?.signal !== undefined)
            runOptions.abortSignal = this.abortController.signal;
        try {
            const result = await processorModule.PdfProcessor.process(item.file, item.sourceBook, item.publisher, runOptions);
            item.status = "done";
            item.result = result;
            item.completedAt = new Date().toISOString();
            item.file = null;
            const entry = {
                runId: result.runId,
                filename: result.sourceFile,
                sourceBook: result.sourceBook,
                publisher: result.publisher,
                extractedAt: result.extractedAt,
                totalPages: result.totalPages,
                recordsFound: result.records.length,
                recordsAccepted: 0,
                durationMs: result.durationMs,
                ocrUsed: result.ocrPages > 0,
                aiUsed: result.aiUsed,
            };
            await this.addToHistory(entry);
            ModuleLogger.info(`[PdfImportManager] Finished "${item.filename}": ` +
                `${result.records.length} records, ${result.durationMs}ms.`);
        }
        catch (err) {
            const errMsg = err?.message || String(err);
            if (errMsg === "Cancelled") {
                item.status = "cancelled";
                item.progress.phase = "cancelled";
                item.progress.message = "Cancelled by user";
                ModuleLogger.info(`[PdfImportManager] Cancelled processing "${item.filename}".`);
            }
            else {
                item.status = "failed";
                item.errorMessage = errMsg;
                item.completedAt = new Date().toISOString();
                ModuleLogger.error(`[PdfImportManager] Failed to process "${item.filename}": ${errMsg}`);
            }
            item.file = null;
        }
        finally {
            this.activeItemId = null;
        }
    }
    /**
     * Processes all queued items sequentially until the queue is empty or the
     * manager is paused or cancelled.
     */
    static async processAll(options) {
        this.cancelled = false;
        this.paused = false;
        this.abortController = new AbortController();
        while (true) {
            if (this.cancelled || this.paused)
                break;
            const hasQueued = this.queue.some((i) => i.status === "queued");
            if (!hasQueued)
                break;
            await this.processNext(options);
            if (this.cancelled)
                break;
        }
        this.abortController = null;
        ModuleLogger.info("[PdfImportManager] processAll complete.");
    }
    // ── History ───────────────────────────────────────────────────────────────
    /**
     * Appends an import history entry and persists to Foundry settings.
     * Caps the history at 50 entries.
     *
     * @param entry - The ImportHistoryEntry to add.
     */
    static async addToHistory(entry) {
        this.history.unshift(entry);
        if (this.history.length > MAX_HISTORY_ENTRIES) {
            this.history = this.history.slice(0, MAX_HISTORY_ENTRIES);
        }
        await this.persistHistory();
    }
    /**
     * Writes the current history array to Foundry world settings.
     */
    static async persistHistory() {
        try {
            await game.settings.set(MODULE_ID$3, HISTORY_SETTING_KEY, this.history);
            ModuleLogger.debug(`[PdfImportManager] Persisted ${this.history.length} history entries.`);
        }
        catch (err) {
            ModuleLogger.error(`[PdfImportManager] Failed to persist history: ${String(err)}`);
        }
    }
    /**
     * Loads import history from Foundry world settings into the in-memory cache.
     */
    static async loadHistory() {
        try {
            const raw = game.settings.get(MODULE_ID$3, HISTORY_SETTING_KEY);
            if (Array.isArray(raw)) {
                this.history = raw.slice(0, MAX_HISTORY_ENTRIES);
            }
            else {
                this.history = [];
            }
        }
        catch (err) {
            ModuleLogger.warn(`[PdfImportManager] Could not load history from settings: ${String(err)}`);
            this.history = [];
        }
    }
    // ── Serialization helpers ─────────────────────────────────────────────────
    /**
     * Returns a copy of the queue with File references removed.
     */
    static getQueueSummary() {
        return this.queue.map((item) => ({ ...item, file: null }));
    }
    /**
     * Returns the QueueItem currently being processed, or null.
     */
    static getActiveItem() {
        if (this.activeItemId === null)
            return null;
        return this.queue.find((i) => i.id === this.activeItemId) ?? null;
    }
    /**
     * Returns the number of items waiting in the queue with "queued" status.
     */
    static getPendingCount() {
        return this.queue.filter((i) => i.status === "queued").length;
    }
    /**
     * Returns true once `initialize()` has been called successfully.
     */
    static isReady() {
        return this.initialized;
    }
    /**
     * Resets all in-memory state. Intended for testing only.
     */
    static reset() {
        this.queue = [];
        this.history = [];
        this.activeItemId = null;
        this.cancelled = false;
        this.paused = false;
        this.initialized = false;
        this.abortController = null;
    }
}

/**
 * Duplicate Resolver — Milestone 6
 *
 * Provides utilities for handling naming conflicts when importing content into
 * compendium packs and the content database.
 *
 * Three policies are supported:
 *
 *   skip         — Leave the existing entry unchanged. The new record is skipped.
 *   replace      — Overwrite the existing entry with the new data.
 *   new-version  — Import with a unique versioned name suffix (e.g. "Longsword v2").
 *
 * The ConversionPipeline handles skip / replace through its `overwriteExisting`
 * flag. DuplicateResolver handles the "new-version" name generation before the
 * record is written to the database, so that downstream converters never see a
 * collision.
 */
/**
 * Generates a versioned name that does not already exist in the database.
 *
 * Algorithm:
 *   1. If `baseName` is not taken, return it unchanged.
 *   2. Otherwise try "baseName v2", "baseName v3", … up to v99.
 *   3. If all are taken (unlikely), append a timestamp suffix.
 *
 * @param baseName - The preferred name (e.g. "Longsword").
 * @param db - A reference to the ContentDatabase class (static API).
 * @returns A unique name safe to insert.
 */
class DuplicateResolver {
    static makeVersionedName(baseName, db) {
        if (!db.getByName(baseName))
            return baseName;
        for (let v = 2; v <= 99; v++) {
            const candidate = `${baseName} v${v}`;
            if (!db.getByName(candidate))
                return candidate;
        }
        return `${baseName} ${Date.now()}`;
    }
    /**
     * Determines whether an existing compendium document with the given name
     * would conflict with the supplied duplicate policy.
     *
     * Returns:
     *   "create"  — no conflict; create a new document.
     *   "update"  — conflict but policy says replace; update the document.
     *   "skip"    — conflict and policy says skip; do nothing.
     *
     * @param existingNames - Set of lowercased names already in the target pack.
     * @param name - The name of the incoming document.
     * @param policy - The active duplicate policy.
     */
    static resolveCompendiumAction(existingNames, name, policy) {
        const lower = name.toLowerCase();
        const exists = existingNames.has(lower);
        if (!exists)
            return "create";
        if (policy === "replace")
            return "update";
        return "skip";
    }
    /**
     * Builds a Set of lowercased document names from a compendium index.
     *
     * @param index - The compendium index array (each entry has a `name` field).
     */
    static buildNameSet(index) {
        return new Set(index.map((e) => e.name.toLowerCase()));
    }
}

/**
 * End-to-End Import Wizard — Milestone 6
 *
 * A single five-step ApplicationV2 wizard that chains every previous subsystem
 * into one seamless workflow:
 *
 *   Step 0: Source     — select PDFs, enter source book / publisher, configure AI
 *   Step 1: Extract    — process PDFs through PdfImportManager, live progress
 *   Step 2: Review     — accept / reject / edit extracted records
 *   Step 3: Convert    — choose duplicate policy, run ConversionPipeline, show progress
 *   Step 4: Done       — summary card with stats and compendium links
 *
 * After "Done" the user can open any compendium pack directly from the wizard.
 * All five steps are rendered from a single Handlebars template using {{#eq step N}}.
 */
const { ApplicationV2: ApplicationV2$4, HandlebarsApplicationMixin: HandlebarsApplicationMixin$4 } = foundry.applications.api;
const MODULE_ID$2 = "starfinder-thirdparty";
// ── EndToEndWizardApp ─────────────────────────────────────────────────────────
class EndToEndWizardApp extends HandlebarsApplicationMixin$4(ApplicationV2$4) {
    static DEFAULT_OPTIONS = {
        id: "sf3pl-e2e-wizard",
        title: "SF3PL: Import Wizard (End-to-End)",
        classes: ["sf3pl-app", "sf3pl-e2e-wizard"],
        window: { resizable: true },
        position: { width: 900, height: 720 },
    };
    static PARTS = {
        main: {
            template: "modules/starfinder-thirdparty/templates/end-to-end-wizard.hbs",
            scrollable: [".sf3pl-e2e-body"],
        },
    };
    // ── Wizard state ─────────────────────────────────────────────────────────────
    step = 0;
    /** Step 0 state */
    stagedFiles = [];
    globalSourceBook = "";
    globalPublisher = "";
    enableAi = false;
    /** Step 1 state */
    extractionResults = [];
    extractionProgress = 0;
    extractionPhase = "";
    isExtracting = false;
    /** Step 2 state */
    reviewEntries = [];
    reviewFilter = "all";
    /** Step 3 state */
    duplicatePolicy = "replace";
    isConverting = false;
    conversionProgress = 0;
    conversionCurrent = "";
    /** Step 4 state */
    pipelineReport = null;
    // ── Context ───────────────────────────────────────────────────────────────────
    async _prepareContext(_options) {
        const reviewFiltered = this.buildFilteredEntries();
        const reviewStatusCounts = this.buildStatusCounts();
        const resultRows = this.pipelineReport?.results.map((r) => ({
            name: r.recordName,
            category: r.category,
            disposition: r.disposition,
            packId: r.packId,
            errors: r.errors.join("; "),
            warnings: r.warnings.join("; "),
        })) ?? [];
        const stats = this.pipelineReport?.stats ?? null;
        return {
            step: this.step,
            steps: [0, 1, 2, 3, 4],
            isStep0: this.step === 0,
            isStep1: this.step === 1,
            isStep2: this.step === 2,
            isStep3: this.step === 3,
            isStep4: this.step === 4,
            // Step 0
            stagedRows: this.stagedFiles.map((f, i) => ({
                index: i,
                filename: f.file.name,
                sizeKb: (f.file.size / 1024).toFixed(0),
                sourceBook: f.sourceBook,
                publisher: f.publisher,
            })),
            hasStaged: this.stagedFiles.length > 0,
            stagedCount: this.stagedFiles.length,
            globalSourceBook: this.globalSourceBook,
            globalPublisher: this.globalPublisher,
            enableAi: this.enableAi,
            // Step 1
            isExtracting: this.isExtracting,
            extractionProgress: this.extractionProgress,
            extractionPhase: this.extractionPhase,
            extractionResultSummaries: this.extractionResults.map((r) => ({
                filename: r.sourceFile,
                totalPages: r.totalPages,
                records: r.records.length,
                ocrPages: r.ocrPages,
                errors: r.errors.length,
            })),
            totalExtracted: this.extractionResults.reduce((s, r) => s + r.records.length, 0),
            // Step 2
            reviewFilter: this.reviewFilter,
            reviewStatusCounts,
            reviewRows: reviewFiltered.map((entry, pos) => {
                const rawText = entry.record.rawText ?? "";
                const snippet = rawText.length > 0
                    ? rawText.replace(/\s+/g, " ").trim().slice(0, 140) + (rawText.length > 140 ? "…" : "")
                    : "";
                const structured = entry.record.structuredData;
                const structuredFields = structured
                    ? Object.entries(structured)
                        .filter(([k, v]) => k !== "_category" && v !== null && v !== undefined && v !== "")
                        .map(([k, v]) => ({
                        key: k,
                        value: Array.isArray(v)
                            ? v.map((x) => JSON.stringify(x)).join(", ")
                            : String(v),
                    }))
                    : [];
                return {
                    globalIndex: this.reviewEntries.indexOf(entry),
                    pos,
                    id: entry.record.id,
                    name: entry.editedName ?? entry.record.name,
                    category: CATEGORY_LABELS[(isValidCategory(entry.editedCategory ?? entry.record.category)
                        ? (entry.editedCategory ?? entry.record.category)
                        : "equipment")],
                    rawCategory: entry.editedCategory ?? entry.record.category,
                    sourceBook: entry.record.sourceBook,
                    confidence: Math.round(entry.record.confidence * 100),
                    status: entry.status,
                    notes: entry.editedNotes ?? entry.record.notes,
                    snippet,
                    rawText,
                    structuredFields,
                    hasDetails: snippet.length > 0 || structuredFields.length > 0,
                };
            }),
            totalReview: this.reviewEntries.length,
            acceptedCount: reviewStatusCounts.accepted,
            categories: Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v })),
            // Step 3
            duplicatePolicy: this.duplicatePolicy,
            isConverting: this.isConverting,
            conversionProgress: this.conversionProgress,
            conversionCurrent: this.conversionCurrent,
            acceptedForConversion: this.reviewEntries.filter((e) => e.status === "accepted" || e.status === "edited").length,
            // Step 4
            hasPipelineReport: this.pipelineReport !== null,
            stats,
            resultRows,
            failedRows: resultRows.filter((r) => r.disposition === "failed"),
            hasFailures: resultRows.some((r) => r.disposition === "failed"),
        };
    }
    // ── Render events ──────────────────────────────────────────────────────────────
    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
        this.bindCommonControls(html);
        switch (this.step) {
            case 0:
                this.bindStep0(html);
                break;
            case 1: break;
            case 2:
                this.bindStep2(html);
                break;
            case 3:
                this.bindStep3(html);
                break;
            case 4:
                this.bindStep4(html);
                break;
        }
    }
    // ── Common controls ───────────────────────────────────────────────────────────
    bindCommonControls(html) {
        html.querySelector("[data-action='prev-step']")?.addEventListener("click", () => {
            if (this.step > 0 && !this.isExtracting && !this.isConverting) {
                this.step = (this.step - 1);
                void this.render();
            }
        });
        html.querySelector("[data-action='next-step']")?.addEventListener("click", () => {
            void this.advanceStep();
        });
        html.querySelector("[data-action='restart']")?.addEventListener("click", () => {
            this.reset();
            void this.render();
        });
    }
    // ── Step 0 bindings ───────────────────────────────────────────────────────────
    bindStep0(html) {
        const dropZone = html.querySelector(".sf3pl-e2e-dropzone");
        if (dropZone) {
            dropZone.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropZone.classList.add("drag-over");
            });
            dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
            dropZone.addEventListener("drop", (e) => {
                e.preventDefault();
                dropZone.classList.remove("drag-over");
                const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
                files.forEach((f) => this.stageFile(f));
                if (files.length > 0)
                    void this.render();
            });
        }
        html.querySelector("#sf3pl-e2e-file-input")?.addEventListener("change", (e) => {
            const input = e.target;
            Array.from(input.files ?? []).forEach((f) => this.stageFile(f));
            input.value = "";
            void this.render();
        });
        html.querySelector("#sf3pl-e2e-source-book")?.addEventListener("input", (e) => {
            this.globalSourceBook = e.target.value;
            this.stagedFiles.forEach((f) => { if (!f.sourceBook)
                f.sourceBook = this.globalSourceBook; });
        });
        html.querySelector("#sf3pl-e2e-publisher")?.addEventListener("input", (e) => {
            this.globalPublisher = e.target.value;
            this.stagedFiles.forEach((f) => { if (!f.publisher)
                f.publisher = this.globalPublisher; });
        });
        html.querySelector("#sf3pl-e2e-enable-ai")?.addEventListener("change", (e) => {
            this.enableAi = e.target.checked;
        });
        html.querySelectorAll("[data-staged-source-book]").forEach((inp) => {
            inp.addEventListener("change", (e) => {
                const idx = parseInt(inp.dataset.stagedSourceBook ?? "0", 10);
                if (this.stagedFiles[idx]) {
                    this.stagedFiles[idx].sourceBook = e.target.value;
                }
            });
        });
        html.querySelectorAll("[data-staged-publisher]").forEach((inp) => {
            inp.addEventListener("change", (e) => {
                const idx = parseInt(inp.dataset.stagedPublisher ?? "0", 10);
                if (this.stagedFiles[idx]) {
                    this.stagedFiles[idx].publisher = e.target.value;
                }
            });
        });
        html.querySelectorAll("[data-action='remove-staged']").forEach((btn) => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.index ?? "0", 10);
                this.stagedFiles.splice(idx, 1);
                void this.render();
            });
        });
        html.querySelector("[data-action='apply-defaults']")?.addEventListener("click", () => {
            this.stagedFiles.forEach((f) => {
                if (this.globalSourceBook)
                    f.sourceBook = this.globalSourceBook;
                if (this.globalPublisher)
                    f.publisher = this.globalPublisher;
            });
            void this.render();
        });
    }
    // ── Step 2 bindings ───────────────────────────────────────────────────────────
    bindStep2(html) {
        html.querySelectorAll("[data-filter-status]").forEach((btn) => {
            btn.addEventListener("click", () => {
                this.reviewFilter = btn.dataset.filterStatus;
                void this.render();
            });
        });
        html.querySelector("[data-action='accept-all']")?.addEventListener("click", () => {
            this.reviewEntries.forEach((e) => { if (e.status === "pending")
                e.status = "accepted"; });
            void this.render();
        });
        html.querySelector("[data-action='reject-all']")?.addEventListener("click", () => {
            this.reviewEntries.forEach((e) => { if (e.status === "pending")
                e.status = "rejected"; });
            void this.render();
        });
        html.querySelectorAll("[data-action='toggle-detail']").forEach((btn) => {
            btn.addEventListener("click", () => {
                const idx = btn.dataset.globalIndex ?? "0";
                const detailRow = html.querySelector(`[data-detail-for="${idx}"]`);
                const icon = btn.querySelector("i");
                if (detailRow) {
                    const hidden = detailRow.classList.toggle("sf3pl-detail-hidden");
                    if (icon) {
                        icon.className = hidden ? "fas fa-chevron-down" : "fas fa-chevron-up";
                    }
                }
            });
        });
        html.querySelectorAll("[data-action='accept-record']").forEach((btn) => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.globalIndex ?? "0", 10);
                const entry = this.reviewEntries[idx];
                if (entry)
                    entry.status = "accepted";
                void this.render();
            });
        });
        html.querySelectorAll("[data-action='reject-record']").forEach((btn) => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.globalIndex ?? "0", 10);
                const entry = this.reviewEntries[idx];
                if (entry)
                    entry.status = "rejected";
                void this.render();
            });
        });
        html.querySelectorAll("[data-edit-category]").forEach((sel) => {
            sel.addEventListener("change", (e) => {
                const idx = parseInt(sel.dataset.globalIndex ?? "0", 10);
                const entry = this.reviewEntries[idx];
                if (entry) {
                    entry.editedCategory = e.target.value;
                    entry.status = "edited";
                }
            });
        });
        html.querySelectorAll("[data-edit-name]").forEach((inp) => {
            inp.addEventListener("change", (e) => {
                const idx = parseInt(inp.dataset.globalIndex ?? "0", 10);
                const entry = this.reviewEntries[idx];
                if (entry) {
                    entry.editedName = e.target.value;
                    entry.status = "edited";
                }
            });
        });
    }
    // ── Step 3 bindings ───────────────────────────────────────────────────────────
    bindStep3(html) {
        html.querySelectorAll("[name='duplicate-policy']").forEach((radio) => {
            radio.addEventListener("change", () => {
                this.duplicatePolicy = radio.value;
            });
        });
    }
    // ── Step 4 bindings ───────────────────────────────────────────────────────────
    bindStep4(html) {
        html.querySelector("[data-action='export-report']")?.addEventListener("click", () => {
            this.exportReport();
        });
    }
    // ── Step advancement ──────────────────────────────────────────────────────────
    async advanceStep() {
        switch (this.step) {
            case 0:
                await this.runExtraction();
                break;
            case 1:
                this.buildReviewEntries();
                this.step = 2;
                void this.render();
                break;
            case 2:
                this.step = 3;
                void this.render();
                break;
            case 3:
                await this.runConversion();
                break;
        }
    }
    // ── Step 1: Extraction ────────────────────────────────────────────────────────
    async runExtraction() {
        if (this.stagedFiles.length === 0) {
            ui.notifications.warn("SF3PL: Add at least one PDF before proceeding.");
            return;
        }
        this.step = 1;
        this.isExtracting = true;
        this.extractionResults = [];
        this.extractionProgress = 0;
        this.extractionPhase = "Preparing…";
        await PdfImportManager.initialize();
        for (const staged of this.stagedFiles) {
            PdfImportManager.enqueue(staged.file, staged.sourceBook || "Unknown Source", staged.publisher || "Unknown Publisher");
        }
        void this.render();
        let aiApiKey = "";
        if (this.enableAi) {
            try {
                aiApiKey = game.settings.get(MODULE_ID$2, "aiApiKey") ?? "";
            }
            catch {
                aiApiKey = "";
            }
        }
        let ocrEnabled = false;
        try {
            ocrEnabled = game.settings.get(MODULE_ID$2, "ocrEnabled") ?? false;
        }
        catch {
            ocrEnabled = false;
        }
        try {
            await PdfImportManager.processAll({
                enableOcr: ocrEnabled,
                enableAi: this.enableAi && !!aiApiKey,
                aiApiKey,
                onProgress: (progress) => {
                    this.extractionProgress = progress.percent;
                    this.extractionPhase = progress.message;
                    void this.render();
                },
            });
            const queue = PdfImportManager.getQueue();
            this.extractionResults = queue
                .filter((q) => q.status === "done" && q.result)
                .map((q) => q.result);
            const totalRecords = this.extractionResults.reduce((s, r) => s + r.records.length, 0);
            ModuleLogger.info(`[E2EWizard] Extraction done. ${totalRecords} record(s) found.`);
        }
        catch (err) {
            ModuleLogger.error(`[E2EWizard] Extraction failed: ${String(err)}`);
            ui.notifications.error("SF3PL: PDF extraction encountered an error. See console for details.");
        }
        this.isExtracting = false;
        void this.render();
    }
    // ── Step 2: Review building ───────────────────────────────────────────────────
    buildReviewEntries() {
        this.reviewEntries = this.extractionResults.flatMap((result) => result.records.map((record) => ({
            record,
            status: "pending",
        })));
        ModuleLogger.info(`[E2EWizard] Built ${this.reviewEntries.length} review entries.`);
    }
    buildFilteredEntries() {
        if (this.reviewFilter === "all")
            return this.reviewEntries;
        return this.reviewEntries.filter((e) => e.status === this.reviewFilter);
    }
    buildStatusCounts() {
        return this.reviewEntries.reduce((acc, e) => {
            acc[e.status] = (acc[e.status] ?? 0) + 1;
            return acc;
        }, { pending: 0, accepted: 0, rejected: 0, edited: 0 });
    }
    // ── Step 3: Conversion ────────────────────────────────────────────────────────
    async runConversion() {
        const toConvert = this.reviewEntries.filter((e) => e.status === "accepted" || e.status === "edited");
        if (toConvert.length === 0) {
            ui.notifications.warn("SF3PL: No records accepted. Accept records in Step 2 first.");
            return;
        }
        this.isConverting = true;
        this.conversionProgress = 0;
        this.conversionCurrent = "Saving records to database…";
        void this.render();
        await ContentDatabase.initialize();
        const contentRecords = toConvert.map((entry) => this.entryToContentRecord(entry));
        try {
            await ContentDatabase.importBatch(contentRecords, this.duplicatePolicy === "replace");
        }
        catch (err) {
            ModuleLogger.error(`[E2EWizard] Database import failed: ${String(err)}`);
            ui.notifications.error("SF3PL: Failed to save records to database.");
            this.isConverting = false;
            return;
        }
        const recordIds = contentRecords.map((r) => r.id);
        const overwrite = this.duplicatePolicy !== "skip";
        const registry = ConverterRegistry.build();
        const pipeline = new ConversionPipeline(registry);
        let processed = 0;
        const total = recordIds.length;
        try {
            this.pipelineReport = await pipeline.run({
                recordIds,
                overwriteExisting: overwrite,
                onProgress: (progress) => {
                    processed = progress.processed;
                    this.conversionProgress = total > 0 ? Math.round((processed / total) * 100) : 0;
                    this.conversionCurrent = progress.currentRecord;
                    void this.render();
                },
            });
            const stats = this.pipelineReport.stats;
            ui.notifications.info(`SF3PL: Import complete! ${stats.imported} new, ${stats.updated} updated, ` +
                `${stats.skipped} skipped, ${stats.failed} failed.`);
            ModuleLogger.info(`[E2EWizard] Pipeline done: ${JSON.stringify(stats)}`);
        }
        catch (err) {
            ModuleLogger.error(`[E2EWizard] Conversion pipeline failed: ${String(err)}`);
            ui.notifications.error("SF3PL: Conversion pipeline encountered an error. See console.");
        }
        this.isConverting = false;
        this.step = 4;
        void this.render();
    }
    // ── Helpers ───────────────────────────────────────────────────────────────────
    stageFile(file) {
        if (this.stagedFiles.some((f) => f.file.name === file.name))
            return;
        this.stagedFiles.push({
            file,
            sourceBook: this.globalSourceBook,
            publisher: this.globalPublisher,
        });
    }
    entryToContentRecord(entry) {
        const r = entry.record;
        const rawCat = entry.editedCategory ?? r.category;
        const category = isValidCategory(rawCat) ? rawCat : "equipment";
        const baseName = entry.editedName ?? r.name;
        const name = this.duplicatePolicy === "new-version"
            ? DuplicateResolver.makeVersionedName(baseName, ContentDatabase)
            : baseName;
        return {
            id: r.id,
            name,
            category,
            sourceBook: r.sourceBook,
            publisher: r.publisher,
            author: "",
            pageNumber: r.sourcePageNumber,
            tags: [...r.autoTags],
            notes: entry.editedNotes ?? r.notes,
            rawContent: { ...r.structuredData, _rawText: r.rawText },
            importedDate: new Date().toISOString(),
            importMethod: "txt",
            schemaVersion: "2.0.0",
        };
    }
    exportReport() {
        if (!this.pipelineReport)
            return;
        const json = JSON.stringify(this.pipelineReport, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sf3pl-import-report-${this.pipelineReport.runId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    reset() {
        this.step = 0;
        this.stagedFiles = [];
        this.globalSourceBook = "";
        this.globalPublisher = "";
        this.enableAi = false;
        this.extractionResults = [];
        this.extractionProgress = 0;
        this.isExtracting = false;
        this.reviewEntries = [];
        this.reviewFilter = "all";
        this.duplicatePolicy = "replace";
        this.isConverting = false;
        this.conversionProgress = 0;
        this.pipelineReport = null;
        PdfImportManager.clearCompleted();
    }
}

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
// ── Module constants ────────────────────────────────────────────────────────
const MODULE_ID$1 = "starfinder-thirdparty";
const MODULE_VERSION = "1.4.0";
const SUPPORTED_SYSTEM = "sfrpg";
// ── init hook ───────────────────────────────────────────────────────────────
Hooks.once("init", () => {
    ModuleLogger.info(`[Main] Initializing ${MODULE_ID$1} v${MODULE_VERSION}`);
    // Register module settings
    registerSettings();
    // Apply debug mode if previously set
    const debugMode = getSetting(SETTINGS.DEBUG_MODE);
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
        ModuleLogger.warn(`[Main] Module is designed for '${SUPPORTED_SYSTEM}' but current system is '${systemId}'. ` +
            "Some features may not work correctly.");
        ui.notifications.warn(`Starfinder Third Party Library: This module is designed for the Starfinder (${SUPPORTED_SYSTEM}) system.`);
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
            ui.notifications.warn(`SF3PL: ${diffs.length} schema change(s) detected since last session. ` +
                "Open Schema Manager → Diffs tab for details.");
        }
        // Eagerly build all mapping profiles now that schemas are available
        MappingProfiles.buildAll();
        ModuleLogger.info("[Main] Mapping profiles built.");
    });
    // Build the Starfinder converter registry
    const converterRegistry = ConverterRegistry.build();
    // Expose public API on the module object for macro access
    const moduleObj = game.modules.get(MODULE_ID$1);
    const api = {
        openImportWizard: () => void new ImportWizardApp().render(true),
        openContentBrowser: () => void new ContentBrowserApp().render(true),
        openSchemaManager: () => void new SchemaManagerApp().render(true),
        openTemplateManager: () => void new TemplateManagerApp().render(true),
        openPdfImportWizard: () => {
            Promise.resolve().then(function () { return pdfImportWizard; })
                .then(({ PdfImportWizardApp }) => void new PdfImportWizardApp().render(true))
                .catch((e) => ModuleLogger.error(`[Main] Failed to open PDF wizard: ${String(e)}`));
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
    ModuleLogger.info(`%c Starfinder Third Party Library v${MODULE_VERSION} ready! ` +
        "Access module API via: game.modules.get('starfinder-thirdparty').api", "color: #3a7bd5; font-weight: bold; font-size: 1.1em;");
});
// ── Scene control buttons ────────────────────────────────────────────────────
Hooks.on("getSceneControlButtons", (...args) => {
    const controls = args[0];
    if (!game.user?.isGM)
        return;
    controls.push({
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
                    Promise.resolve().then(function () { return pdfImportWizard; })
                        .then(({ PdfImportWizardApp }) => void new PdfImportWizardApp().render(true))
                        .catch((e) => ModuleLogger.error(`[Main] Failed to open PDF wizard: ${String(e)}`));
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
function registerHandlebarsHelpers() {
    // Handlebars is available globally in Foundry
    const Handlebars = globalThis["Handlebars"];
    if (!Handlebars) {
        ModuleLogger.warn("[Main] Handlebars not available; skipping helper registration.");
        return;
    }
    // {{#if (gt a b)}} — greater than comparison
    Handlebars.registerHelper("gt", (a, b) => Number(a) > Number(b));
    // {{#if (eq a b)}} — strict equality
    Handlebars.registerHelper("eq", (a, b) => a === b);
    // {{#if (includes array value)}} — array includes check
    Handlebars.registerHelper("includes", (arr, value) => {
        if (!Array.isArray(arr))
            return false;
        return arr.includes(value);
    });
    ModuleLogger.debug("[Main] Handlebars helpers registered: gt, eq, includes");
}

/**
 * Conversion Report Application — Milestone 3
 *
 * A Foundry V13 ApplicationV2 window that displays the results of a
 * ConversionPipeline run. Shows aggregate statistics (imported / updated /
 * skipped / failed) and a full per-record result table with warnings and
 * error details.
 *
 * The report can be exported as JSON for archiving or debugging.
 */
const { ApplicationV2: ApplicationV2$3, HandlebarsApplicationMixin: HandlebarsApplicationMixin$3 } = foundry.applications.api;
// ── Icons per disposition ─────────────────────────────────────────────────────
const DISPOSITION_ICONS = {
    imported: "fa-circle-check",
    updated: "fa-rotate",
    skipped: "fa-minus-circle",
    failed: "fa-circle-xmark",
};
const DISPOSITION_CSS = {
    imported: "success",
    updated: "info",
    skipped: "warning",
    failed: "error",
};
// ── ApplicationV2 class ───────────────────────────────────────────────────────
class ConversionReportApp extends HandlebarsApplicationMixin$3(ApplicationV2$3) {
    static DEFAULT_OPTIONS = {
        id: "sf3pl-conversion-report",
        title: "SF3PL: Conversion Report",
        classes: ["sf3pl-app", "sf3pl-conversion-report"],
        window: { resizable: true },
        position: { width: 800, height: 600 },
    };
    static PARTS = {
        main: { template: "modules/starfinder-thirdparty/templates/conversion-report.hbs" },
    };
    report;
    /** Active disposition filter. "all" = show everything. */
    filter = "all";
    constructor(report) {
        super();
        this.report = report;
    }
    // ── Context preparation ───────────────────────────────────────────────────
    async _prepareContext(_options) {
        const { stats, results } = this.report;
        const filtered = this.filter === "all"
            ? results
            : results.filter((r) => r.disposition === this.filter);
        const rows = filtered.map((r) => ({
            recordId: r.recordId,
            recordName: r.recordName,
            category: r.category,
            disposition: r.disposition,
            dispositionLabel: r.disposition.charAt(0).toUpperCase() + r.disposition.slice(1),
            dispositionIcon: DISPOSITION_ICONS[r.disposition],
            dispositionCss: DISPOSITION_CSS[r.disposition],
            packId: r.packId,
            documentName: r.documentName,
            warnings: r.warnings,
            errors: r.errors,
            hasWarnings: r.warnings.length > 0,
            hasErrors: r.errors.length > 0,
            hasDetails: r.warnings.length > 0 || r.errors.length > 0,
        }));
        return {
            runId: this.report.runId,
            startedAt: this.report.startedAt,
            finishedAt: this.report.finishedAt,
            elapsedMs: stats.elapsedMs,
            stats: {
                total: stats.total,
                imported: stats.imported,
                updated: stats.updated,
                skipped: stats.skipped,
                failed: stats.failed,
            },
            filterOptions: [
                { value: "all", label: `All (${stats.total})`, active: this.filter === "all" },
                { value: "imported", label: `Imported (${stats.imported})`, active: this.filter === "imported" },
                { value: "updated", label: `Updated (${stats.updated})`, active: this.filter === "updated" },
                { value: "skipped", label: `Skipped (${stats.skipped})`, active: this.filter === "skipped" },
                { value: "failed", label: `Failed (${stats.failed})`, active: this.filter === "failed" },
            ],
            rows,
            isEmpty: rows.length === 0,
            hasFailed: stats.failed > 0,
        };
    }
    // ── Render event binding ──────────────────────────────────────────────────
    _onRender(_context, _options) {
        const el = this.element;
        if (!el)
            return;
        // --- Filter tabs ---
        el.querySelectorAll("[data-filter]").forEach((btn) => {
            btn.addEventListener("click", () => {
                this.filter = btn.dataset["filter"] ?? "all";
                void this.render(true);
            });
        });
        // --- Export JSON ---
        el.querySelector("#sf3pl-report-export-json")?.addEventListener("click", () => {
            this.exportReport();
        });
        // --- Copy to clipboard ---
        el.querySelector("#sf3pl-report-copy")?.addEventListener("click", () => {
            void this.copyToClipboard();
        });
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    exportReport() {
        const json = reportToJson(this.report);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sf3pl-conversion-report-${this.report.runId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        ModuleLogger.info(`[ConversionReport] Exported report ${this.report.runId} as JSON.`);
    }
    async copyToClipboard() {
        const json = reportToJson(this.report);
        try {
            await navigator.clipboard.writeText(json);
            ui.notifications.info("Report copied to clipboard.");
        }
        catch {
            ui.notifications.warn("Clipboard copy failed. Use Export instead.");
        }
    }
}

var conversionReport = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ConversionReportApp: ConversionReportApp
});

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
// ── Helpers ───────────────────────────────────────────────────────────────────
function makeExtractionRunId() {
    return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function makeExtractedRecordId() {
    return `er_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const WORKER_SRC = "scripts/pdfjs/pdf.worker.mjs";
const KNOWN_PUBLISHERS = [
    { pattern: /paizo/i, name: "Paizo" },
    { pattern: /starjammer/i, name: "Starjammer" },
    { pattern: /rogue\s*genius/i, name: "Rogue Genius Games" },
    { pattern: /legendary\s*games/i, name: "Legendary Games" },
    { pattern: /fat\s*goblin/i, name: "Fat Goblin Games" },
    { pattern: /dreamscarred/i, name: "Dreamscarred Press" },
];
function toTitleCase(str) {
    return str
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}
/**
 * Extracts bibliographic metadata from a PDF.js document proxy, including
 * title, author, date fields, and heuristic guesses for source book and
 * publisher names used throughout the extraction pipeline.
 */
class PdfMetadataExtractor {
    /**
     * Extracts PdfFileMetadata from a PDF.js PDFDocumentProxy.
     * Calls `pdfDoc.getMetadata()` and normalises the returned info object.
     *
     * @param pdfDoc - A PDF.js PDFDocumentProxy instance (typed as unknown for
     *   compatibility with the untyped pdfjsLib global).
     * @param filename - Original filename used as a fallback for title guessing.
     * @returns Resolved PdfFileMetadata for the document.
     */
    static async extract(pdfDoc, filename) {
        const doc = pdfDoc;
        let info = {};
        let pageCount = 0;
        try {
            const result = await doc.getMetadata();
            info = (result.info ?? {});
            pageCount = doc.numPages;
        }
        catch (err) {
            ModuleLogger.warn(`[PdfMetadataExtractor] Could not read metadata from "${filename}": ${String(err)}`);
            try {
                pageCount = doc.numPages;
            }
            catch {
                pageCount = 0;
            }
        }
        const title = typeof info.Title === "string" && info.Title.trim().length > 0
            ? info.Title.trim()
            : undefined;
        const author = typeof info.Author === "string" && info.Author.trim().length > 0
            ? info.Author.trim()
            : undefined;
        const subject = typeof info.Subject === "string" && info.Subject.trim().length > 0
            ? info.Subject.trim()
            : undefined;
        const creator = typeof info.Creator === "string" && info.Creator.trim().length > 0
            ? info.Creator.trim()
            : undefined;
        const producer = typeof info.Producer === "string" && info.Producer.trim().length > 0
            ? info.Producer.trim()
            : undefined;
        const creationDate = typeof info.CreationDate === "string"
            ? this.parsePdfDate(info.CreationDate)
            : undefined;
        const modificationDate = typeof info.ModDate === "string"
            ? this.parsePdfDate(info.ModDate)
            : undefined;
        const result = {
            pageCount,
            guessedSourceBook: this.guessSourceBook(title, filename),
            guessedPublisher: this.guessPublisher(author, producer),
        };
        if (title !== undefined)
            result.title = title;
        if (author !== undefined)
            result.author = author;
        if (subject !== undefined)
            result.subject = subject;
        if (creator !== undefined)
            result.creator = creator;
        if (producer !== undefined)
            result.producer = producer;
        if (creationDate !== undefined)
            result.creationDate = creationDate;
        if (modificationDate !== undefined)
            result.modificationDate = modificationDate;
        return result;
    }
    /**
     * Convenience method that opens a PDF from an ArrayBuffer solely to read
     * its metadata, then immediately destroys the document.
     * Callers that already hold a pdfDoc reference should prefer `extract()`.
     *
     * @param buffer - Raw PDF bytes.
     * @param filename - Original filename used as a fallback for title guessing.
     * @returns Resolved PdfFileMetadata, or a filename-derived fallback on error.
     */
    static async extractFromBuffer(buffer, filename) {
        const pdfjsLib = globalThis["pdfjsLib"];
        if (!pdfjsLib) {
            ModuleLogger.warn("[PdfMetadataExtractor] pdfjsLib not available; returning filename-based fallback metadata.");
            return this.buildFallback(filename, 0);
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        try {
            const pdfDoc = await loadingTask.promise;
            const metadata = await this.extract(pdfDoc, filename);
            pdfDoc.destroy();
            return metadata;
        }
        catch (err) {
            ModuleLogger.warn(`[PdfMetadataExtractor] Failed to open PDF for metadata extraction: ${String(err)}`);
            return this.buildFallback(filename, 0);
        }
    }
    /**
     * Derives a human-readable source book name from PDF title metadata or,
     * if the title is absent or shorter than the filename stem, from the
     * filename itself.
     *
     * @param title - The Title field from PDF info, if present.
     * @param filename - The original filename.
     * @returns A title-cased source book name.
     */
    static guessSourceBook(title, filename) {
        const filenameStem = filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();
        if (title && title.length > 3 && title.length >= filenameStem.length) {
            return title;
        }
        return toTitleCase(filenameStem);
    }
    /**
     * Attempts to identify the publisher by matching the Author and Producer
     * metadata fields against a list of known Starfinder/Pathfinder publishers.
     *
     * @param author - The Author field from PDF info.
     * @param producer - The Producer field from PDF info (often the PDF tool).
     * @returns Matched publisher name, or "Unknown Publisher".
     */
    static guessPublisher(author, producer) {
        const haystack = `${author ?? ""} ${producer ?? ""}`;
        for (const { pattern, name } of KNOWN_PUBLISHERS) {
            if (pattern.test(haystack))
                return name;
        }
        return "Unknown Publisher";
    }
    /**
     * Converts a PDF date string in the format "D:YYYYMMDDHHmmSS[±HH'mm']"
     * to an ISO 8601 string. Returns the original string if parsing fails.
     */
    static parsePdfDate(pdfDate) {
        const match = pdfDate.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
        if (!match)
            return pdfDate;
        const [, y, mo, d, h, mi, s] = match;
        try {
            return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).toISOString();
        }
        catch {
            return pdfDate;
        }
    }
    static buildFallback(filename, pageCount) {
        const stem = filename.replace(/\.pdf$/i, "");
        return {
            pageCount,
            guessedSourceBook: toTitleCase(stem),
            guessedPublisher: "Unknown Publisher",
        };
    }
}

const OCR_TEXT_THRESHOLD = 50;
/**
 * Candidate paths / URLs tried in order when loading PDF.js.
 *
 * 1. Foundry VTT V13 bundles PDF.js at /scripts/pdfjs/pdf.mjs  (preferred — no CDN needed).
 * 2. Older Foundry builds used pdf.min.mjs.
 * 3. CDN fallback so the feature still works if Foundry ever moves the files.
 *
 * Each entry is [libUrl, workerUrl].
 */
const PDFJS_CANDIDATES = [
    ["/scripts/pdfjs/pdf.mjs", "/scripts/pdfjs/pdf.worker.mjs"],
    ["/scripts/pdfjs/pdf.min.mjs", "/scripts/pdfjs/pdf.worker.min.mjs"],
    [
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs",
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs",
    ],
];
let _pdfjsLibCache = null;
/**
 * Resolves the PDF.js library, trying in order:
 *   1. globalThis.pdfjsLib  (set if something already loaded it)
 *   2. Dynamic import from Foundry's bundled copy (/scripts/pdfjs/pdf.mjs)
 *   3. Dynamic import from CDN (fallback)
 *
 * The result is cached so subsequent calls are free.
 */
async function getPdfjsLib() {
    if (_pdfjsLibCache)
        return _pdfjsLibCache;
    const existing = globalThis["pdfjsLib"];
    if (existing?.getDocument) {
        ModuleLogger.info("[PdfTextExtractor] Using pdfjsLib from globalThis.");
        _pdfjsLibCache = existing;
        return existing;
    }
    for (const [libUrl, workerUrl] of PDFJS_CANDIDATES) {
        try {
            const mod = await import(/* @vite-ignore */ libUrl);
            const defaultExport = ("default" in mod) ? mod["default"] : undefined;
            const lib = (defaultExport && typeof defaultExport.getDocument === "function")
                ? defaultExport
                : mod;
            if (typeof lib?.getDocument !== "function")
                continue;
            lib.GlobalWorkerOptions.workerSrc = workerUrl;
            ModuleLogger.info(`[PdfTextExtractor] Loaded PDF.js from: ${libUrl}`);
            _pdfjsLibCache = lib;
            return lib;
        }
        catch (err) {
            ModuleLogger.debug(`[PdfTextExtractor] Could not load PDF.js from ${libUrl}: ${String(err)}`);
        }
    }
    throw new Error("[PdfTextExtractor] Could not load PDF.js from any source. " +
        "Ensure Foundry VTT is up to date or check your network connection for CDN fallback.");
}
/**
 * Extracts raw text content from PDF files using the PDF.js library bundled
 * with Foundry VTT. This is the first stage of the PDF processing pipeline.
 *
 * Pages with fewer than 50 characters of extracted text have their textLength
 * set accordingly, signalling downstream processors that OCR may be required.
 */
class PdfTextExtractor {
    /**
     * Reads a browser File object and extracts text from every page.
     *
     * @param file - The PDF File to process.
     * @param onProgress - Optional progress callback.
     * @returns Resolved PdfDocument containing metadata and pages.
     */
    static async extractFromFile(file, onProgress) {
        const reader = new FileReader();
        const arrayBuffer = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
        const pdfjsLib = await getPdfjsLib();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        let pdfDoc;
        try {
            pdfDoc = await loadingTask.promise;
        }
        catch (err) {
            if (err && err.name === "PasswordException") {
                throw new Error("Failed to extract text: The PDF is password-protected or encrypted.");
            }
            else if (err && err.name === "InvalidPDFException") {
                throw new Error("Failed to extract text: The PDF file is invalid or corrupt.");
            }
            else {
                throw new Error(`Failed to extract text: ${err?.message || String(err)}`);
            }
        }
        const totalPages = pdfDoc.numPages;
        const pages = [];
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
                let lastY = null;
                for (const item of textContent.items) {
                    if ("str" in item) {
                        const textItem = item;
                        if (lastY !== null && textItem.transform && Math.abs(textItem.transform[5] - lastY) > 2) {
                            rawText += "\n";
                        }
                        else if (rawText.length > 0 && !rawText.endsWith(" ") && !rawText.endsWith("\n")) {
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
                const wordCount = textLength > 0
                    ? text.split(/\s+/).filter((w) => w.length > 0).length
                    : 0;
                if (textLength < OCR_TEXT_THRESHOLD) {
                    ModuleLogger.debug(`[PdfTextExtractor] Page ${pageNum} of "${file.name}" has sparse text ` +
                        `(${textLength} chars) — may need OCR.`);
                }
                pages.push({
                    pageNumber: pageNum,
                    text,
                    textLength,
                    wasOcr: false,
                    wordCount,
                });
            }
            catch (err) {
                ModuleLogger.warn(`[PdfTextExtractor] Failed to extract page ${pageNum} of "${file.name}": ${String(err)}`);
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
        }
        catch {
            // non-fatal cleanup failure
        }
        ModuleLogger.info(`[PdfTextExtractor] Extracted text from ${pages.length} pages of "${file.name}".`);
        return {
            filename: file.name,
            metadata,
            pages,
            usedOcr: false,
            averageOcrConfidence: 0,
        };
    }
}

/**
 * Scans the text content of extracted PDF pages and segments it into discrete
 * content blocks. Each block represents one logical entry (stat block, heading,
 * paragraph, table, etc.) ready for downstream classification.
 */
class PdfPageScanner {
    /**
     * Processes all pages and returns a flat ordered list of content blocks.
     * Pages with fewer than 20 characters of text are skipped.
     *
     * @param pages - Array of PdfPage objects from PdfTextExtractor.
     * @param sourceBook - The name of the source book.
     * @returns All content blocks across the document, in page order.
     */
    static scanPages(pages, _sourceBook) {
        const blocks = [];
        const STAT_LINE_PATTERN = /^(?:Type|Level|CR|Category|Class|School|Hit\s*Points|HP|EAC|KAC|Fort|Ref|Will)\s*:/i;
        for (const page of pages) {
            if (page.textLength < 20)
                continue;
            const lines = page.text.split("\n");
            let currentBlockLines = [];
            let startLine = 1;
            const flushCurrentBlock = (lineIndex) => {
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

// ── Lazy-imported module shapes ──────────────────────────────────────────────
function emit(onProgress, progress) {
    try {
        onProgress?.(progress);
    }
    catch {
        // never let a progress callback crash the pipeline
    }
}
function checkAbort(signal) {
    if (signal?.aborted) {
        throw new Error("Cancelled");
    }
}
/**
 * Orchestrates the full PDF → ExtractedRecord pipeline.
 */
class PdfProcessor {
    /**
     * Processes a single PDF file through the full extraction pipeline.
     *
     * @param file - The browser File object to process.
     * @param sourceBook - The name of the source book.
     * @param publisher - The name of the publisher.
     * @param options - Pipeline configuration.
     * @returns Resolved ExtractionResult.
     */
    static async process(file, sourceBook, publisher, options) {
        const startTime = Date.now();
        const runId = makeExtractionRunId();
        const errors = [];
        const allRecords = [];
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
        }
        catch (err) {
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
                let ocrModule;
                try {
                    ocrModule = await Promise.resolve().then(function () { return OcrManager$1; });
                    await ocrModule.OcrManager.initialize();
                }
                catch (err) {
                    ModuleLogger.warn(`[PdfProcessor] OcrManager not available — skipping OCR: ${String(err)}`);
                    errors.push({
                        page: 0,
                        phase: "ocr",
                        message: `OcrManager unavailable: ${String(err)}`,
                        code: "OCR_INITIALIZE_FAILED",
                    });
                }
                if (ocrModule) {
                    try {
                        const pdfjsLib = globalThis.pdfjsLib;
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
                                            wordCount: ocrText.split(/\s+/).filter((w) => w.length > 0).length,
                                        };
                                    }
                                    ocrConfidenceSum += result.confidence;
                                    ocrPageCount++;
                                }
                            }
                            catch (err) {
                                ModuleLogger.warn(`[PdfProcessor] OCR failed for page ${page.pageNumber}: ${String(err)}`);
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
                        }
                        catch {
                            // ignore destroy failures
                        }
                    }
                    catch (err) {
                        ModuleLogger.warn(`[PdfProcessor] PDF loading for OCR failed: ${String(err)}`);
                        errors.push({
                            page: 0,
                            phase: "ocr",
                            message: `PDF load failed for OCR: ${String(err)}`,
                            code: "PDF_LOAD_OCR_FAILED",
                        });
                    }
                    finally {
                        try {
                            ocrModule.OcrManager.terminate();
                        }
                        catch {
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
        let classifierModule = null;
        try {
            classifierModule = await Promise.resolve().then(function () { return ContentClassifier$1; });
        }
        catch (err) {
            ModuleLogger.warn(`[PdfProcessor] ContentClassifier not available: ${String(err)}`);
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
                    const category = match.structuredData._category || "journal";
                    allRecords.push(this.buildRecord(match, category, sourceBook, publisher, "regex"));
                }
            }
            catch (err) {
                ModuleLogger.warn(`[PdfProcessor] Classification failed: ${String(err)}`);
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
            let aiModule = null;
            let aiProviderModule = null;
            try {
                aiModule = await Promise.resolve().then(function () { return AiExtractionEngine$1; });
                aiProviderModule = await Promise.resolve().then(function () { return AiProvider; });
            }
            catch (err) {
                ModuleLogger.warn(`[PdfProcessor] AiExtractionEngine not available: ${String(err)}`);
                errors.push({
                    page: 0,
                    phase: "ai",
                    message: `AiExtractionEngine unavailable: ${String(err)}`,
                    code: "AI_ENGINE_UNAVAILABLE",
                });
            }
            if (aiModule && aiProviderModule) {
                try {
                    const provider = new aiProviderModule.OpenAiCompatibleProvider("https://api.openai.com", options.aiApiKey, options.aiModel || "gpt-4o-mini");
                    const aiEngine = new aiModule.AiExtractionEngine(provider);
                    const refined = await aiEngine.refineBatch(allRecords, sourceBook, (done, total) => {
                        checkAbort(abortSignal);
                        emit(onProgress, {
                            phase: "ai-refining",
                            currentPage: done > 0 && done <= allRecords.length ? allRecords[done - 1].sourcePageNumber : 0,
                            totalPages,
                            recordsFound: allRecords.length,
                            message: `AI refining record ${done} of ${total}`,
                            percent: 75 + Math.round((done / total) * 15),
                        });
                    });
                    allRecords.length = 0;
                    allRecords.push(...refined);
                    aiUsed = true;
                }
                catch (err) {
                    ModuleLogger.warn(`[PdfProcessor] AI refinement failed: ${String(err)}`);
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
        const averageOcrConfidence = ocrPageCount > 0 ? ocrConfidenceSum / ocrPageCount : 0;
        const result = {
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
        ModuleLogger.info(`[PdfProcessor] Completed "${file.name}" in ${result.durationMs}ms: ` +
            `${allRecords.length} records, ${errors.length} errors, OCR pages: ${ocrPageCount}`);
        return result;
    }
    /**
     * Assembles an ExtractedRecord from a detector match and run-level metadata.
     */
    static buildRecord(match, category, sourceBook, publisher, source) {
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

var PdfProcessor$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    PdfProcessor: PdfProcessor
});

/**
 * PDF Import Wizard — Milestone 5
 *
 * A Foundry V13 ApplicationV2 window for uploading and processing PDF files.
 * Provides drag-and-drop upload, per-file metadata input, a processing queue
 * with live progress, and a history of completed imports.
 *
 * Workflow:
 *   1. User drops one or more PDF files onto the drop zone.
 *   2. User fills in Source Book and Publisher for each file (or global defaults).
 *   3. User clicks "Process PDFs".
 *   4. Each PDF is queued through PdfImportManager; progress is shown live.
 *   5. On completion, "Review Extracted Records" button opens ExtractionReviewApp.
 */
const { ApplicationV2: ApplicationV2$2, HandlebarsApplicationMixin: HandlebarsApplicationMixin$2 } = foundry.applications.api;
const MODULE_ID = "starfinder-thirdparty";
// ── Phase labels ──────────────────────────────────────────────────────────────
const PHASE_LABELS = {
    loading: "Loading PDF…",
    "extracting-text": "Extracting text…",
    ocr: "Running OCR…",
    detecting: "Detecting content…",
    "ai-refining": "AI refinement…",
    "building-records": "Building records…",
    done: "Complete",
    cancelled: "Cancelled",
    error: "Error",
};
// ── PdfImportWizardApp ────────────────────────────────────────────────────────
class PdfImportWizardApp extends HandlebarsApplicationMixin$2(ApplicationV2$2) {
    static DEFAULT_OPTIONS = {
        id: "sf3pl-pdf-import-wizard",
        title: "SF3PL: PDF Import Wizard",
        classes: ["sf3pl-app", "sf3pl-pdf-wizard"],
        window: { resizable: true },
        position: { width: 760, height: 620 },
    };
    static PARTS = {
        main: {
            template: "modules/starfinder-thirdparty/templates/pdf-import-wizard.hbs",
        },
    };
    /** Active tab: "queue" | "history" */
    activeTab = "queue";
    /** Pending files staged before processing. */
    stagedFiles = [];
    /** Global defaults applied to all staged files. */
    globalSourceBook = "";
    globalPublisher = "";
    /** Last completed ExtractionResult available for review. */
    lastResult = null;
    /** Whether a processing run is active. */
    isProcessing = false;
    // ── Context ───────────────────────────────────────────────────────────────
    async _prepareContext(_options) {
        await PdfImportManager.initialize();
        const queue = PdfImportManager.getQueue();
        const history = PdfImportManager.getHistory();
        const queueRows = queue.map((item) => this.buildQueueRow(item));
        const historyRows = history
            .slice()
            .reverse()
            .map((h) => ({
            ...h,
            date: new Date(h.extractedAt).toLocaleString(),
            durationSec: (h.durationMs / 1000).toFixed(1),
        }));
        const stagedRows = this.stagedFiles.map((f, i) => ({
            index: i,
            filename: f.file.name,
            sizeKb: (f.file.size / 1024).toFixed(0),
            sourceBook: f.sourceBook,
            publisher: f.publisher,
        }));
        return {
            activeTab: this.activeTab,
            isProcessing: this.isProcessing,
            hasStaged: this.stagedFiles.length > 0,
            stagedCount: this.stagedFiles.length,
            stagedRows,
            globalSourceBook: this.globalSourceBook,
            globalPublisher: this.globalPublisher,
            queue: {
                rows: queueRows,
                isEmpty: queueRows.length === 0,
                hasDone: queueRows.some((r) => r.status === "done"),
                hasResult: this.lastResult !== null,
                resultRecords: this.lastResult?.records.length ?? 0,
            },
            history: {
                rows: historyRows,
                isEmpty: historyRows.length === 0,
            },
        };
    }
    // ── Event listeners ───────────────────────────────────────────────────────
    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
        // Tabs
        html.querySelectorAll("[data-tab]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const tab = btn.dataset.tab;
                if (tab) {
                    this.activeTab = tab;
                    void this.render();
                }
            });
        });
        // Drag-and-drop zone
        const dropZone = html.querySelector(".sf3pl-pdf-dropzone");
        if (dropZone) {
            dropZone.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropZone.classList.add("drag-over");
            });
            dropZone.addEventListener("dragleave", () => {
                dropZone.classList.remove("drag-over");
            });
            dropZone.addEventListener("drop", (e) => {
                e.preventDefault();
                dropZone.classList.remove("drag-over");
                const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
                files.forEach((f) => this.stageFile(f));
                if (files.length > 0)
                    void this.render();
            });
        }
        // File picker
        html
            .querySelector("#sf3pl-pdf-file-input")
            ?.addEventListener("change", (e) => {
            const input = e.target;
            Array.from(input.files ?? []).forEach((f) => this.stageFile(f));
            input.value = "";
            void this.render();
        });
        // Global defaults
        html
            .querySelector("#sf3pl-global-source-book")
            ?.addEventListener("input", (e) => {
            this.globalSourceBook = e.target.value;
            this.stagedFiles.forEach((f) => { if (!f.sourceBook)
                f.sourceBook = this.globalSourceBook; });
        });
        html
            .querySelector("#sf3pl-global-publisher")
            ?.addEventListener("input", (e) => {
            this.globalPublisher = e.target.value;
            this.stagedFiles.forEach((f) => { if (!f.publisher)
                f.publisher = this.globalPublisher; });
        });
        // Per-file source book / publisher edits
        html.querySelectorAll("[data-staged-source-book]").forEach((inp) => {
            inp.addEventListener("change", (e) => {
                const idx = parseInt(inp.dataset.stagedSourceBook ?? "0", 10);
                if (this.stagedFiles[idx]) {
                    this.stagedFiles[idx].sourceBook = e.target.value;
                }
            });
        });
        html.querySelectorAll("[data-staged-publisher]").forEach((inp) => {
            inp.addEventListener("change", (e) => {
                const idx = parseInt(inp.dataset.stagedPublisher ?? "0", 10);
                if (this.stagedFiles[idx]) {
                    this.stagedFiles[idx].publisher = e.target.value;
                }
            });
        });
        // Remove staged file
        html.querySelectorAll("[data-action='remove-staged']").forEach((btn) => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.index ?? "0", 10);
                this.stagedFiles.splice(idx, 1);
                void this.render();
            });
        });
        // Apply global defaults to all staged
        html
            .querySelector("[data-action='apply-global']")
            ?.addEventListener("click", () => {
            this.stagedFiles.forEach((f) => {
                if (this.globalSourceBook)
                    f.sourceBook = this.globalSourceBook;
                if (this.globalPublisher)
                    f.publisher = this.globalPublisher;
            });
            void this.render();
        });
        // Process button
        html
            .querySelector("[data-action='process']")
            ?.addEventListener("click", () => void this.processStagedFiles());
        // Cancel
        html
            .querySelector("[data-action='cancel']")
            ?.addEventListener("click", () => {
            PdfImportManager.cancel();
            this.isProcessing = false;
            void this.render();
        });
        // Clear completed
        html
            .querySelector("[data-action='clear-completed']")
            ?.addEventListener("click", () => {
            PdfImportManager.clearCompleted();
            void this.render();
        });
        // Review extracted records
        html
            .querySelector("[data-action='review-results']")
            ?.addEventListener("click", () => this.openReview());
    }
    // ── Actions ───────────────────────────────────────────────────────────────
    stageFile(file) {
        if (this.stagedFiles.some((f) => f.file.name === file.name))
            return;
        this.stagedFiles.push({
            file,
            sourceBook: this.globalSourceBook,
            publisher: this.globalPublisher,
        });
    }
    async processStagedFiles() {
        if (this.stagedFiles.length === 0) {
            ui.notifications.warn("SF3PL: No PDF files staged. Drop files onto the import area first.");
            return;
        }
        this.isProcessing = true;
        this.activeTab = "queue";
        // Enqueue all staged files
        for (const staged of this.stagedFiles) {
            PdfImportManager.enqueue(staged.file, staged.sourceBook || "Unknown Source", staged.publisher || "Unknown Publisher");
        }
        this.stagedFiles = [];
        // Get AI settings from module settings
        const aiApiKey = this.getAiApiKey();
        // Kick off processing
        void this.render();
        try {
            await PdfImportManager.processAll({
                enableOcr: this.getOcrEnabled(),
                enableAi: !!aiApiKey,
                aiApiKey,
                onProgress: (_progress) => {
                    void this.render();
                },
            });
            // Find the last successful result
            const queue = PdfImportManager.getQueue();
            const lastDone = queue.filter((q) => q.status === "done").pop();
            this.lastResult = lastDone?.result ?? null;
            ui.notifications.info(`SF3PL: PDF processing complete. ` +
                `${this.lastResult?.records.length ?? 0} record(s) extracted.`);
        }
        catch (err) {
            ModuleLogger.error(`[PdfImportWizard] Processing failed: ${String(err)}`);
            ui.notifications.error("SF3PL: PDF processing encountered an error. See console for details.");
        }
        finally {
            this.isProcessing = false;
            void this.render();
        }
    }
    openReview() {
        if (!this.lastResult)
            return;
        Promise.resolve().then(function () { return extractionReview; })
            .then(({ ExtractionReviewApp }) => {
            void new ExtractionReviewApp(this.lastResult).render(true);
        })
            .catch((err) => {
            ModuleLogger.error(`[PdfImportWizard] Could not open review: ${String(err)}`);
        });
    }
    // ── Settings helpers ──────────────────────────────────────────────────────
    getAiApiKey() {
        try {
            return game.settings.get(MODULE_ID, "aiApiKey") ?? "";
        }
        catch {
            return "";
        }
    }
    getOcrEnabled() {
        try {
            return game.settings.get(MODULE_ID, "ocrEnabled") ?? false;
        }
        catch {
            return false;
        }
    }
    // ── Row builders ──────────────────────────────────────────────────────────
    buildQueueRow(item) {
        const pct = item.progress?.percent ?? 0;
        const phaseLabel = PHASE_LABELS[item.progress?.phase ?? ""] ?? "Queued";
        return {
            id: item.id,
            filename: item.filename,
            sizeKb: (item.fileSize / 1024).toFixed(0),
            status: item.status,
            sourceBook: item.sourceBook,
            publisher: item.publisher,
            percent: pct,
            phaseLabel,
            recordsFound: item.progress?.recordsFound ?? 0,
            resultRecords: item.result?.records.length ?? 0,
            errorMessage: item.errorMessage ?? "",
            queuedAt: new Date(item.queuedAt).toLocaleTimeString(),
        };
    }
}

var pdfImportWizard = /*#__PURE__*/Object.freeze({
    __proto__: null,
    PdfImportWizardApp: PdfImportWizardApp
});

class NullOcrProvider {
    name = "null";
    isAvailable() {
        return false;
    }
    initialize() {
        return Promise.resolve();
    }
    recognizePage(_imageData) {
        return Promise.resolve({
            pageNumber: 0,
            text: "",
            confidence: 0,
            durationMs: 0
        });
    }
    terminate() { }
}

class TesseractProvider {
    name = "tesseract";
    worker = null;
    isAvailable() {
        const g = globalThis;
        return g.Tesseract !== undefined;
    }
    async initialize() {
        if (this.worker) {
            return;
        }
        await this.loadTesseractScript();
        const g = globalThis;
        if (!g.Tesseract) {
            throw new Error("Tesseract.js script loaded but global Tesseract object not found.");
        }
        this.worker = await g.Tesseract.createWorker("eng");
    }
    async recognizePage(imageData) {
        if (!this.worker) {
            throw new Error("Tesseract provider is not initialized.");
        }
        const start = Date.now();
        const result = await this.worker.recognize(imageData);
        const durationMs = Date.now() - start;
        return {
            pageNumber: 0,
            text: result.data.text || "",
            confidence: result.data.confidence || 0,
            durationMs
        };
    }
    terminate() {
        if (this.worker) {
            this.worker.terminate().catch(() => { });
            this.worker = null;
        }
    }
    async loadTesseractScript() {
        const g = globalThis;
        if (g.Tesseract) {
            return;
        }
        return new Promise((resolve, reject) => {
            const cdnUrl = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
            const existing = document.querySelector(`script[src="${cdnUrl}"]`);
            if (existing) {
                const interval = setInterval(() => {
                    const innerG = globalThis;
                    if (innerG.Tesseract) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
                return;
            }
            const script = document.createElement("script");
            script.src = cdnUrl;
            script.async = true;
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error("Timeout loading Tesseract.js from CDN"));
            }, 30000);
            script.onload = () => {
                const innerG = globalThis;
                if (innerG.Tesseract) {
                    clearTimeout(timeout);
                    resolve();
                }
                else {
                    const poll = setInterval(() => {
                        const pollG = globalThis;
                        if (pollG.Tesseract) {
                            clearInterval(poll);
                            clearTimeout(timeout);
                            resolve();
                        }
                    }, 50);
                    setTimeout(() => {
                        clearInterval(poll);
                        clearTimeout(timeout);
                        reject(new Error("Tesseract loaded but global object was not set"));
                    }, 2000);
                }
            };
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error("Failed to load Tesseract.js script"));
            };
            document.head.appendChild(script);
        });
    }
}

class OcrManager {
    static provider = null;
    static async initialize(preferTesseract = true) {
        if (preferTesseract) {
            OcrManager.provider = new TesseractProvider();
        }
        else {
            OcrManager.provider = new NullOcrProvider();
        }
        await OcrManager.provider.initialize();
    }
    static async recognizePage(page, pageNumber) {
        if (!OcrManager.provider) {
            throw new Error("OCR provider is not initialized.");
        }
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const canvasContext = canvas.getContext("2d");
        if (!canvasContext) {
            throw new Error("Could not get 2D rendering context.");
        }
        await page.render({ canvasContext, viewport }).promise;
        const result = await OcrManager.provider.recognizePage(canvas);
        return {
            ...result,
            pageNumber
        };
    }
    static terminate() {
        if (OcrManager.provider) {
            OcrManager.provider.terminate();
            OcrManager.provider = null;
        }
    }
    static isAvailable() {
        return OcrManager.provider !== null && OcrManager.provider.isAvailable();
    }
}

var OcrManager$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    OcrManager: OcrManager
});

class WeaponDetector {
    category = "weapon";
    canDetect(text) {
        const lowercase = text.toLowerCase();
        const hasDamage = lowercase.includes("damage");
        const hasRange = lowercase.includes("range");
        const hasCapacity = lowercase.includes("capacity");
        const hasUsage = lowercase.includes("usage");
        const hasLevel = /level\s+\d+/i.test(lowercase);
        let score = 0;
        if (hasDamage)
            score += 2;
        if (hasRange)
            score += 1;
        if (hasCapacity)
            score += 1;
        if (hasUsage)
            score += 1;
        if (hasLevel)
            score += 1;
        const hasCategory = /\b(small arm|long arm|heavy weapon|sniper weapon|melee weapon|grenade|basic melee|advanced melee|small arms|long arms)\b/i.test(lowercase);
        if (hasCategory)
            score += 2;
        return score >= 3;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text)) {
            return [];
        }
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            return [];
        }
        let name = lines[0];
        const cleanLines = [];
        for (const line of lines) {
            if (/^level\s+(\d+)/i.test(line)) {
                continue;
            }
            cleanLines.push(line);
        }
        if (cleanLines.length > 0 && /^[A-Z0-9\s,\-–']{3,}$/.test(cleanLines[0])) {
            name = cleanLines[0];
        }
        let level = 1;
        const levelMatch = text.match(/\blevel\s+(\d+)/i);
        if (levelMatch) {
            level = parseInt(levelMatch[1], 10);
        }
        let damage = "";
        const damageMatch = text.match(/damage\s+([^;\n]+)/i);
        if (damageMatch) {
            damage = damageMatch[1].trim();
        }
        let damageType = "";
        if (damage) {
            const diceMatch = damage.match(/(\d+d\d+(?:\+\d+)?)\s*([A-Za-z& ]*)/i);
            if (diceMatch && diceMatch[2]) {
                damageType = diceMatch[2].trim();
            }
        }
        let range = "";
        const rangeMatch = text.match(/range\s+([^;\n]+)/i);
        if (rangeMatch) {
            range = rangeMatch[1].trim();
        }
        let capacity = "";
        const capacityMatch = text.match(/capacity\s+([^;\n]+)/i);
        if (capacityMatch) {
            capacity = capacityMatch[1].trim();
        }
        let usage = "";
        const usageMatch = text.match(/usage\s+([^;\n]+)/i);
        if (usageMatch) {
            usage = usageMatch[1].trim();
        }
        let bulk = "";
        const bulkMatch = text.match(/bulk\s+([^;\n]+)/i);
        if (bulkMatch) {
            bulk = bulkMatch[1].trim();
        }
        let weaponType = "Small arm";
        const typeMatch = text.match(/\b(small arm|long arm|heavy weapon|sniper weapon|melee weapon|grenade|basic melee|advanced melee|small arms|long arms|heavy)\b/i);
        if (typeMatch) {
            weaponType = typeMatch[1].trim();
        }
        let special = "";
        const specialMatch = text.match(/special\s+([^;\n]+)/i);
        if (specialMatch) {
            special = specialMatch[1].trim();
        }
        const descriptionLines = [];
        const weaponTypeRegex = /\b(small arm|long arm|heavy weapon|sniper weapon|melee weapon|grenade|basic melee|advanced melee|small arms|long arms|heavy)\b/i;
        for (const line of lines) {
            if (line.toLowerCase().includes("damage") || line.toLowerCase().includes("capacity") || line.toLowerCase().startsWith("level")) {
                continue;
            }
            if (line === name) {
                continue;
            }
            if (weaponTypeRegex.test(line) && line.length < 30) {
                continue;
            }
            descriptionLines.push(line);
        }
        const description = descriptionLines.join(" ").trim();
        const structuredData = {
            level,
            damage,
            damageType,
            range,
            capacity,
            usage,
            bulk,
            weaponType,
            special,
            description
        };
        let matchedCount = 0;
        if (damage)
            matchedCount++;
        if (range)
            matchedCount++;
        if (capacity)
            matchedCount++;
        if (usage)
            matchedCount++;
        if (bulk)
            matchedCount++;
        if (special)
            matchedCount++;
        const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);
        const autoTags = ["weapon"];
        if (weaponType) {
            autoTags.push(weaponType.toLowerCase().replace(/\s+/g, "-"));
        }
        return [{
                name: name.trim(),
                rawText: text,
                structuredData,
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags
            }];
    }
}

class ArmorDetector {
    category = "armor";
    canDetect(text) {
        const lowercase = text.toLowerCase();
        const hasEac = lowercase.includes("eac bonus") || lowercase.includes("eac +") || lowercase.includes("eac ");
        const hasKac = lowercase.includes("kac bonus") || lowercase.includes("kac +") || lowercase.includes("kac ");
        const hasMaxDex = lowercase.includes("max dex") || lowercase.includes("max. dex");
        const hasAcp = lowercase.includes("armor check") || lowercase.includes("acp");
        let score = 0;
        if (hasEac)
            score += 2;
        if (hasKac)
            score += 2;
        if (hasMaxDex)
            score += 1;
        if (hasAcp)
            score += 1;
        const hasArmorType = /\b(light armor|heavy armor|powered armor)\b/i.test(lowercase);
        if (hasArmorType)
            score += 2;
        return score >= 3;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text)) {
            return [];
        }
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            return [];
        }
        let name = lines[0];
        const cleanLines = [];
        for (const line of lines) {
            if (/^level\s+(\d+)/i.test(line)) {
                continue;
            }
            cleanLines.push(line);
        }
        if (cleanLines.length > 0 && /^[A-Z0-9\s,\-–']{3,}$/.test(cleanLines[0])) {
            name = cleanLines[0];
        }
        let level = 1;
        const levelMatch = text.match(/\blevel\s+(\d+)/i);
        if (levelMatch) {
            level = parseInt(levelMatch[1], 10);
        }
        let eac = 0;
        const eacMatch = text.match(/(?:eac\s+bonus:?\s*|eac\s*\+?\s*)([+-]?\d+)/i);
        if (eacMatch) {
            eac = parseInt(eacMatch[1], 10);
        }
        let kac = 0;
        const kacMatch = text.match(/(?:kac\s+bonus:?\s*|kac\s*\+?\s*)([+-]?\d+)/i);
        if (kacMatch) {
            kac = parseInt(kacMatch[1], 10);
        }
        let maxDex = 0;
        const maxDexMatch = text.match(/(?:max\s*dex\s*(?:bonus)?:?\s*|max\.\s*dex:?\s*)([+-]?\d+)/i);
        if (maxDexMatch) {
            maxDex = parseInt(maxDexMatch[1], 10);
        }
        let acp = 0;
        const acpMatch = text.match(/(?:armor\s*check\s*(?:penalty)?:?\s*|acp:?\s*)([+-]?\d+)/i);
        if (acpMatch) {
            acp = parseInt(acpMatch[1], 10);
        }
        let speedAdj = "";
        const speedMatch = text.match(/(?:speed\s*adjustment:?\s*|speed:?\s*)([^\n;]+)/i);
        if (speedMatch) {
            speedAdj = speedMatch[1].trim();
        }
        let upgradeSlots = 0;
        const slotsMatch = text.match(/(?:upgrade\s*slots:?\s*|slots:?\s*)(\d+)/i);
        if (slotsMatch) {
            upgradeSlots = parseInt(slotsMatch[1], 10);
        }
        let bulk = "";
        const bulkMatch = text.match(/(?:bulk:?\s*)([^\n;]+)/i);
        if (bulkMatch) {
            bulk = bulkMatch[1].trim();
        }
        let armorType = "Light Armor";
        const typeMatch = text.match(/\b(light armor|heavy armor|powered armor)\b/i);
        if (typeMatch) {
            armorType = typeMatch[1].trim();
        }
        let price = "";
        const priceMatch = text.match(/(?:price|cost):?\s*([^\n;]+)/i);
        if (priceMatch) {
            price = priceMatch[1].trim();
        }
        const descriptionLines = [];
        const armorKeywords = /\b(light armor|heavy armor|powered armor|eac|kac|max\s*dex|armor\s*check|acp|upgrade\s*slots|slots)\b/i;
        for (const line of lines) {
            if (line.toLowerCase().startsWith("level") || line.toLowerCase().startsWith("price") || line.toLowerCase().includes("eac bonus") || line.toLowerCase().includes("kac bonus")) {
                continue;
            }
            if (line === name) {
                continue;
            }
            if (armorKeywords.test(line) && line.length < 30) {
                continue;
            }
            descriptionLines.push(line);
        }
        const description = descriptionLines.join(" ").trim();
        const structuredData = {
            level,
            eac,
            kac,
            maxDex,
            acp,
            speedAdj,
            upgradeSlots,
            bulk,
            armorType,
            price,
            description
        };
        let matchedCount = 0;
        if (eacMatch)
            matchedCount++;
        if (kacMatch)
            matchedCount++;
        if (maxDexMatch)
            matchedCount++;
        if (acpMatch)
            matchedCount++;
        if (slotsMatch)
            matchedCount++;
        if (bulk)
            matchedCount++;
        const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);
        const autoTags = ["armor"];
        if (armorType) {
            autoTags.push(armorType.toLowerCase().replace(/\s+/g, "-"));
        }
        return [{
                name: name.trim(),
                rawText: text,
                structuredData,
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags
            }];
    }
}

class SpellDetector {
    category = "spell";
    canDetect(text) {
        const lowercase = text.toLowerCase();
        const hasSchool = lowercase.includes("school:") || lowercase.includes("school ");
        const hasCastingTime = lowercase.includes("casting time:") || lowercase.includes("casting time ");
        const hasClasses = lowercase.includes("classes:") || lowercase.includes("classes ") || lowercase.includes("mystic ") || lowercase.includes("technomancer ");
        const hasRange = lowercase.includes("range:") || lowercase.includes("range ");
        const hasDuration = lowercase.includes("duration:") || lowercase.includes("duration ");
        let score = 0;
        if (hasSchool)
            score += 2;
        if (hasCastingTime)
            score += 2;
        if (hasClasses)
            score += 1;
        if (hasRange)
            score += 1;
        if (hasDuration)
            score += 1;
        return score >= 3;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text)) {
            return [];
        }
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            return [];
        }
        let name = lines[0];
        const cleanLines = [];
        for (const line of lines) {
            if (/^school:/i.test(line) || /^classes:/i.test(line)) {
                continue;
            }
            cleanLines.push(line);
        }
        if (cleanLines.length > 0 && /^[A-Z0-9\s,\-–']{3,}$/.test(cleanLines[0])) {
            name = cleanLines[0];
        }
        let school = "";
        const schoolMatch = text.match(/school:?\s*([a-za-z]+)/i);
        if (schoolMatch) {
            school = schoolMatch[1].trim();
        }
        let classesStr = "";
        const classesMatch = text.match(/classes:?\s*([^\n]+)/i);
        if (classesMatch) {
            classesStr = classesMatch[1].trim();
        }
        else {
            const classLevelMatch = text.match(/(?:mystic|technomancer|witchwarper|precog|caster)\s+\d+/gi);
            if (classLevelMatch) {
                classesStr = classLevelMatch.join(", ");
            }
        }
        const classesList = [];
        let level = 1;
        if (classesStr) {
            const splitClasses = classesStr.split(",").map(c => c.trim()).filter(Boolean);
            for (const cls of splitClasses) {
                classesList.push(cls);
                const match = cls.match(/\d+/);
                if (match) {
                    const l = parseInt(match[0], 10);
                    if (l > level) {
                        level = l;
                    }
                }
            }
        }
        let castingTime = "";
        const castingMatch = text.match(/casting\s*time:?\s*([^\n;]+)/i);
        if (castingMatch) {
            castingTime = castingMatch[1].trim();
        }
        let range = "";
        const rangeMatch = text.match(/range:?\s*([^\n;]+)/i);
        if (rangeMatch) {
            range = rangeMatch[1].trim();
        }
        let targets = "";
        const targetsMatch = text.match(/(?:targets|target|area|effect):?\s*([^\n;]+)/i);
        if (targetsMatch) {
            targets = targetsMatch[1].trim();
        }
        let duration = "";
        const durationMatch = text.match(/duration:?\s*([^\n;]+)/i);
        if (durationMatch) {
            duration = durationMatch[1].trim();
        }
        let savingThrow = "";
        const saveMatch = text.match(/saving\s*throw:?\s*([^;\n]+)/i);
        if (saveMatch) {
            savingThrow = saveMatch[1].trim();
        }
        let spellResistance = "";
        const srMatch = text.match(/spell\s*resistance:?\s*([^\n]+)/i);
        if (srMatch) {
            spellResistance = srMatch[1].trim();
        }
        const descriptionLines = [];
        const spellKeywords = /^(school|classes|casting\s*time|range|targets|duration|saving\s*throw|spell\s*resistance|target|area|effect):/i;
        for (const line of lines) {
            if (line === name) {
                continue;
            }
            if (spellKeywords.test(line)) {
                continue;
            }
            descriptionLines.push(line);
        }
        const description = descriptionLines.join(" ").trim();
        const structuredData = {
            level,
            school,
            castingTime,
            range,
            targets,
            duration,
            savingThrow,
            spellResistance,
            classes: classesList,
            description
        };
        let matchedCount = 0;
        if (school)
            matchedCount++;
        if (castingTime)
            matchedCount++;
        if (range)
            matchedCount++;
        if (duration)
            matchedCount++;
        if (savingThrow)
            matchedCount++;
        if (spellResistance)
            matchedCount++;
        const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);
        const autoTags = ["spell"];
        if (school) {
            autoTags.push(school.toLowerCase());
        }
        return [{
                name: name.trim(),
                rawText: text,
                structuredData,
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags
            }];
    }
}

class NpcDetector {
    category = "npc";
    canDetect(text) {
        const lowercase = text.toLowerCase();
        const hasCr = /\bcr\s+\d+/i.test(lowercase) || /\bcr\s+\d+\/\d+/i.test(lowercase);
        const hasEacKac = lowercase.includes("eac") && lowercase.includes("kac");
        const hasSaves = lowercase.includes("fort") && lowercase.includes("ref") && lowercase.includes("will");
        const hasAbilities = lowercase.includes("str") && lowercase.includes("dex") && lowercase.includes("con");
        let score = 0;
        if (hasCr)
            score += 2;
        if (hasEacKac)
            score += 2;
        if (hasSaves)
            score += 1;
        if (hasAbilities)
            score += 1;
        return score >= 3;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text)) {
            return [];
        }
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            return [];
        }
        let name = lines[0];
        const crLineMatch = text.match(/^([^\n]+?)\s+\bcr\s+([0-9/]+)/i);
        if (crLineMatch) {
            name = crLineMatch[1].trim();
        }
        else {
            for (const line of lines) {
                const match = line.match(/^([^\n]+?)\s+\bcr\s+([0-9/]+)/i);
                if (match) {
                    name = match[1].trim();
                    break;
                }
            }
        }
        let cr = "1";
        const crMatch = text.match(/\bcr\s+([0-9/]+)/i);
        if (crMatch) {
            cr = crMatch[1].trim();
        }
        let xp = "";
        const xpMatch = text.match(/\bxp\s+([0-9,]+)/i);
        if (xpMatch) {
            xp = xpMatch[1].trim();
        }
        let hp = 0;
        const hpMatch = text.match(/\bhp\s+(\d+)/i);
        if (hpMatch) {
            hp = parseInt(hpMatch[1], 10);
        }
        let eac = 10;
        const eacMatch = text.match(/\beac\s*(\d+)/i);
        if (eacMatch) {
            eac = parseInt(eacMatch[1], 10);
        }
        let kac = 10;
        const kacMatch = text.match(/\bkac\s*(\d+)/i);
        if (kacMatch) {
            kac = parseInt(kacMatch[1], 10);
        }
        let fort = 0;
        const fortMatch = text.match(/\bfort\s*([+-]\d+)/i);
        if (fortMatch) {
            fort = parseInt(fortMatch[1], 10);
        }
        let ref = 0;
        const refMatch = text.match(/\bref\s*([+-]\d+)/i);
        if (refMatch) {
            ref = parseInt(refMatch[1], 10);
        }
        let will = 0;
        const willMatch = text.match(/\bwill\s*([+-]\d+)/i);
        if (willMatch) {
            will = parseInt(willMatch[1], 10);
        }
        let str = 10;
        const strMatch = text.match(/\bstr\s*([+-]?\d+)/i);
        if (strMatch) {
            str = parseInt(strMatch[1], 10);
        }
        let dex = 10;
        const dexMatch = text.match(/\bdex\s*([+-]?\d+)/i);
        if (dexMatch) {
            dex = parseInt(dexMatch[1], 10);
        }
        let con = 10;
        const conMatch = text.match(/\bcon\s*([+-]?\d+)/i);
        if (conMatch) {
            con = parseInt(conMatch[1], 10);
        }
        let int = 10;
        const intMatch = text.match(/\bint\s*([+-]?\d+)/i);
        if (intMatch) {
            int = parseInt(intMatch[1], 10);
        }
        let wis = 10;
        const wisMatch = text.match(/\bwis\s*([+-]?\d+)/i);
        if (wisMatch) {
            wis = parseInt(wisMatch[1], 10);
        }
        let cha = 10;
        const chaMatch = text.match(/\bcha\s*([+-]?\d+)/i);
        if (chaMatch) {
            cha = parseInt(chaMatch[1], 10);
        }
        let speed = "";
        const speedMatch = text.match(/\bspeed\s*([^\n;]+)/i);
        if (speedMatch) {
            speed = speedMatch[1].trim();
        }
        let initiative = 0;
        const initMatch = text.match(/\b(?:init|initiative)\s*([+-]?\d+)/i);
        if (initMatch) {
            initiative = parseInt(initMatch[1], 10);
        }
        const attacks = [];
        for (const line of lines) {
            if (/^(?:melee|ranged)\s+/i.test(line)) {
                attacks.push(line.trim());
            }
        }
        let skills = "";
        const skillsMatch = text.match(/\bskills\s*([^\n]+)/i);
        if (skillsMatch) {
            skills = skillsMatch[1].trim();
        }
        let languages = "";
        const languagesMatch = text.match(/\blanguages\s*([^\n]+)/i);
        if (languagesMatch) {
            languages = languagesMatch[1].trim();
        }
        const descriptionLines = [];
        const npcKeywords = /^(xp|init|senses|perception|eac|kac|fort|ref|will|hp|speed|melee|ranged|str|dex|con|int|wis|cha|skills|languages|other gear|tactics|defense|offense|statistics):?/i;
        for (const line of lines) {
            if (line === name || line.includes("CR " + cr)) {
                continue;
            }
            if (npcKeywords.test(line)) {
                continue;
            }
            descriptionLines.push(line);
        }
        const description = descriptionLines.join(" ").trim();
        const structuredData = {
            cr,
            xp,
            hp,
            eac,
            kac,
            fort,
            ref,
            will,
            str,
            dex,
            con,
            int,
            wis,
            cha,
            speed,
            initiative,
            attacks,
            skills,
            languages,
            description
        };
        let matchedCount = 0;
        if (crMatch)
            matchedCount++;
        if (xpMatch)
            matchedCount++;
        if (hpMatch)
            matchedCount++;
        if (eacMatch)
            matchedCount++;
        if (kacMatch)
            matchedCount++;
        if (strMatch)
            matchedCount++;
        if (skillsMatch)
            matchedCount++;
        const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);
        const autoTags = ["npc", `cr-${cr}`];
        return [{
                name: name.trim(),
                rawText: text,
                structuredData,
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags
            }];
    }
}

class VehicleDetector {
    category = "vehicle";
    canDetect(text) {
        const lowercase = text.toLowerCase();
        const hasVehicle = lowercase.includes("vehicle");
        const hasHardness = lowercase.includes("hardness");
        const hasAutopilot = lowercase.includes("autopilot");
        const hasCover = lowercase.includes("cover");
        let score = 0;
        if (hasVehicle)
            score += 2;
        if (hasHardness)
            score += 2;
        if (hasAutopilot)
            score += 1;
        if (hasCover)
            score += 1;
        return score >= 3;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text)) {
            return [];
        }
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            return [];
        }
        let name = lines[0];
        const vehicleTypeRegex = /\b(tiny|small|medium|large|huge|gargantuan|colossal)\s+(?:land|sea|air|hover|water|space)?\s*vehicle/i;
        const sizeLineMatch = text.match(vehicleTypeRegex);
        if (sizeLineMatch) {
            const matchIndex = lines.findIndex(l => vehicleTypeRegex.test(l));
            if (matchIndex > 0) {
                name = lines[matchIndex - 1];
            }
        }
        let size = "Medium";
        if (sizeLineMatch) {
            size = sizeLineMatch[1].charAt(0).toUpperCase() + sizeLineMatch[1].slice(1).toLowerCase();
        }
        let speed = "";
        const speedMatch = text.match(/speed\s*([^\n;]+)/i);
        if (speedMatch) {
            speed = speedMatch[1].trim();
        }
        let eac = 10;
        const eacMatch = text.match(/eac\s*(\d+)/i);
        if (eacMatch) {
            eac = parseInt(eacMatch[1], 10);
        }
        let kac = 10;
        const kacMatch = text.match(/kac\s*(\d+)/i);
        if (kacMatch) {
            kac = parseInt(kacMatch[1], 10);
        }
        let hp = 0;
        const hpMatch = text.match(/hp\s*(\d+)/i);
        if (hpMatch) {
            hp = parseInt(hpMatch[1], 10);
        }
        let hardness = 0;
        const hardnessMatch = text.match(/hardness\s*(\d+)/i);
        if (hardnessMatch) {
            hardness = parseInt(hardnessMatch[1], 10);
        }
        let attacks = "";
        const attacksMatch = text.match(/(?:attack|attacks|attack\s*\(ram\))\s*:?\s*([^\n]+)/i);
        if (attacksMatch) {
            attacks = attacksMatch[1].trim();
        }
        let crew = "";
        const crewMatch = text.match(/crew\s*:?\s*([^\n;]+)/i);
        if (crewMatch) {
            crew = crewMatch[1].trim();
        }
        let passengers = "";
        const passengersMatch = text.match(/passengers\s*:?\s*([^\n;]+)/i);
        if (passengersMatch) {
            passengers = passengersMatch[1].trim();
        }
        let cargo = "";
        const cargoMatch = text.match(/cargo\s*:?\s*([^\n;]+)/i);
        if (cargoMatch) {
            cargo = cargoMatch[1].trim();
        }
        let modifiers = "";
        const modifiersMatch = text.match(/modifiers\s*:?\s*([^\n]+)/i);
        if (modifiersMatch) {
            modifiers = modifiersMatch[1].trim();
        }
        const descriptionLines = [];
        const vehicleKeywords = /^(speed|eac|kac|hp|hardness|attacks|attack|crew|passengers|cargo|modifiers|autopilot):?/i;
        for (const line of lines) {
            if (line === name || vehicleTypeRegex.test(line)) {
                continue;
            }
            if (vehicleKeywords.test(line)) {
                continue;
            }
            descriptionLines.push(line);
        }
        const description = descriptionLines.join(" ").trim();
        const structuredData = {
            size,
            speed,
            eac,
            kac,
            hp,
            hardness,
            attacks,
            crew,
            passengers,
            cargo,
            modifiers,
            description
        };
        let matchedCount = 0;
        if (sizeLineMatch)
            matchedCount++;
        if (speedMatch)
            matchedCount++;
        if (eacMatch)
            matchedCount++;
        if (kacMatch)
            matchedCount++;
        if (hardnessMatch)
            matchedCount++;
        if (crewMatch)
            matchedCount++;
        const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);
        const autoTags = ["vehicle", size.toLowerCase()];
        return [{
                name: name.trim(),
                rawText: text,
                structuredData,
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags
            }];
    }
}

class StarshipDetector {
    category = "starship";
    canDetect(text) {
        const lowercase = text.toLowerCase();
        const hasStarship = lowercase.includes("starship");
        const hasTier = /\btier\s+\d+/i.test(lowercase);
        const hasHpDtCt = lowercase.includes("hp") && (lowercase.includes("dt") || lowercase.includes("ct"));
        const hasShields = lowercase.includes("shields");
        let score = 0;
        if (hasStarship)
            score += 2;
        if (hasTier)
            score += 2;
        if (hasHpDtCt)
            score += 2;
        if (hasShields)
            score += 1;
        return score >= 3;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text)) {
            return [];
        }
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            return [];
        }
        let name = lines[0];
        const tierMatch = text.match(/^([^\n]+?)\s+\btier\s+(\d+)/i);
        if (tierMatch) {
            name = tierMatch[1].trim();
        }
        else {
            for (const line of lines) {
                const match = line.match(/^([^\n]+?)\s+\btier\s+(\d+)/i);
                if (match) {
                    name = match[1].trim();
                    break;
                }
            }
        }
        let tier = "1";
        const tierRegexMatch = text.match(/\btier\s*(\d+)/i);
        if (tierRegexMatch) {
            tier = tierRegexMatch[1];
        }
        let size = "Medium";
        const sizePattern = /\b(tiny|small|medium|large|huge|gargantuan|colossal)\s+starship/i;
        const sizeRegexMatch = text.match(sizePattern);
        if (sizeRegexMatch) {
            size = sizeRegexMatch[1].charAt(0).toUpperCase() + sizeRegexMatch[1].slice(1).toLowerCase();
        }
        let hp = 0;
        const hpMatch = text.match(/\bhp\s*(\d+)/i);
        if (hpMatch) {
            hp = parseInt(hpMatch[1], 10);
        }
        let dt = 0;
        const dtMatch = text.match(/\bdt\s*(\d+)/i);
        if (dtMatch) {
            dt = parseInt(dtMatch[1], 10);
        }
        let ct = 0;
        const ctMatch = text.match(/\bct\s*(\d+)/i);
        if (ctMatch) {
            ct = parseInt(ctMatch[1], 10);
        }
        let speed = 0;
        const speedMatch = text.match(/\bspeed\s*(\d+)/i);
        if (speedMatch) {
            speed = parseInt(speedMatch[1], 10);
        }
        let maneuverability = "average";
        const manMatch = text.match(/\bmaneuverability\s*([a-za-z0-9()\-–\s]+)/i);
        if (manMatch) {
            maneuverability = manMatch[1].trim();
        }
        const shields = { forward: 0, port: 0, starboard: 0, aft: 0 };
        const shieldMatch = text.match(/shields\s*(?:forward\s*(\d+),\s*port\s*(\d+),\s*starboard\s*(\d+),\s*aft\s*(\d+)|([^\n]+))/i);
        if (shieldMatch) {
            if (shieldMatch[1]) {
                shields.forward = parseInt(shieldMatch[1], 10);
                shields.port = parseInt(shieldMatch[2], 10);
                shields.starboard = parseInt(shieldMatch[3], 10);
                shields.aft = parseInt(shieldMatch[4], 10);
            }
            else if (shieldMatch[5]) {
                const genValMatch = shieldMatch[5].match(/\d+/);
                if (genValMatch) {
                    const v = parseInt(genValMatch[0], 10);
                    shields.forward = v;
                    shields.port = v;
                    shields.starboard = v;
                    shields.aft = v;
                }
            }
        }
        let powerCore = "";
        const pcMatch = text.match(/power\s*core\s*:?\s*([^\n;]+)/i);
        if (pcMatch) {
            powerCore = pcMatch[1].trim();
        }
        let driftEngine = "";
        const driftMatch = text.match(/drift\s*engine\s*:?\s*([^\n;]+)/i);
        if (driftMatch) {
            driftEngine = driftMatch[1].trim();
        }
        let sensors = "";
        const sensMatch = text.match(/sensors\s*:?\s*([^\n;]+)/i);
        if (sensMatch) {
            sensors = sensMatch[1].trim();
        }
        const attacks = [];
        for (const line of lines) {
            if (/^attack\s*\(/i.test(line)) {
                attacks.push(line.trim());
            }
        }
        const crew = { captain: "", pilot: "", gunner: "", engineer: "", scienceOfficer: "" };
        const crewLineMatch = text.match(/crew\s*:?\s*([^\n]+)/i);
        if (crewLineMatch) {
            const crewStr = crewLineMatch[1].toLowerCase();
            if (crewStr.includes("captain"))
                crew.captain = "Captain";
            if (crewStr.includes("pilot"))
                crew.pilot = "Pilot";
            if (crewStr.includes("gunner"))
                crew.gunner = "Gunner";
            if (crewStr.includes("engineer"))
                crew.engineer = "Engineer";
            if (crewStr.includes("science officer") || crewStr.includes("science"))
                crew.scienceOfficer = "Science Officer";
        }
        const descriptionLines = [];
        const starshipKeywords = /^(tier|speed|maneuverability|hp|dt|ct|shields|power\s*core|drift\s*engine|sensors|attack|attacks|crew):?/i;
        for (const line of lines) {
            if (line === name || sizePattern.test(line)) {
                continue;
            }
            if (starshipKeywords.test(line)) {
                continue;
            }
            descriptionLines.push(line);
        }
        const description = descriptionLines.join(" ").trim();
        const structuredData = {
            tier,
            size,
            hp,
            dt,
            ct,
            speed,
            maneuverability,
            shields,
            powerCore,
            driftEngine,
            sensors,
            attacks,
            crew,
            description
        };
        let matchedCount = 0;
        if (tierRegexMatch)
            matchedCount++;
        if (sizeRegexMatch)
            matchedCount++;
        if (hpMatch)
            matchedCount++;
        if (shieldMatch)
            matchedCount++;
        if (pcMatch)
            matchedCount++;
        if (sensMatch)
            matchedCount++;
        const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);
        const autoTags = ["starship", size.toLowerCase()];
        return [{
                name: name.trim(),
                rawText: text,
                structuredData,
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags
            }];
    }
}

/**
 * Species Detector — detects SFRPG species (race) stat blocks in extracted PDF text.
 *
 * A Starfinder species stat block follows this structure:
 *
 *   SPECIES NAME
 *   Ability Adjustments: +2 Str, +2 Con, –2 Int
 *   Hit Points: 6
 *   Size and Type: [Species]s are Medium humanoids with the [subtype] subtype.
 *   [Racial Trait (Ex)]: Description…
 *
 * Key discriminators (never appear in weapon/armor/NPC blocks):
 *   • "Ability Adjustments:" or "Ability Modifiers:"
 *   • "Hit Points:" followed by a small bare number (not a dice expression)
 *   • "Size and Type:"
 *
 * Each trait block that follows "(Ex)", "(Su)", or "(Sp)" is extracted as a
 * separate racial ability entry in `racialAbilities`.
 */
const ABILITY_NAMES = {
    str: "str", strength: "str",
    dex: "dex", dexterity: "dex",
    con: "con", constitution: "con",
    int: "int", intelligence: "int",
    wis: "wis", wisdom: "wis",
    cha: "cha", charisma: "cha",
};
const SIZE_MAP = {
    fine: "fine", diminutive: "diminutive", tiny: "tiny",
    small: "small", medium: "medium", large: "large",
    huge: "huge", gargantuan: "gargantuan", colossal: "colossal",
};
class SpeciesDetector {
    category = "race";
    canDetect(text) {
        const lower = text.toLowerCase();
        const hasAbilityAdj = /ability\s+(adjustments?|modifiers?)\s*:/i.test(text);
        const hasSizeAndType = /size\s+and\s+type\s*:/i.test(text);
        let score = 0;
        if (hasAbilityAdj)
            score += 3;
        if (hasSizeAndType)
            score += 3;
        if (/hit\s+points?\s*:\s*\d+(?:\s|$)/i.test(text))
            score += 2;
        if (/\(Ex\)|\(Su\)|\(Sp\)/i.test(text))
            score += 1;
        if (/subtype/i.test(lower))
            score += 1;
        if (/racial\s+trait/i.test(lower))
            score += 1;
        return score >= 4;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text))
            return [];
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return [];
        const name = this.extractName(lines);
        const abilityMods = this.extractAbilityMods(text);
        const hp = this.extractHp(text);
        const size = this.extractSize(text);
        const subtype = this.extractSubtype(text);
        const racialAbilities = this.extractRacialAbilities(text);
        const description = this.buildDescription(lines, name);
        let matchedCount = 0;
        if (abilityMods.length > 0)
            matchedCount += 2;
        if (hp > 0)
            matchedCount++;
        if (size)
            matchedCount++;
        if (subtype)
            matchedCount++;
        if (racialAbilities.length > 0)
            matchedCount++;
        const confidence = Math.min(0.5 + matchedCount * 0.08, 0.97);
        const autoTags = ["species"];
        if (subtype)
            autoTags.push(subtype.toLowerCase());
        return [{
                name: name.trim(),
                rawText: text,
                structuredData: {
                    abilityMods,
                    hp,
                    size,
                    subtype,
                    racialAbilities,
                    description,
                },
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags,
            }];
    }
    extractName(lines) {
        for (const line of lines) {
            if (line &&
                !line.includes(":") &&
                /^[A-Z][A-Za-z\s'\-–]{2,}$/.test(line) &&
                line.length < 60) {
                return line;
            }
            if (/^[A-Z][A-Z\s'\-–]{2,}$/.test(line) && line.length < 60) {
                return line;
            }
        }
        return lines[0] ?? "Unknown Species";
    }
    /**
     * Parses "Ability Adjustments: +2 Str, +2 Con, –2 Int" into
     * an array of {mod: "+2", ability: "str"} objects.
     */
    extractAbilityMods(text) {
        const match = text.match(/ability\s+(?:adjustments?|modifiers?)\s*:\s*([^\n]+)/i);
        if (!match)
            return [];
        const parts = match[1].split(/,\s*/);
        const results = [];
        for (const part of parts) {
            const modMatch = part.trim().match(/([+\-–−]?\s*\d+)\s+([A-Za-z]+)/);
            if (modMatch) {
                const mod = modMatch[1].replace(/–|−/, "-").replace(/\s+/, "");
                const rawAbility = modMatch[2].toLowerCase();
                const ability = ABILITY_NAMES[rawAbility];
                if (ability) {
                    results.push({ mod: mod.startsWith("-") ? mod : `+${mod.replace("+", "")}`, ability });
                }
            }
        }
        return results;
    }
    extractHp(text) {
        const match = text.match(/hit\s+points?\s*:\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
    }
    extractSize(text) {
        const match = text.match(/size\s+and\s+type\s*:[^.]*?\b(fine|diminutive|tiny|small|medium|large|huge|gargantuan|colossal)\b/i);
        if (match)
            return SIZE_MAP[match[1].toLowerCase()] ?? "medium";
        const fallback = text.match(/\b(fine|diminutive|tiny|small|medium|large|huge|gargantuan|colossal)\b/i);
        return fallback ? SIZE_MAP[fallback[1].toLowerCase()] ?? "medium" : "medium";
    }
    extractSubtype(text) {
        const subtypeMatch = text.match(/with\s+the\s+(\w+)\s+subtype/i);
        if (subtypeMatch)
            return subtypeMatch[1].toLowerCase();
        const typeMatch = text.match(/(?:are|is)\s+\w+\s+(\w+)\s+with/i);
        return typeMatch ? typeMatch[1].toLowerCase() : "humanoid";
    }
    /**
     * Extracts individual racial ability blocks.
     * Each ability is introduced by "Name (Ex):", "Name (Su):", or "Name (Sp):".
     */
    extractRacialAbilities(text) {
        const abilities = [];
        const regex = /([A-Z][A-Za-z\s'\-–]{1,50}?)\s+\((Ex|Su|Sp)\)\s*:/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const abilityName = match[1].trim();
            const abilityType = match[2];
            const start = match.index + match[0].length;
            const nextMatch = regex.source ? text.slice(start).search(/[A-Z][A-Za-z\s'\-–]{1,50}?\s+\((Ex|Su|Sp)\)\s*:/) : -1;
            const desc = nextMatch > 0
                ? text.slice(start, start + nextMatch).trim()
                : text.slice(start).split(/\n\n/)[0]?.trim() ?? "";
            abilities.push({ name: abilityName, type: abilityType, description: desc });
        }
        return abilities;
    }
    buildDescription(lines, speciesName) {
        const skipPatterns = [
            /ability\s+(?:adjustments?|modifiers?)\s*:/i,
            /hit\s+points?\s*:/i,
            /size\s+and\s+type\s*:/i,
        ];
        const descLines = lines.filter(line => {
            if (line === speciesName)
                return false;
            if (skipPatterns.some(p => p.test(line)))
                return false;
            return true;
        });
        return descLines.join(" ").trim();
    }
}

/**
 * Equipment Detector — identifies general equipment items in SFRPG PDF text.
 *
 * SFRPG equipment stat blocks look like:
 *
 *   ITEM NAME
 *   Level X; Price Y credits; Bulk L
 *   [Description paragraph]
 *
 * Key discriminators (never appear in weapon/armor blocks at these thresholds):
 *   • "Price:" or "price" followed by a credit value
 *   • "Level" followed by a number (1–20)
 *   • "Bulk" keyword
 *   • No weapon damage dice (e.g., "1d6"), EAC/KAC bonus lines, or CR
 */
class EquipmentDetector {
    category = "equipment";
    canDetect(text) {
        const lower = text.toLowerCase();
        const hasPrice = /price\s*[\d,]+|\bprice\s+\d/i.test(text);
        const hasLevel = /\blevel\s+\d{1,2}\b/i.test(text);
        const hasBulk = /\bbulk\b/i.test(lower);
        const hasCapacityOrUsage = /\bcapacity\b|\busage\b/i.test(lower);
        const isWeapon = /\bdamage\s+\d+d\d+|small\s+arm|long\s+arm|heavy\s+weapon/i.test(text);
        const isArmor = /\beac\s+bonus\b|\bkac\s+bonus\b|\bmax\s*dex\b/i.test(text);
        const isNpc = /\bcr\s+\d|\bstr\s+\d|\bfort\s+[+-]\d/i.test(text);
        const isSpell = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
        if (isWeapon || isArmor || isNpc || isSpell)
            return false;
        let score = 0;
        if (hasPrice)
            score += 3;
        if (hasLevel)
            score += 2;
        if (hasBulk)
            score += 2;
        if (hasCapacityOrUsage)
            score += 1;
        return score >= 4;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text))
            return [];
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return [];
        const name = this.extractName(lines);
        const level = this.extractLevel(text);
        const price = this.extractPrice(text);
        const bulk = this.extractBulk(text);
        const hands = this.extractHands(text);
        const capacity = this.extractField(text, /capacity\s*[:;]?\s*([^\n;]+)/i);
        const usage = this.extractField(text, /usage\s*[:;]?\s*([^\n;]+)/i);
        const slots = this.extractField(text, /upgrade\s*slots?\s*[:;]?\s*(\d+)/i);
        const description = this.buildDescription(lines, name);
        let score = 0;
        if (level > 0)
            score++;
        if (price)
            score++;
        if (bulk)
            score++;
        const confidence = Math.min(0.45 + score * 0.12, 0.95);
        return [{
                name: name.trim(),
                rawText: text,
                structuredData: { level, price, bulk, hands, capacity, usage, upgradeSlots: slots, description },
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags: ["equipment"],
            }];
    }
    extractName(lines) {
        for (const line of lines) {
            if (!line.includes(":") && !line.includes(";") && /^[A-Z][A-Za-z0-9\s'\-–,]+$/.test(line) && line.length < 70) {
                return line;
            }
        }
        return lines[0] ?? "Unknown Equipment";
    }
    extractLevel(text) {
        const m = text.match(/\blevel\s+(\d{1,2})\b/i);
        return m ? parseInt(m[1], 10) : 0;
    }
    extractPrice(text) {
        const m = text.match(/price\s*[:;]?\s*([\d,]+(?:\s*credits?)?)/i);
        return m ? m[1].trim() : "";
    }
    extractBulk(text) {
        const m = text.match(/bulk\s*[:;]?\s*([^\n;,]+)/i);
        return m ? m[1].trim().split(/\s/)[0] ?? "" : "";
    }
    extractHands(text) {
        const m = text.match(/\bhands?\s*[:;]?\s*([^\n;,]+)/i);
        return m ? m[1].trim() : "";
    }
    extractField(text, pattern) {
        const m = text.match(pattern);
        return m ? m[1].trim() : "";
    }
    buildDescription(lines, name) {
        const skip = /^(level|price|bulk|capacity|usage|upgrade\s*slot|hands?)\b/i;
        return lines
            .filter(l => l !== name && !skip.test(l))
            .join(" ")
            .trim();
    }
}

/**
 * Augmentation Detector — identifies SFRPG augmentation (cybernetic, biotech,
 * magitech, neuro-hack) entries in extracted PDF text.
 *
 * SFRPG augmentation stat blocks look like:
 *
 *   AUGMENTATION NAME          (all-caps heading)
 *   Cybernetic (or Biotech / Magitech / Neuro-hack)
 *   System: [body slot]
 *   Level X; Price Y
 *   [Description]
 *
 * Key discriminators:
 *   • "System:" followed by a body slot (arm, hand, eyes, ears, brain, etc.)
 *   • One of: cybernetic / biotech / magitech / neuro-hack
 *   • Level + Price present
 */
const AUGMENTATION_TYPES = ["cybernetic", "biotech", "magitech", "neuro-hack", "neurohack"];
const BODY_SLOTS = [
    "arm", "hand", "foot", "leg", "eye", "ear", "brain", "heart",
    "lungs", "spinal column", "throat", "skin", "all", "none",
];
class AugmentationDetector {
    category = "augmentation";
    canDetect(text) {
        const lower = text.toLowerCase();
        const hasSystem = /\bsystem\s*:/i.test(text);
        const hasAugType = AUGMENTATION_TYPES.some(t => lower.includes(t));
        const hasSlot = BODY_SLOTS.some(s => lower.includes(s));
        const hasLevel = /\blevel\s+\d{1,2}\b/i.test(text);
        const hasPrice = /\bprice\b/i.test(lower);
        const isNpc = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
        const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
        if (isNpc || isWeapon)
            return false;
        let score = 0;
        if (hasSystem)
            score += 4;
        if (hasAugType)
            score += 3;
        if (hasSlot)
            score += 1;
        if (hasLevel)
            score += 1;
        if (hasPrice)
            score += 1;
        return score >= 4;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text))
            return [];
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return [];
        const name = this.extractName(lines);
        const augType = this.extractAugType(text);
        const system = this.extractSystem(text);
        const level = this.extractLevel(text);
        const price = this.extractPrice(text);
        const description = this.buildDescription(lines, name);
        let score = 0;
        if (system)
            score++;
        if (augType)
            score++;
        if (level > 0)
            score++;
        const confidence = Math.min(0.5 + score * 0.13, 0.96);
        return [{
                name: name.trim(),
                rawText: text,
                structuredData: { augType, system, level, price, description },
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags: ["augmentation", ...(augType ? [augType.toLowerCase()] : [])],
            }];
    }
    extractName(lines) {
        for (const line of lines) {
            if (!line.includes(":") &&
                !AUGMENTATION_TYPES.some(t => line.toLowerCase() === t) &&
                /^[A-Z][A-Za-z0-9\s'\-–,]+$/.test(line) &&
                line.length < 70) {
                return line;
            }
        }
        return lines[0] ?? "Unknown Augmentation";
    }
    extractAugType(text) {
        const lower = text.toLowerCase();
        for (const t of AUGMENTATION_TYPES) {
            if (lower.includes(t))
                return t.charAt(0).toUpperCase() + t.slice(1);
        }
        return "Augmentation";
    }
    extractSystem(text) {
        const m = text.match(/system\s*:\s*([^\n;]+)/i);
        return m ? m[1].trim() : "";
    }
    extractLevel(text) {
        const m = text.match(/\blevel\s+(\d{1,2})\b/i);
        return m ? parseInt(m[1], 10) : 0;
    }
    extractPrice(text) {
        const m = text.match(/price\s*[:;]?\s*([\d,]+(?:\s*credits?)?)/i);
        return m ? m[1].trim() : "";
    }
    buildDescription(lines, name) {
        const skip = /^(system|level|price|cybernetic|biotech|magitech|neuro-?hack)\b/i;
        return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
    }
}

/**
 * Feat Detector — identifies SFRPG feat entries in extracted PDF text.
 *
 * SFRPG feat blocks follow this format:
 *
 *   FEAT NAME (Combat / General / Skill / etc.)
 *   Prerequisites: [list or "none"]
 *   Benefit: [description of what the feat does]
 *   Special: [optional extra note]
 *   Normal: [optional note about what characters without the feat can do]
 *
 * Key discriminators:
 *   • "Benefit:" — the single strongest signal (always present on feats)
 *   • "Prerequisites:" or "Prerequisite:"
 *   • Optional "(Combat)", "(General)", "(Skill)", "(Teamwork)" tag on the name line
 *   • No stat-block numbers (no EAC, KAC, CR, Str/Dex/Con)
 */
const FEAT_TYPE_TAGS = ["combat", "general", "skill", "teamwork", "gunnery", "psionics"];
class FeatDetector {
    category = "feat";
    canDetect(text) {
        const hasBenefit = /\bbenefit\s*:/i.test(text);
        const hasPrerequisite = /\bprerequisites?\s*:/i.test(text);
        const isNpc = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
        const isSpell = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
        const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
        if (isNpc || isSpell || isWeapon)
            return false;
        let score = 0;
        if (hasBenefit)
            score += 4;
        if (hasPrerequisite)
            score += 2;
        return score >= 4;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text))
            return [];
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return [];
        const { name, featType } = this.extractNameAndType(lines);
        const prerequisites = this.extractField(text, /prerequisites?\s*:\s*([^\n]+)/i);
        const benefit = this.extractMultiLine(text, /benefit\s*:\s*/i, /^(?:special|normal|prerequisite)/i);
        const special = this.extractField(text, /special\s*:\s*([^\n]+)/i);
        const normal = this.extractField(text, /normal\s*:\s*([^\n]+)/i);
        const description = benefit || this.buildDescription(lines, name);
        let score = 0;
        if (prerequisites)
            score++;
        if (benefit)
            score++;
        if (featType)
            score++;
        const confidence = Math.min(0.5 + score * 0.13, 0.95);
        return [{
                name: name.trim(),
                rawText: text,
                structuredData: { featType, prerequisites, benefit, special, normal, description },
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags: ["feat", ...(featType ? [featType.toLowerCase()] : [])],
            }];
    }
    extractNameAndType(lines) {
        for (const line of lines) {
            if (!line.includes(":")) {
                const typeMatch = line.match(/\(([A-Za-z]+)\)\s*$/);
                if (typeMatch) {
                    const featType = typeMatch[1];
                    const name = line.replace(/\s*\([A-Za-z]+\)\s*$/, "").trim();
                    return { name, featType };
                }
                if (/^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) && line.length < 70) {
                    const lower = line.toLowerCase();
                    const detectedType = FEAT_TYPE_TAGS.find(t => lower.includes(t)) ?? "";
                    return { name: line, featType: detectedType };
                }
            }
        }
        return { name: lines[0] ?? "Unknown Feat", featType: "" };
    }
    extractField(text, pattern) {
        const m = text.match(pattern);
        return m ? m[1].trim() : "";
    }
    /**
     * Extracts a multi-line field value starting after `startPattern` and
     * ending when a line begins with `stopPattern`.
     */
    extractMultiLine(text, startPattern, stopPattern) {
        const startMatch = text.search(startPattern);
        if (startMatch < 0)
            return "";
        const afterStart = text.slice(startMatch).replace(startPattern, "");
        const lines = afterStart.split(/\r?\n/);
        const result = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (result.length > 0 && stopPattern.test(trimmed))
                break;
            if (trimmed)
                result.push(trimmed);
        }
        return result.join(" ").trim();
    }
    buildDescription(lines, name) {
        const skip = /^(prerequisites?|benefit|special|normal)\s*:/i;
        return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
    }
}

/**
 * Theme Detector — identifies SFRPG theme entries in extracted PDF text.
 *
 * SFRPG theme blocks follow this format:
 *
 *   THEME NAME
 *   Theme Knowledge (1st Level)
 *   [description of 1st-level theme ability]
 *   [Level-gated theme abilities at 6th, 12th, 18th level]
 *
 * Key discriminators:
 *   • "Theme Knowledge" — the single strongest signal (unique to themes)
 *   • Level-gated abilities listed with headings like "6th Level", "12th Level"
 *   • The word "theme" in context (not a chapter heading)
 */
class ThemeDetector {
    category = "theme";
    canDetect(text) {
        const hasThemeKnowledge = /theme\s+knowledge/i.test(text);
        const isNpc = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
        const isSpell = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
        const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
        if (isNpc || isSpell || isWeapon)
            return false;
        let score = 0;
        if (hasThemeKnowledge)
            score += 5;
        if (/\b6th\s+level\b/i.test(text))
            score += 1;
        if (/\b12th\s+level\b/i.test(text))
            score += 1;
        if (/\b18th\s+level\b/i.test(text))
            score += 1;
        return score >= 4;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text))
            return [];
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return [];
        const name = this.extractName(lines);
        const themeKnowledge = this.extractThemeKnowledge(text);
        const abilities = this.extractLevelAbilities(text);
        const description = themeKnowledge || this.buildDescription(lines, name);
        let score = 0;
        if (themeKnowledge)
            score += 2;
        if (abilities.length > 0)
            score++;
        const confidence = Math.min(0.55 + score * 0.1, 0.96);
        return [{
                name: name.trim(),
                rawText: text,
                structuredData: {
                    themeKnowledge,
                    abilityAt6: abilities[0] ?? "",
                    abilityAt12: abilities[1] ?? "",
                    abilityAt18: abilities[2] ?? "",
                    description,
                },
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags: ["theme"],
            }];
    }
    extractName(lines) {
        for (const line of lines) {
            if (!line.includes(":") &&
                !/theme\s+knowledge/i.test(line) &&
                /^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) &&
                line.length < 60) {
                return line;
            }
        }
        return lines[0] ?? "Unknown Theme";
    }
    extractThemeKnowledge(text) {
        const m = text.match(/theme\s+knowledge[^:]*\n([\s\S]{0,400}?)(?:\n\n|\n(?:[A-Z0-9 ]{4,}|\d+th\s+level))/i);
        if (m)
            return m[1].replace(/\s+/g, " ").trim();
        const m2 = text.match(/theme\s+knowledge[^\n]*\n([^\n]{0,300})/i);
        return m2 ? m2[1].replace(/\s+/g, " ").trim() : "";
    }
    /**
     * Returns [6th, 12th, 18th] level ability names in order.
     */
    extractLevelAbilities(text) {
        const abilities = [];
        for (const level of ["6th", "12th", "18th"]) {
            const pattern = new RegExp(`${level}\\s+level[^\\n]*\\n([^\\n]{0,200})`, "i");
            const m = text.match(pattern);
            abilities.push(m ? m[1].replace(/\s+/g, " ").trim() : "");
        }
        return abilities;
    }
    buildDescription(lines, name) {
        const skip = /^(theme\s+knowledge|\d+th\s+level)/i;
        return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
    }
}

/**
 * Class Detector — identifies SFRPG character class entries in extracted PDF text.
 *
 * SFRPG class entries include:
 *
 *   CLASS NAME
 *   Key Ability Score: [ability]
 *   Hit Points: X   (flat value, not dice)
 *   Stamina Points: X
 *   Key Skills: [list]
 *   [Table of class features by level — BAB, Save Bonuses, Class Features]
 *
 * Key discriminators:
 *   • "Key Ability Score" — strongest signal, unique to class write-ups
 *   • "Stamina Points" — SFRPG-specific, not in NPC blocks
 *   • Class feature table entries (Bonus Feat, Mechanic Trick, etc.)
 */
class ClassDetector {
    category = "class";
    canDetect(text) {
        const hasKeyAbility = /key\s+ability\s+score/i.test(text);
        const hasStaminaPoints = /stamina\s+points/i.test(text);
        const hasClassFeatures = /class\s+feature/i.test(text);
        const isNpc = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
        const isSpell = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
        const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
        if (isNpc || isSpell || isWeapon)
            return false;
        let score = 0;
        if (hasKeyAbility)
            score += 5;
        if (hasStaminaPoints)
            score += 3;
        if (hasClassFeatures)
            score += 2;
        if (/\bproficiencies\b/i.test(text))
            score += 1;
        return score >= 4;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text))
            return [];
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return [];
        const name = this.extractName(lines);
        const keyAbility = this.extractField(text, /key\s+ability\s+score\s*[:;]?\s*([^\n;]+)/i);
        const hp = this.extractNumber(text, /hit\s+points\s*[:;]?\s*(\d+)/i);
        const stamina = this.extractNumber(text, /stamina\s+points\s*[:;]?\s*(\d+)/i);
        const keySkills = this.extractField(text, /class\s+skills?\s*[:;]?\s*([^\n]+)/i) ||
            this.extractField(text, /key\s+skills?\s*[:;]?\s*([^\n]+)/i);
        const proficiencies = this.extractField(text, /proficiencies\s*[:;]?\s*([^\n]+)/i);
        const description = this.buildDescription(lines, name);
        let score = 0;
        if (keyAbility)
            score++;
        if (hp > 0)
            score++;
        if (stamina > 0)
            score++;
        const confidence = Math.min(0.55 + score * 0.12, 0.96);
        return [{
                name: name.trim(),
                rawText: text,
                structuredData: { keyAbility, hp, stamina, keySkills, proficiencies, description },
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags: ["class"],
            }];
    }
    extractName(lines) {
        for (const line of lines) {
            if (!line.includes(":") &&
                /^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) &&
                line.length < 60) {
                return line;
            }
        }
        return lines[0] ?? "Unknown Class";
    }
    extractField(text, pattern) {
        const m = text.match(pattern);
        return m ? m[1].trim() : "";
    }
    extractNumber(text, pattern) {
        const m = text.match(pattern);
        return m ? parseInt(m[1], 10) : 0;
    }
    buildDescription(lines, name) {
        const skip = /^(key\s+ability|hit\s+points|stamina\s+points|class\s+skills?|key\s+skills?|proficiencies|bab|base\s+attack)\b/i;
        return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
    }
}

/**
 * Archetype Detector — identifies SFRPG archetype entries in extracted PDF text.
 *
 * SFRPG archetype blocks follow this format:
 *
 *   ARCHETYPE NAME
 *   [Flavor text / description]
 *   Associated Classes: [class list]
 *   Alternate Class Features
 *   [Level X] [Feature Name] — replaces [original feature]
 *
 * Key discriminators:
 *   • "Alternate Class Features" — strongest signal, almost exclusive to archetypes
 *   • "Associated Classes:" listing which base classes can take the archetype
 *   • Level-keyed features using "replaces" or "alters" language
 */
class ArchetypeDetector {
    category = "archetypeFeature";
    canDetect(text) {
        const hasAlternateFeatures = /alternate\s+class\s+features?/i.test(text);
        const hasAssociatedClasses = /associated\s+classes?\s*:/i.test(text);
        const hasReplaces = /\breplaces?\b/i.test(text);
        const isNpc = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
        const isSpell = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
        const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
        if (isNpc || isSpell || isWeapon)
            return false;
        let score = 0;
        if (hasAlternateFeatures)
            score += 5;
        if (hasAssociatedClasses)
            score += 3;
        if (hasReplaces)
            score += 1;
        return score >= 4;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text))
            return [];
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return [];
        const name = this.extractName(lines);
        const associatedClasses = this.extractField(text, /associated\s+classes?\s*:\s*([^\n]+)/i);
        const altFeatures = this.extractAltFeatures(text);
        const description = this.buildDescription(lines, name);
        let score = 0;
        if (associatedClasses)
            score++;
        if (altFeatures.length > 0)
            score++;
        const confidence = Math.min(0.55 + score * 0.15, 0.96);
        return [{
                name: name.trim(),
                rawText: text,
                structuredData: {
                    associatedClasses,
                    altFeatureCount: altFeatures.length,
                    altFeatures: altFeatures.slice(0, 8),
                    description,
                },
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags: ["archetype"],
            }];
    }
    extractName(lines) {
        for (const line of lines) {
            if (!line.includes(":") &&
                !/alternate\s+class/i.test(line) &&
                /^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) &&
                line.length < 60) {
                return line;
            }
        }
        return lines[0] ?? "Unknown Archetype";
    }
    extractField(text, pattern) {
        const m = text.match(pattern);
        return m ? m[1].trim() : "";
    }
    /**
     * Extracts alternate class feature entries (level + feature name pairs).
     */
    extractAltFeatures(text) {
        const features = [];
        const regex = /(?:(\d+)(?:st|nd|rd|th)\s+level|level\s+(\d+))[^:\n]*[:—–]\s*([^\n]{3,80})/gi;
        let m;
        while ((m = regex.exec(text)) !== null) {
            const lvl = m[1] ?? m[2] ?? "?";
            const feat = m[3].trim();
            features.push(`Level ${lvl}: ${feat}`);
        }
        return features;
    }
    buildDescription(lines, name) {
        const skip = /^(associated\s+classes?|alternate\s+class\s+features?)/i;
        return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
    }
}

/**
 * Hazard Detector — identifies SFRPG hazard entries in extracted PDF text.
 *
 * SFRPG hazard stat blocks look like:
 *
 *   HAZARD NAME       CR X
 *   XP Y
 *   Type [environmental / haunt / trap]
 *   Perception DC Z (to notice)
 *   Disable [skill] DC Z
 *   Trigger [description]
 *   Effect [description]
 *
 * Key discriminators:
 *   • "Perception DC" + "Disable" — core to hazards, absent in NPC blocks
 *   • Hazard types: environmental / haunt / trap
 *   • Has "Trigger:" and/or "Effect:"
 *   • CR present but no EAC/KAC (distinguishes hazard from NPC)
 */
const HAZARD_TYPES = ["environmental", "haunt", "trap", "disease", "radiation", "void", "gravity"];
class HazardDetector {
    category = "hazard";
    canDetect(text) {
        const hasPerceptionDc = /perception\s+dc\s*\d+/i.test(text);
        const hasDisable = /\bdisable\b/i.test(text);
        const hasTrigger = /\btrigger\b/i.test(text);
        const hasEffect = /\beffect\b/i.test(text);
        const hasHazardType = HAZARD_TYPES.some(t => new RegExp(`\\b${t}\\b`, "i").test(text));
        const isFullNpc = /\beac\s*\d+.*\bkac\s*\d+|\bfort\s+[+-]\d+.*\bref\s+[+-]\d+/i.test(text);
        if (isFullNpc)
            return false;
        const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
        const isSpell = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
        if (isWeapon || isSpell)
            return false;
        let score = 0;
        if (hasPerceptionDc)
            score += 3;
        if (hasDisable)
            score += 2;
        if (hasTrigger)
            score += 2;
        if (hasEffect)
            score += 1;
        if (hasHazardType)
            score += 2;
        return score >= 4;
    }
    detect(text, pageNumber) {
        if (!this.canDetect(text))
            return [];
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return [];
        const name = this.extractName(lines, text);
        const cr = this.extractField(text, /\bcr\s+([0-9/]+)/i);
        const xp = this.extractField(text, /\bxp\s+([\d,]+)/i);
        const hazardType = this.extractHazardType(text);
        const perceptionDc = this.extractNumber(text, /perception\s+dc\s*(\d+)/i);
        const disableDc = this.extractNumber(text, /disable\b[^:]*\bdc\s*(\d+)/i);
        const trigger = this.extractMultiLine(text, /trigger\s*[:;]?\s*/i, /^(?:effect|reset|onset)/i);
        const effect = this.extractMultiLine(text, /effect\s*[:;]?\s*/i, /^(?:trigger|reset|onset|countermeasures)/i);
        const description = this.buildDescription(lines, name);
        let score = 0;
        if (cr)
            score++;
        if (perceptionDc)
            score++;
        if (disableDc)
            score++;
        const confidence = Math.min(0.5 + score * 0.13, 0.96);
        return [{
                name: name.trim(),
                rawText: text,
                structuredData: { cr, xp, hazardType, perceptionDc, disableDc, trigger, effect, description },
                confidence,
                startIndex: 0,
                endIndex: text.length,
                pageNumber,
                autoTags: ["hazard", ...(hazardType ? [hazardType.toLowerCase()] : []), ...(cr ? [`cr-${cr}`] : [])],
            }];
    }
    extractName(lines, text) {
        const crLineMatch = text.match(/^([^\n]+?)\s+\bcr\s+([0-9/]+)/im);
        if (crLineMatch)
            return crLineMatch[1].trim();
        for (const line of lines) {
            if (!line.includes(":") && /^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) && line.length < 60) {
                return line;
            }
        }
        return lines[0] ?? "Unknown Hazard";
    }
    extractField(text, pattern) {
        const m = text.match(pattern);
        return m ? m[1].trim() : "";
    }
    extractNumber(text, pattern) {
        const m = text.match(pattern);
        return m ? parseInt(m[1], 10) : 0;
    }
    extractHazardType(text) {
        const lower = text.toLowerCase();
        for (const t of HAZARD_TYPES) {
            if (new RegExp(`\\b${t}\\b`).test(lower)) {
                return t.charAt(0).toUpperCase() + t.slice(1);
            }
        }
        return "Hazard";
    }
    extractMultiLine(text, startPattern, stopPattern) {
        const startIdx = text.search(startPattern);
        if (startIdx < 0)
            return "";
        const afterStart = text.slice(startIdx).replace(startPattern, "");
        const lines = afterStart.split(/\r?\n/);
        const result = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (result.length > 0 && stopPattern.test(trimmed))
                break;
            if (trimmed)
                result.push(trimmed);
        }
        return result.join(" ").trim();
    }
    buildDescription(lines, name) {
        const skip = /^(cr|xp|type|perception\s+dc|disable|trigger|effect|reset|onset)\b/i;
        return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
    }
}

class ContentClassifier {
    static detectors = [
        // Highly specific detectors first to reduce false positives on generic content
        new SpeciesDetector(),
        new ThemeDetector(),
        new ClassDetector(),
        new ArchetypeDetector(),
        new AugmentationDetector(),
        new FeatDetector(),
        new HazardDetector(),
        new StarshipDetector(),
        new VehicleDetector(),
        new NpcDetector(),
        new SpellDetector(),
        new WeaponDetector(),
        new ArmorDetector(),
        // Equipment runs last: broadest net, relies on exclusion of other types
        new EquipmentDetector(),
    ];
    static classify(textBlocks, minConfidence = 0.3) {
        const start = Date.now();
        const allMatches = [];
        for (const block of textBlocks) {
            const blockMatches = this.classifyBlock(block.text, block.pageNumber);
            for (const m of blockMatches) {
                if (m.confidence >= minConfidence) {
                    allMatches.push(m);
                }
            }
        }
        const categoryCounts = new Map();
        for (const match of allMatches) {
            const cat = match.structuredData._category;
            if (cat) {
                categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
            }
        }
        let dominantCategory = "unknown";
        let maxCount = 0;
        for (const [cat, count] of categoryCounts) {
            if (count > maxCount) {
                maxCount = count;
                dominantCategory = cat;
            }
        }
        return {
            matches: allMatches,
            dominantCategory,
            blocksProcessed: textBlocks.length,
            durationMs: Date.now() - start,
        };
    }
    static classifyBlock(text, pageNumber) {
        const results = [];
        for (const detector of this.detectors) {
            try {
                if (detector.canDetect(text)) {
                    const matches = detector.detect(text, pageNumber);
                    for (const m of matches) {
                        m.structuredData._category = detector.category;
                        results.push(m);
                    }
                }
            }
            catch (err) {
                ModuleLogger.warn(`ContentClassifier: ${detector.category} detector threw an error`, err);
            }
        }
        return results;
    }
    static registerDetector(detector) {
        this.detectors.push(detector);
    }
}

var ContentClassifier$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ContentClassifier: ContentClassifier
});

class OpenAiCompatibleProvider {
    name = "openai-compatible";
    baseUrl;
    apiKey;
    model;
    constructor(baseUrl, apiKey, model = "gpt-4o-mini") {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        this.apiKey = apiKey;
        this.model = model;
    }
    get isConfigured() {
        return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
    }
    async complete(prompt, systemPrompt) {
        if (!this.isConfigured) {
            throw new Error("OpenAI provider is not configured: API key is missing.");
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.1,
                    max_tokens: 2000
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("AI provider authentication failed: invalid API key.");
                }
                if (response.status === 429) {
                    throw new Error("AI provider rate limit exceeded. Please try again later.");
                }
                const errorText = await response.text().catch(() => "Unknown error");
                throw new Error(`AI provider request failed with status ${response.status}: ${errorText}`);
            }
            const data = (await response.json());
            const content = data?.choices?.[0]?.message?.content;
            if (typeof content !== "string") {
                throw new Error("AI provider returned an empty or invalid response structure.");
            }
            return content;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === "AbortError") {
                throw new Error("AI provider request timed out after 30 seconds.");
            }
            throw error;
        }
    }
}
class NullAiProvider {
    name = "null-provider";
    isConfigured = false;
    complete() {
        return Promise.reject(new Error("AI provider is not configured."));
    }
}

var AiProvider = /*#__PURE__*/Object.freeze({
    __proto__: null,
    NullAiProvider: NullAiProvider,
    OpenAiCompatibleProvider: OpenAiCompatibleProvider
});

class PromptManager {
    static prompts = new Map();
    static register(template) {
        PromptManager.prompts.set(template.category, template);
    }
    static get(category) {
        return PromptManager.prompts.get(category);
    }
    static getCategories() {
        return Array.from(PromptManager.prompts.keys());
    }
    static has(category) {
        return PromptManager.prompts.has(category);
    }
    static buildUserPrompt(category, rawText, sourceBook) {
        const template = PromptManager.get(category);
        if (!template) {
            throw new Error(`No prompt template registered for category: ${category}`);
        }
        return template.userPromptTemplate
            .replace(/\{\{rawText\}\}/g, rawText)
            .replace(/\{\{sourceBook\}\}/g, sourceBook);
    }
}

const weaponTemplate = {
    category: "weapon",
    systemPrompt: "You are a Starfinder 1E data extraction specialist. Extract game data from the provided text and return ONLY a JSON object. Do not include any text outside the JSON.\n\nThe JSON object must have exactly the following keys and types:\n- name: string\n- level: number or null\n- price: number or null\n- bulk: string or null\n- damage: string or null\n- damageType: string or null\n- range: string or null\n- capacity: string or null\n- usage: string or null\n- weaponType: string or null\n- special: string or null\n- description: string",
    userPromptTemplate: "Extract Starfinder 1E weapon data from this text from {{sourceBook}}:\n\n{{rawText}}"
};
const armorTemplate = {
    category: "armor",
    systemPrompt: "You are a Starfinder 1E data extraction specialist. Extract game data from the provided text and return ONLY a JSON object. Do not include any text outside the JSON.\n\nThe JSON object must have exactly the following keys and types:\n- name: string\n- level: number or null\n- price: number or null\n- bulk: string or null\n- eac: number or null\n- kac: number or null\n- maxDex: number or null\n- acp: number or null\n- upgradeSlots: number or null\n- armorType: string or null\n- description: string",
    userPromptTemplate: "Extract Starfinder 1E armor data from this text from {{sourceBook}}:\n\n{{rawText}}"
};
const featTemplate = {
    category: "feat",
    systemPrompt: "You are a Starfinder 1E data extraction specialist. Extract game data from the provided text and return ONLY a JSON object. Do not include any text outside the JSON.\n\nThe JSON object must have exactly the following keys and types:\n- name: string\n- prerequisites: string or null\n- benefit: string\n- special: string or null\n- description: string",
    userPromptTemplate: "Extract Starfinder 1E feat data from this text from {{sourceBook}}:\n\n{{rawText}}"
};
const spellTemplate = {
    category: "spell",
    systemPrompt: "You are a Starfinder 1E data extraction specialist. Extract game data from the provided text and return ONLY a JSON object. Do not include any text outside the JSON.\n\nThe JSON object must have exactly the following keys and types:\n- name: string\n- level: string or null\n- school: string or null\n- castingTime: string or null\n- range: string or null\n- targets: string or null\n- duration: string or null\n- savingThrow: string or null\n- spellResistance: string or null\n- classes: string or null\n- description: string",
    userPromptTemplate: "Extract Starfinder 1E spell data from this text from {{sourceBook}}:\n\n{{rawText}}"
};
const npcTemplate = {
    category: "npc",
    systemPrompt: "You are a Starfinder 1E data extraction specialist. Extract game data from the provided text and return ONLY a JSON object. Do not include any text outside the JSON.\n\nThe JSON object must have exactly the following keys and types:\n- name: string\n- cr: string or number or null\n- xp: number or null\n- alignment: string or null\n- size: string or null\n- type: string or null\n- hp: number or null\n- eac: number or null\n- kac: number or null\n- fort: number or null\n- ref: number or null\n- will: number or null\n- str: number or null\n- dex: number or null\n- con: number or null\n- int: number or null\n- wis: number or null\n- cha: number or null\n- speed: string or null\n- attacks: string or null\n- skills: string or null\n- languages: string or null\n- description: string",
    userPromptTemplate: "Extract Starfinder 1E npc data from this text from {{sourceBook}}:\n\n{{rawText}}"
};
const vehicleTemplate = {
    category: "vehicle",
    systemPrompt: "You are a Starfinder 1E data extraction specialist. Extract game data from the provided text and return ONLY a JSON object. Do not include any text outside the JSON.\n\nThe JSON object must have exactly the following keys and types:\n- name: string\n- size: string or null\n- speed: string or null\n- eac: number or null\n- kac: number or null\n- hp: number or null\n- hardness: number or null\n- crew: string or null\n- passengers: string or null\n- cargo: string or null\n- description: string",
    userPromptTemplate: "Extract Starfinder 1E vehicle data from this text from {{sourceBook}}:\n\n{{rawText}}"
};
const starshipTemplate = {
    category: "starship",
    systemPrompt: "You are a Starfinder 1E data extraction specialist. Extract game data from the provided text and return ONLY a JSON object. Do not include any text outside the JSON.\n\nThe JSON object must have exactly the following keys and types:\n- name: string\n- tier: string or number or null\n- size: string or null\n- hp: number or null\n- dt: number or null\n- ct: number or null\n- speed: string or number or null\n- maneuverability: string or null\n- shields: string or null\n- powerCore: string or null\n- driftEngine: string or null\n- attacks: string or null\n- description: string",
    userPromptTemplate: "Extract Starfinder 1E starship data from this text from {{sourceBook}}:\n\n{{rawText}}"
};
const speciesTemplate = {
    category: "race",
    systemPrompt: "You are a Starfinder 1E data extraction specialist. Extract species (race) data from the provided text and return ONLY a JSON object. Do not include any text outside the JSON.\n\nThe JSON object must have exactly the following keys and types:\n- name: string\n- hp: number or null (base hit points, usually 4 or 6)\n- size: string or null (one of: fine, diminutive, tiny, small, medium, large, huge, gargantuan, colossal)\n- subtype: string or null (creature subtype, e.g. humanoid)\n- abilityMods: array of objects with { mod: string, ability: string } where ability is one of str/dex/con/int/wis/cha and mod is like '+2' or '-2'\n- racialAbilities: array of objects with { name: string, type: string, description: string } where type is Ex/Su/Sp\n- description: string (general species description, not the racial abilities)",
    userPromptTemplate: "Extract Starfinder 1E species (race) data from this text from {{sourceBook}}:\n\n{{rawText}}"
};
PromptManager.register(weaponTemplate);
PromptManager.register(armorTemplate);
PromptManager.register(featTemplate);
PromptManager.register(spellTemplate);
PromptManager.register(npcTemplate);
PromptManager.register(vehicleTemplate);
PromptManager.register(starshipTemplate);
PromptManager.register(speciesTemplate);

class AiExtractionEngine {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    async refineRecord(record, sourceBook) {
        if (!this.provider.isConfigured) {
            return record;
        }
        if (!PromptManager.has(record.category)) {
            return record;
        }
        try {
            const template = PromptManager.get(record.category);
            if (!template) {
                return record;
            }
            const userPrompt = PromptManager.buildUserPrompt(record.category, record.rawText, sourceBook);
            const systemPrompt = template.systemPrompt;
            const responseText = await this.provider.complete(userPrompt, systemPrompt);
            const parsedData = JSON.parse(responseText);
            if (parsedData && typeof parsedData === "object" && !Array.isArray(parsedData)) {
                const structuredData = parsedData;
                return {
                    ...record,
                    structuredData: {
                        ...record.structuredData,
                        ...structuredData
                    },
                    detectionMethod: "ai",
                    confidence: Math.max(record.confidence, 0.9)
                };
            }
        }
        catch (error) {
            ModuleLogger.error(`AI Extraction Engine failed to refine record "${record.name}":`, error);
        }
        return record;
    }
    async refineBatch(records, sourceBook, onProgress) {
        const results = [];
        const total = records.length;
        if (onProgress) {
            onProgress(0, total);
        }
        for (let i = 0; i < total; i++) {
            const record = records[i];
            if (record.confidence < 0.7 && PromptManager.has(record.category)) {
                const refined = await this.refineRecord(record, sourceBook);
                results.push(refined);
            }
            else {
                results.push(record);
            }
            if (onProgress) {
                onProgress(i + 1, total);
            }
        }
        return results;
    }
    static fromSettings(moduleId) {
        const apiKeySetting = game.settings.get(moduleId, "aiApiKey");
        const apiKey = typeof apiKeySetting === "string" ? apiKeySetting : "";
        const baseUrlSetting = game.settings.get(moduleId, "aiBaseUrl");
        const baseUrl = typeof baseUrlSetting === "string" ? baseUrlSetting : "https://api.openai.com";
        const modelSetting = game.settings.get(moduleId, "aiModel");
        const model = typeof modelSetting === "string" ? modelSetting : "gpt-4o-mini";
        if (apiKey.trim().length === 0) {
            return new AiExtractionEngine(new NullAiProvider());
        }
        return new AiExtractionEngine(new OpenAiCompatibleProvider(baseUrl, apiKey, model));
    }
}

var AiExtractionEngine$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    AiExtractionEngine: AiExtractionEngine
});

/**
 * Extraction Review Application — Milestone 5
 *
 * A Foundry V13 ApplicationV2 window that presents extracted PDF records for
 * user review before they are committed to the content database.
 *
 * Layout (split pane):
 *   Left   — Original extracted text block (read-only)
 *   Right  — Editable structured fields derived from the text
 *
 * Record navigation: Prev / Next with record counter.
 *
 * Per-record actions:
 *   Accept      — Marks record as "accepted"; will be saved to database.
 *   Reject      — Marks record as "rejected"; will be skipped.
 *   Edit        — Opens field editors in the right pane.
 *   Save Draft  — Saves current edits without changing status.
 *
 * Toolbar:
 *   Accept All      — Accept every pending record.
 *   Reject All      — Reject every pending record.
 *   Save to Database — Commits all "accepted" records to ContentDatabase.
 *   Open Report     — Opens ExtractionReportApp for this run.
 *   Filter          — Show all / pending / accepted / rejected.
 *
 * After "Save to Database", records are passed to ContentDatabase.addBatch()
 * and converted to ContentRecord format.
 */
const { ApplicationV2: ApplicationV2$1, HandlebarsApplicationMixin: HandlebarsApplicationMixin$1 } = foundry.applications.api;
// ── ExtractionReviewApp ───────────────────────────────────────────────────────
class ExtractionReviewApp extends HandlebarsApplicationMixin$1(ApplicationV2$1) {
    static DEFAULT_OPTIONS = {
        id: "sf3pl-extraction-review",
        title: "SF3PL: Extraction Review",
        classes: ["sf3pl-app", "sf3pl-extraction-review"],
        window: { resizable: true },
        position: { width: 1100, height: 720 },
    };
    static PARTS = {
        main: {
            template: "modules/starfinder-thirdparty/templates/extraction-review.hbs",
        },
    };
    /** The extraction result being reviewed. */
    result;
    /** Working copy of records — mutations here don't touch the original. */
    records;
    /** Index of the currently displayed record. */
    currentIndex = 0;
    /** Whether the right pane is in edit mode. */
    editMode = false;
    /** Current filter. */
    filter = "all";
    /** Filtered record index list. */
    filteredIndices = [];
    constructor(result) {
        super({});
        this.result = result;
        this.records = result.records.map((r) => ({ ...r }));
        this.rebuildFilter();
    }
    // ── Context ───────────────────────────────────────────────────────────────
    async _prepareContext(_options) {
        this.rebuildFilter();
        const filtered = this.filteredIndices;
        const filteredPos = filtered.indexOf(this.currentIndex);
        const safePos = filteredPos === -1 ? 0 : filteredPos;
        const safeGlobalIdx = filtered[safePos] ?? -1;
        const current = safeGlobalIdx >= 0 ? (this.records[safeGlobalIdx] ?? null) : null;
        const statusCounts = this.buildStatusCounts();
        const structuredRows = current
            ? Object.entries(current.structuredData).map(([k, v]) => ({
                key: k,
                value: typeof v === "object" ? JSON.stringify(v) : String(v ?? ""),
                isEditable: this.editMode,
            }))
            : [];
        const categories = [
            "weapon", "armor", "equipment", "augmentation", "feat", "spell",
            "race", "theme", "class", "archetypeFeature", "vehicle", "starship",
            "npc", "hazard", "journal",
        ];
        return {
            runId: this.result.runId,
            sourceFile: this.result.sourceFile,
            sourceBook: this.result.sourceBook,
            publisher: this.result.publisher,
            totalRecords: this.records.length,
            filteredCount: filtered.length,
            filter: this.filter,
            editMode: this.editMode,
            navigation: {
                current: safePos + 1,
                total: filtered.length,
                hasPrev: safePos > 0,
                hasNext: safePos < filtered.length - 1,
                globalIndex: safeGlobalIdx,
            },
            statusCounts,
            current: current
                ? {
                    ...current,
                    structuredRows,
                    autoTagsJoined: current.autoTags.join(", "),
                    confidencePct: Math.round(current.confidence * 100),
                }
                : null,
            categories,
        };
    }
    // ── Event listeners ───────────────────────────────────────────────────────
    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
        // Filter buttons
        html.querySelectorAll("[data-filter]").forEach((btn) => {
            btn.addEventListener("click", () => {
                this.filter = btn.dataset.filter;
                this.currentIndex = this.filteredIndices[0] ?? 0;
                void this.render();
            });
        });
        // Navigation
        html
            .querySelector("[data-action='prev']")
            ?.addEventListener("click", () => this.navigate(-1));
        html
            .querySelector("[data-action='next']")
            ?.addEventListener("click", () => this.navigate(1));
        // Per-record actions
        html
            .querySelector("[data-action='accept']")
            ?.addEventListener("click", () => this.setStatus("accepted"));
        html
            .querySelector("[data-action='reject']")
            ?.addEventListener("click", () => this.setStatus("rejected"));
        html
            .querySelector("[data-action='edit']")
            ?.addEventListener("click", () => {
            this.editMode = !this.editMode;
            void this.render();
        });
        html
            .querySelector("[data-action='save-draft']")
            ?.addEventListener("click", () => {
            this.editMode = false;
            this.saveEditedFields(html);
            void this.render();
        });
        // Merge: copy raw text into notes
        html
            .querySelector("[data-action='merge']")
            ?.addEventListener("click", () => this.mergeRawIntoNotes());
        // Bulk actions
        html
            .querySelector("[data-action='accept-all']")
            ?.addEventListener("click", () => {
            this.records.forEach((r) => { if (r.status === "pending")
                r.status = "accepted"; });
            void this.render();
        });
        html
            .querySelector("[data-action='reject-all']")
            ?.addEventListener("click", () => {
            this.records.forEach((r) => { if (r.status === "pending")
                r.status = "rejected"; });
            void this.render();
        });
        // Save to database
        html
            .querySelector("[data-action='save-to-db']")
            ?.addEventListener("click", () => void this.saveToDatabase());
        // Open report
        html
            .querySelector("[data-action='open-report']")
            ?.addEventListener("click", () => this.openReport());
        // Inline field editing
        if (this.editMode) {
            html.querySelectorAll("[data-field-key]").forEach((inp) => {
                inp.addEventListener("change", () => this.saveEditedFields(html));
            });
            html
                .querySelector("[data-edit-category]")
                ?.addEventListener("change", (e) => {
                const rec = this.currentRecord();
                if (rec)
                    rec.category = e.target.value;
            });
            html
                .querySelector("[data-edit-notes]")
                ?.addEventListener("change", (e) => {
                const rec = this.currentRecord();
                if (rec)
                    rec.notes = e.target.value;
            });
            html
                .querySelector("[data-edit-name]")
                ?.addEventListener("change", (e) => {
                const rec = this.currentRecord();
                if (rec)
                    rec.name = e.target.value;
            });
        }
    }
    // ── Actions ───────────────────────────────────────────────────────────────
    navigate(delta) {
        const pos = this.filteredIndices.indexOf(this.currentIndex);
        const nextPos = Math.max(0, Math.min(this.filteredIndices.length - 1, pos + delta));
        this.currentIndex = this.filteredIndices[nextPos] ?? this.currentIndex;
        void this.render();
    }
    setStatus(status) {
        const rec = this.currentRecord();
        if (!rec)
            return;
        rec.status = status;
        // Auto-advance to next pending
        const pos = this.filteredIndices.indexOf(this.currentIndex);
        const next = this.filteredIndices[pos + 1];
        if (next !== undefined)
            this.currentIndex = next;
        void this.render();
    }
    mergeRawIntoNotes() {
        const rec = this.currentRecord();
        if (!rec)
            return;
        rec.notes = rec.notes
            ? `${rec.notes}\n\n--- Raw Text ---\n${rec.rawText}`
            : `--- Raw Text ---\n${rec.rawText}`;
        void this.render();
    }
    saveEditedFields(html) {
        const rec = this.currentRecord();
        if (!rec)
            return;
        html.querySelectorAll("[data-field-key]").forEach((inp) => {
            const key = inp.dataset.fieldKey;
            if (!key)
                return;
            const existing = rec.structuredData[key];
            const rawVal = inp.value;
            // Preserve numeric types if the original was a number
            rec.structuredData[key] =
                typeof existing === "number" && !isNaN(parseFloat(rawVal))
                    ? parseFloat(rawVal)
                    : rawVal;
        });
        rec.status = "edited";
    }
    async saveToDatabase() {
        const accepted = this.records.filter((r) => r.status === "accepted" || r.status === "edited");
        if (accepted.length === 0) {
            ui.notifications.warn("SF3PL: No records are marked as accepted. Accept records before saving.");
            return;
        }
        const records = accepted.map((r) => this.extractedToContentRecord(r));
        try {
            const result = await ContentDatabase.importBatch(records, false);
            const saved = result.added.length;
            const skipped = result.skipped.length;
            ui.notifications.info(`SF3PL: Saved ${saved} record(s) to the database.` +
                (skipped > 0 ? ` ${skipped} duplicate(s) skipped.` : ""));
            ModuleLogger.info(`[ExtractionReview] Saved ${saved} records, skipped ${skipped}.`);
        }
        catch (err) {
            ModuleLogger.error(`[ExtractionReview] Database save failed: ${String(err)}`);
            ui.notifications.error("SF3PL: Database save failed. See console for details.");
        }
    }
    openReport() {
        Promise.resolve().then(function () { return extractionReport; })
            .then(({ ExtractionReportApp }) => {
            void new ExtractionReportApp(this.result, this.records).render(true);
        })
            .catch((err) => {
            ModuleLogger.error(`[ExtractionReview] Could not open report: ${String(err)}`);
        });
    }
    // ── Helpers ───────────────────────────────────────────────────────────────
    currentRecord() {
        return this.records[this.currentIndex] ?? null;
    }
    rebuildFilter() {
        this.filteredIndices = this.records
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => this.filter === "all" || r.status === this.filter)
            .map(({ i }) => i);
    }
    buildStatusCounts() {
        return this.records.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] ?? 0) + 1;
            return acc;
        }, { pending: 0, accepted: 0, rejected: 0, edited: 0 });
    }
    extractedToContentRecord(r) {
        const category = isValidCategory(r.category) ? r.category : "equipment";
        return {
            id: r.id,
            name: r.name,
            category,
            sourceBook: r.sourceBook,
            publisher: r.publisher,
            author: "",
            pageNumber: r.sourcePageNumber,
            tags: [...r.autoTags],
            notes: r.notes,
            rawContent: { ...r.structuredData, _rawText: r.rawText },
            importedDate: new Date().toISOString(),
            importMethod: "txt",
            schemaVersion: "2.0.0",
        };
    }
}

var extractionReview = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ExtractionReviewApp: ExtractionReviewApp
});

/**
 * Extraction Report Application — Milestone 5
 *
 * Displays a detailed per-run extraction report for a completed PDF import:
 *   - Pages processed, OCR pages, AI usage
 *   - Per-record table with name, category, status, confidence, detection method
 *   - Error log
 *   - Export as JSON button
 *
 * Opened from ExtractionReviewApp → "Open Report" or directly from PdfImportWizard history.
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
// ── ExtractionReportApp ───────────────────────────────────────────────────────
class ExtractionReportApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "sf3pl-extraction-report",
        title: "SF3PL: Extraction Report",
        classes: ["sf3pl-app", "sf3pl-extraction-report"],
        window: { resizable: true },
        position: { width: 820, height: 580 },
    };
    static PARTS = {
        main: {
            template: "modules/starfinder-thirdparty/templates/extraction-report.hbs",
        },
    };
    result;
    /** Working-copy records with updated statuses from review. */
    records;
    constructor(result, records) {
        super({});
        this.result = result;
        this.records = records ?? result.records;
    }
    // ── Context ───────────────────────────────────────────────────────────────
    async _prepareContext(_options) {
        const r = this.result;
        const records = this.records;
        const statusCounts = records.reduce((acc, rec) => {
            acc[rec.status] = (acc[rec.status] ?? 0) + 1;
            return acc;
        }, { pending: 0, accepted: 0, rejected: 0, edited: 0 });
        const methodCounts = records.reduce((acc, rec) => {
            acc[rec.detectionMethod] = (acc[rec.detectionMethod] ?? 0) + 1;
            return acc;
        }, { regex: 0, ai: 0, manual: 0 });
        const categoryCounts = {};
        for (const rec of records) {
            categoryCounts[rec.category] = (categoryCounts[rec.category] ?? 0) + 1;
        }
        const categoryRows = Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, count]) => ({ category: cat, count }));
        const recordRows = records.map((rec) => ({
            id: rec.id,
            name: rec.name,
            category: rec.category,
            status: rec.status,
            confidence: `${Math.round(rec.confidence * 100)}%`,
            confidenceNum: rec.confidence,
            confidenceClass: rec.confidence >= 0.8 ? "high" : rec.confidence >= 0.5 ? "medium" : "low",
            method: rec.detectionMethod,
            page: rec.sourcePageNumber,
        }));
        const errorRows = r.errors.map((e) => ({
            page: e.page,
            phase: e.phase,
            message: e.message,
            code: e.code,
        }));
        return {
            runId: r.runId,
            sourceFile: r.sourceFile,
            sourceBook: r.sourceBook,
            publisher: r.publisher,
            extractedAt: new Date(r.extractedAt).toLocaleString(),
            durationSec: (r.durationMs / 1000).toFixed(1),
            pages: {
                total: r.totalPages,
                processed: r.pagesProcessed,
                ocr: r.ocrPages,
                ocrPct: r.totalPages > 0
                    ? Math.round((r.ocrPages / r.totalPages) * 100)
                    : 0,
                avgOcrConfidence: Math.round(r.averageOcrConfidence),
            },
            ai: {
                used: r.aiUsed,
            },
            records: {
                total: records.length,
                rows: recordRows,
                statusCounts,
                methodCounts,
                categoryRows,
            },
            errors: {
                rows: errorRows,
                hasErrors: errorRows.length > 0,
            },
        };
    }
    // ── Event listeners ───────────────────────────────────────────────────────
    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
        html
            .querySelector("[data-action='export-json']")
            ?.addEventListener("click", () => this.exportJson());
    }
    // ── Actions ───────────────────────────────────────────────────────────────
    exportJson() {
        const payload = {
            runId: this.result.runId,
            sourceFile: this.result.sourceFile,
            sourceBook: this.result.sourceBook,
            publisher: this.result.publisher,
            extractedAt: this.result.extractedAt,
            durationMs: this.result.durationMs,
            totalPages: this.result.totalPages,
            pagesProcessed: this.result.pagesProcessed,
            ocrPages: this.result.ocrPages,
            aiUsed: this.result.aiUsed,
            records: this.records.map((r) => ({
                id: r.id,
                name: r.name,
                category: r.category,
                status: r.status,
                confidence: r.confidence,
                method: r.detectionMethod,
                page: r.sourcePageNumber,
                autoTags: r.autoTags,
            })),
            errors: this.result.errors,
        };
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sf3pl-extraction-report-${this.result.runId.slice(0, 8)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        ModuleLogger.info(`[ExtractionReport] Exported report for run ${this.result.runId}`);
        ui.notifications.info("SF3PL: Extraction report downloaded.");
    }
}

var extractionReport = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ExtractionReportApp: ExtractionReportApp
});
//# sourceMappingURL=starfinder-thirdparty.js.map
