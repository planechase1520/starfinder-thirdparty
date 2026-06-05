/**
 * Starfinder 1E System Adapter
 *
 * Transforms raw parsed data into SFRPG-compatible Foundry document data.
 * Uses schema-mappings.json for field-level mapping (updateable without
 * code changes) and item-type-mappings.ts for type identity resolution.
 */

import type { ISystemAdapter, AdapterInfo, TransformResult } from "../system-adapter.interface.js";
import type {
  ContentType,
  ParsedEntry,
  TransformedDocument,
  RawFieldRecord,
  ParseError,
  ParseWarning,
  ImportMetadata,
} from "../../types/module-types.js";
import {
  getDocumentTypeForContent,
  getSfrpgSystemType,
  SFRPG_REQUIRED_FIELDS,
} from "./item-type-mappings.js";
import schemaMappings from "./schema-mappings.json" assert { type: "json" };
import { ModuleLogger } from "../../utils/logger.js";

// ---------------------------------------------------------------------------
// Default system data skeletons
// ---------------------------------------------------------------------------

/** Returns a minimal valid SFRPG description block. */
function emptyDescription(): RawFieldRecord {
  return { value: "", chat: "", unidentified: "" };
}

/** Default system data skeletons per content type. */
const DEFAULT_SYSTEM_DATA: Record<ContentType, RawFieldRecord> = {
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

// ---------------------------------------------------------------------------
// StarfinderAdapter
// ---------------------------------------------------------------------------

/** Type for schema mapping field map. */
type FieldMap = Record<string, string>;

export class StarfinderAdapter implements ISystemAdapter {
  readonly info: AdapterInfo = {
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

  private readonly fieldMappings: Record<string, FieldMap>;

  constructor() {
    // Pull the fieldMappings section from the JSON config
    this.fieldMappings = (schemaMappings as { fieldMappings: Record<string, FieldMap> }).fieldMappings;
  }

  supportsContentType(contentType: ContentType): boolean {
    return this.info.supportedTypes.includes(contentType);
  }

  getDocumentType(contentType: ContentType): "Item" | "Actor" | "JournalEntry" {
    return getDocumentTypeForContent(contentType);
  }

  getSystemType(contentType: ContentType): string {
    return getSfrpgSystemType(contentType);
  }

  getRequiredFields(contentType: ContentType): string[] {
    return SFRPG_REQUIRED_FIELDS[contentType] ?? [];
  }

  createEmptySystemData(contentType: ContentType): RawFieldRecord {
    const skeleton = DEFAULT_SYSTEM_DATA[contentType];
    return structuredClone(skeleton) as RawFieldRecord;
  }

  // -------------------------------------------------------------------------
  // Main transform method
  // -------------------------------------------------------------------------

  transform(entry: ParsedEntry): TransformResult {
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];

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
      const document: TransformedDocument = {
        documentType,
        systemType,
        name,
        system: systemData,
        metadata,
        source: entry,
      };

      ModuleLogger.debug(`[StarfinderAdapter] Transformed ${entry.contentType}: ${name}`);
      return { document, errors: [], warnings };

    } catch (err: unknown) {
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
  private applyFieldMappings(
    sourceData: RawFieldRecord,
    fieldMap: FieldMap,
    targetData: RawFieldRecord,
    warnings: ParseWarning[],
    sourceRef?: string
  ): void {
    for (const [sourceKey, targetPath] of Object.entries(fieldMap)) {
      if (sourceKey === "name") continue; // handled separately

      const rawValue = sourceData[sourceKey];
      if (rawValue === undefined || rawValue === null || rawValue === "") continue;

      // Skip paths that go into the target root (non-system paths are unusual)
      if (!targetPath.startsWith("system.") && targetPath !== "name") {
        continue;
      }

      // Strip the "system." prefix since we're writing into systemData
      const path = targetPath.startsWith("system.") ? targetPath.slice(7) : targetPath;

      try {
        this.setNestedValue(targetData, path, rawValue);
      } catch {
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
  private setNestedValue(obj: RawFieldRecord, path: string, value: unknown): void {
    const parts = path.split(".");
    let current: RawFieldRecord = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as RawFieldRecord;
    }

    const lastPart = parts[parts.length - 1]!;
    current[lastPart] = value as import("../../types/module-types.js").RawFieldValue;
  }

  /** Resolves a raw value to a string or undefined. */
  private resolveString(value: unknown): string | undefined {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number") return String(value);
    return undefined;
  }

  /** Builds ImportMetadata from a ParsedEntry. */
  private buildMetadata(entry: ParsedEntry): ImportMetadata {
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
