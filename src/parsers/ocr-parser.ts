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

import type { IParser } from "./parser.interface.js";
import type {
  ParseResult,
  ParsedEntry,
  ParserOptions,
  ContentType,
  ParseError,
  ParseWarning,
  RawFieldRecord,
  RawFieldValue,
} from "../types/module-types.js";

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

export interface OcrTemplate {
  /** Unique identifier for this template. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Content type this template produces. */
  contentType: ContentType;
  /**
   * Array of extraction rules. Each rule is applied in order.
   * The first matching rule wins for each field.
   */
  rules: OcrExtractionRule[];
}

export interface OcrExtractionRule {
  /** The output field name in the ParsedEntry data object. */
  fieldName: string;
  /** Regex pattern with an optional named capture group `value`. */
  pattern: string;
  /** Flags for the regex (default: "im"). */
  flags?: string;
  /** Transform to apply to the extracted value. */
  transform?: "number" | "trim" | "lowercase" | "uppercase";
}

// ---------------------------------------------------------------------------
// Built-in SFRPG templates
// ---------------------------------------------------------------------------

const SFRPG_WEAPON_TEMPLATE: OcrTemplate = {
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

const SFRPG_ARMOR_TEMPLATE: OcrTemplate = {
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

const SFRPG_NPC_TEMPLATE: OcrTemplate = {
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

export class OcrParser implements IParser {
  readonly type = "ocr" as const;
  readonly displayName = "OCR / PDF Text Import";
  readonly acceptedExtensions = [".txt"];

  /** Template registry. */
  private static readonly templates = new Map<string, OcrTemplate>([
    [SFRPG_WEAPON_TEMPLATE.id, SFRPG_WEAPON_TEMPLATE],
    [SFRPG_ARMOR_TEMPLATE.id, SFRPG_ARMOR_TEMPLATE],
    [SFRPG_NPC_TEMPLATE.id, SFRPG_NPC_TEMPLATE],
  ]);

  /** Registers a custom template for OCR extraction. */
  static registerTemplate(template: OcrTemplate): void {
    OcrParser.templates.set(template.id, template);
  }

  /** Returns all registered template IDs. */
  static getTemplateIds(): string[] {
    return [...OcrParser.templates.keys()];
  }

  canHandleFile(fileName: string): boolean {
    return fileName.endsWith(".txt");
  }

  parse(input: string, options?: ParserOptions): ParseResult {
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    const entries: ParsedEntry[] = [];

    if (!input.trim()) {
      errors.push({ code: "EMPTY_INPUT", message: "OCR input is empty.", severity: "error" });
      return { entries, errors, warnings };
    }

    // Select a template
    const templateId = options?.ocrTemplate;
    const contentType = options?.defaultContentType ?? "equipment";

    let template: OcrTemplate | undefined;
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
      const data = this.extractFromBlock(block, template!.rules, warnings, ref);

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
        contentType: template!.contentType,
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

  private extractFromBlock(
    text: string,
    rules: OcrExtractionRule[],
    warnings: ParseWarning[],
    ref: string
  ): RawFieldRecord {
    const data: RawFieldRecord = {};

    for (const rule of rules) {
      try {
        const flags = rule.flags ?? "im";
        const regex = new RegExp(rule.pattern, flags);
        const match = regex.exec(text);

        if (match?.groups?.["value"] !== undefined) {
          const raw = match.groups["value"].trim();
          data[rule.fieldName] = this.applyTransform(raw, rule.transform);
        }
      } catch (err: unknown) {
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

  private applyTransform(value: string, transform?: OcrExtractionRule["transform"]): RawFieldValue {
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
