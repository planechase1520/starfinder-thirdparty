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

import type { ContentCategory } from "../database/content-record.js";
import type { MappingRule, ExactRule } from "./MappingRules.js";
import { SchemaRegistry } from "../schema/SchemaRegistry.js";
import { ModuleLogger } from "../utils/logger.js";

// ── Profile shape ─────────────────────────────────────────────────────────────

export interface MappingProfile {
  /** ContentCategory this profile applies to. */
  category: ContentCategory;
  /** Foundry document type produced. */
  documentType: "Item" | "Actor" | "JournalEntry";
  /** SFRPG document subtype, e.g. "weapon", "npc2". */
  sfrpgSubtype: string;
  /** Hash of the schema this profile was built against. */
  schemaHash: string;
  /** When this profile was last (re)built. */
  builtAt: string;
  /** The ordered mapping rules. */
  rules: MappingRule[];
}

// ── Static mapping of category → doc type ────────────────────────────────────

const CATEGORY_DOC_MAP: Partial<Record<ContentCategory, { documentType: "Item" | "Actor"; subtype: string }>> = {
  weapon:           { documentType: "Item",  subtype: "weapon" },
  armor:            { documentType: "Item",  subtype: "armor" },
  equipment:        { documentType: "Item",  subtype: "equipment" },
  augmentation:     { documentType: "Item",  subtype: "augmentation" },
  feat:             { documentType: "Item",  subtype: "feat" },
  spell:            { documentType: "Item",  subtype: "spell" },
  race:             { documentType: "Item",  subtype: "race" },
  theme:            { documentType: "Item",  subtype: "theme" },
  class:            { documentType: "Item",  subtype: "class" },
  archetypeFeature: { documentType: "Item",  subtype: "archetypeFeature" },
  npc:              { documentType: "Actor", subtype: "npc2" },
  vehicle:          { documentType: "Actor", subtype: "vehicle" },
  starship:         { documentType: "Actor", subtype: "starship" },
  hazard:           { documentType: "Actor", subtype: "hazard" },
};

// ── Base rules derived from config JSON files ─────────────────────────────────

/**
 * The base rules loaded from config/[category]-mapping.json files.
 * These are the same field mappings the M3 converters use, expressed as
 * MappingRule objects so the MappingEngine can execute them.
 */
const BASE_RULES: Partial<Record<ContentCategory, MappingRule[]>> = {
  weapon: [
    { kind: "alias",     targetPath: "level",               sourceKeys: ["level"],              coerce: "number", defaultValue: 1 },
    { kind: "alias",     targetPath: "price",               sourceKeys: ["price"],              coerce: "number", defaultValue: 0 },
    { kind: "alias",     targetPath: "quantity",            sourceKeys: ["quantity"],           coerce: "number", defaultValue: 1 },
    { kind: "transform", targetPath: "bulk",                sourceKey:  "bulk",                 transformName: "parseBulk", defaultValue: 1 },
    { kind: "alias",     targetPath: "damage[0].formula",   sourceKeys: ["damage", "damageFormula"], coerce: "string", defaultValue: "1d6" },
    { kind: "alias",     targetPath: "range.value",         sourceKeys: ["range"],              coerce: "number", defaultValue: 30 },
    { kind: "alias",     targetPath: "capacity.max",        sourceKeys: ["capacity"],           coerce: "number", defaultValue: 20 },
    { kind: "alias",     targetPath: "usage.value",         sourceKeys: ["usage"],             coerce: "number", defaultValue: 1 },
    { kind: "alias",     targetPath: "special",             sourceKeys: ["special"],            coerce: "string", defaultValue: "" },
    { kind: "alias",     targetPath: "rarity",              sourceKeys: ["rarity"],             coerce: "string", defaultValue: "common" },
    { kind: "alias",     targetPath: "description.value",   sourceKeys: ["description"],        coerce: "string", defaultValue: "" },
    { kind: "default",   targetPath: "equipped",            value: false },
    { kind: "default",   targetPath: "proficient",          value: false },
  ] as MappingRule[],

  armor: [
    { kind: "alias",     targetPath: "level",               sourceKeys: ["level"],              coerce: "number", defaultValue: 1 },
    { kind: "alias",     targetPath: "price",               sourceKeys: ["price"],              coerce: "number", defaultValue: 0 },
    { kind: "alias",     targetPath: "quantity",            sourceKeys: ["quantity"],           coerce: "number", defaultValue: 1 },
    { kind: "transform", targetPath: "bulk",                sourceKey:  "bulk",                 transformName: "parseBulk", defaultValue: 1 },
    { kind: "alias",     targetPath: "armor.eac",           sourceKeys: ["eac"],                coerce: "number", defaultValue: 0 },
    { kind: "alias",     targetPath: "armor.kac",           sourceKeys: ["kac"],                coerce: "number", defaultValue: 0 },
    { kind: "transform", targetPath: "maxDexBonus",         sourceKey:  "maxDex",               transformName: "parseMaxDex", defaultValue: 99 },
    { kind: "alias",     targetPath: "armorCheckPenalty",   sourceKeys: ["acp","armorCheckPenalty"], coerce: "number", defaultValue: 0 },
    { kind: "alias",     targetPath: "upgradeSlots",        sourceKeys: ["upgradeSlots"],       coerce: "number", defaultValue: 0 },
    { kind: "alias",     targetPath: "description.value",   sourceKeys: ["description"],        coerce: "string", defaultValue: "" },
    { kind: "default",   targetPath: "equipped",            value: false },
  ] as MappingRule[],

  feat: [
    { kind: "alias",     targetPath: "description.value",   sourceKeys: ["description"],        coerce: "string", defaultValue: "" },
    { kind: "transform", targetPath: "prerequisites.parts", sourceKey:  "prerequisites",        transformName: "parseList", defaultValue: [] },
    { kind: "alias",     targetPath: "activation.type",     sourceKeys: ["activation"],         coerce: "string", defaultValue: "passive" },
    { kind: "alias",     targetPath: "rarity",              sourceKeys: ["rarity"],             coerce: "string", defaultValue: "common" },
  ] as MappingRule[],

  spell: [
    { kind: "alias",     targetPath: "level",               sourceKeys: ["level"],              coerce: "number", defaultValue: 1 },
    { kind: "alias",     targetPath: "school",              sourceKeys: ["school"],             coerce: "string", defaultValue: "uni" },
    { kind: "alias",     targetPath: "range.value",         sourceKeys: ["range"],              coerce: "string", defaultValue: "" },
    { kind: "alias",     targetPath: "duration.value",      sourceKeys: ["duration"],           coerce: "string", defaultValue: "" },
    { kind: "alias",     targetPath: "save.type",           sourceKeys: ["save","savingThrow"], coerce: "string", defaultValue: "" },
    { kind: "alias",     targetPath: "sr",                  sourceKeys: ["sr"],                 coerce: "boolean", defaultValue: false },
    { kind: "alias",     targetPath: "description.value",   sourceKeys: ["description"],        coerce: "string", defaultValue: "" },
  ] as MappingRule[],

  npc: [
    { kind: "transform", targetPath: "details.cr",          sourceKey: "cr",                   transformName: "parseCR", defaultValue: 1 },
    { kind: "alias",     targetPath: "details.alignment",   sourceKeys: ["alignment"],          coerce: "string", defaultValue: "n" },
    { kind: "transform", targetPath: "details.size",        sourceKey: "size",                  transformName: "parseSize", defaultValue: "medium" },
    { kind: "alias",     targetPath: "attributes.eac.value",sourceKeys: ["eac"],               coerce: "number", defaultValue: 10 },
    { kind: "alias",     targetPath: "attributes.kac.value",sourceKeys: ["kac"],               coerce: "number", defaultValue: 10 },
    { kind: "alias",     targetPath: "attributes.hp.max",   sourceKeys: ["hp"],                coerce: "number", defaultValue: 6 },
    { kind: "alias",     targetPath: "attributes.fort.bonus",sourceKeys: ["fort"],              coerce: "number", defaultValue: 0 },
    { kind: "alias",     targetPath: "attributes.reflex.bonus",sourceKeys: ["ref"],            coerce: "number", defaultValue: 0 },
    { kind: "alias",     targetPath: "attributes.will.bonus",sourceKeys: ["will"],             coerce: "number", defaultValue: 0 },
    { kind: "alias",     targetPath: "abilities.str.value", sourceKeys: ["str"],               coerce: "number", defaultValue: 10 },
    { kind: "alias",     targetPath: "abilities.dex.value", sourceKeys: ["dex"],               coerce: "number", defaultValue: 10 },
    { kind: "alias",     targetPath: "abilities.con.value", sourceKeys: ["con"],               coerce: "number", defaultValue: 10 },
    { kind: "alias",     targetPath: "abilities.int.value", sourceKeys: ["int"],               coerce: "number", defaultValue: 10 },
    { kind: "alias",     targetPath: "abilities.wis.value", sourceKeys: ["wis"],               coerce: "number", defaultValue: 10 },
    { kind: "alias",     targetPath: "abilities.cha.value", sourceKeys: ["cha"],               coerce: "number", defaultValue: 10 },
    { kind: "alias",     targetPath: "speed.value",         sourceKeys: ["speed"],             coerce: "number", defaultValue: 30 },
    { kind: "alias",     targetPath: "details.biography.value",sourceKeys: ["description"],   coerce: "string", defaultValue: "" },
  ] as MappingRule[],
};

// ── Profile registry ──────────────────────────────────────────────────────────

export class MappingProfiles {
  private static readonly profiles = new Map<ContentCategory, MappingProfile>();

  /**
   * Returns the profile for a category, building it first if not cached.
   */
  static get(category: ContentCategory): MappingProfile | undefined {
    if (!this.profiles.has(category)) {
      this.build(category);
    }
    return this.profiles.get(category);
  }

  /**
   * Builds (or rebuilds) the profile for a category by combining base rules
   * with schema-derived defaults.
   */
  static build(category: ContentCategory): MappingProfile | null {
    const mapping = CATEGORY_DOC_MAP[category];
    if (!mapping) return null;

    const schema = SchemaRegistry.get(mapping.documentType, mapping.subtype);
    const baseRules: MappingRule[] = [...(BASE_RULES[category] ?? [])];

    // Auto-generate ExactRule entries for schema fields not covered by base rules
    if (schema) {
      const coveredTargets = new Set(baseRules.map((r) => r.targetPath));
      for (const field of schema.fields) {
        if (!coveredTargets.has(field.path) && field.defaultValue !== null && field.defaultValue !== undefined) {
          const autoRule: ExactRule = {
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

    const profile: MappingProfile = {
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
  static buildAll(): void {
    for (const category of Object.keys(CATEGORY_DOC_MAP) as ContentCategory[]) {
      this.build(category);
    }
    ModuleLogger.info(`[MappingProfiles] Rebuilt ${this.profiles.size} profile(s).`);
  }

  /**
   * Serializes all profiles to JSON for export.
   */
  static toJson(): string {
    const obj: Record<string, MappingProfile> = {};
    for (const [cat, profile] of this.profiles) {
      obj[cat] = profile;
    }
    return JSON.stringify(obj, null, 2);
  }

  static getAllProfiles(): MappingProfile[] {
    return [...this.profiles.values()];
  }

  static clear(): void {
    this.profiles.clear();
  }

  static isStale(category: ContentCategory): boolean {
    const profile = this.profiles.get(category);
    if (!profile) return true;

    const mapping = CATEGORY_DOC_MAP[category];
    if (!mapping) return false;

    const schema = SchemaRegistry.get(mapping.documentType, mapping.subtype);
    return !!schema && schema.schemaHash !== profile.schemaHash;
  }
}
