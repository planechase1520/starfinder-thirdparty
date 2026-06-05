/**
 * Compendium pack configuration.
 *
 * Maps logical content types to Foundry compendium pack identifiers.
 * The pack names here must match the `name` fields in module.json.
 */

import type { ContentType } from "../types/module-types.js";

export interface PackConfig {
  /** Foundry pack name (as registered in module.json, without module prefix). */
  packName: string;
  /** Full Foundry pack ID in format "module-id.pack-name". */
  packId: string;
  /** Human-readable label. */
  label: string;
  /** Foundry document type stored in this pack. */
  documentType: "Item" | "Actor" | "JournalEntry";
  /** Content types this pack handles. */
  contentTypes: ContentType[];
}

const MODULE_ID = "starfinder-thirdparty";

/**
 * Compendium pack configurations, keyed by the primary content type.
 * A pack may handle multiple content types (e.g. starship weapons are items).
 */
export const PACK_CONFIGS: Readonly<Record<string, PackConfig>> = {
  "sftpl-weapons": {
    packName: "sftpl-weapons",
    packId: `${MODULE_ID}.sftpl-weapons`,
    label: "SF3PL: Weapons",
    documentType: "Item",
    contentTypes: ["weapon"],
  },
  "sftpl-armor": {
    packName: "sftpl-armor",
    packId: `${MODULE_ID}.sftpl-armor`,
    label: "SF3PL: Armor",
    documentType: "Item",
    contentTypes: ["armor"],
  },
  "sftpl-equipment": {
    packName: "sftpl-equipment",
    packId: `${MODULE_ID}.sftpl-equipment`,
    label: "SF3PL: Equipment",
    documentType: "Item",
    contentTypes: ["equipment"],
  },
  "sftpl-augmentations": {
    packName: "sftpl-augmentations",
    packId: `${MODULE_ID}.sftpl-augmentations`,
    label: "SF3PL: Augmentations",
    documentType: "Item",
    contentTypes: ["augmentation"],
  },
  "sftpl-feats": {
    packName: "sftpl-feats",
    packId: `${MODULE_ID}.sftpl-feats`,
    label: "SF3PL: Feats",
    documentType: "Item",
    contentTypes: ["feat"],
  },
  "sftpl-spells": {
    packName: "sftpl-spells",
    packId: `${MODULE_ID}.sftpl-spells`,
    label: "SF3PL: Spells",
    documentType: "Item",
    contentTypes: ["spell"],
  },
  "sftpl-species": {
    packName: "sftpl-species",
    packId: `${MODULE_ID}.sftpl-species`,
    label: "SF3PL: Species",
    documentType: "Item",
    contentTypes: ["race"],
  },
  "sftpl-themes": {
    packName: "sftpl-themes",
    packId: `${MODULE_ID}.sftpl-themes`,
    label: "SF3PL: Themes",
    documentType: "Item",
    contentTypes: ["theme"],
  },
  "sftpl-classes": {
    packName: "sftpl-classes",
    packId: `${MODULE_ID}.sftpl-classes`,
    label: "SF3PL: Classes",
    documentType: "Item",
    contentTypes: ["class"],
  },
  "sftpl-archetypes": {
    packName: "sftpl-archetypes",
    packId: `${MODULE_ID}.sftpl-archetypes`,
    label: "SF3PL: Archetypes",
    documentType: "Item",
    contentTypes: ["archetypeFeature"],
  },
  "sftpl-vehicles": {
    packName: "sftpl-vehicles",
    packId: `${MODULE_ID}.sftpl-vehicles`,
    label: "SF3PL: Vehicles",
    documentType: "Actor",
    contentTypes: ["vehicle"],
  },
  "sftpl-starships": {
    packName: "sftpl-starships",
    packId: `${MODULE_ID}.sftpl-starships`,
    label: "SF3PL: Starships",
    documentType: "Actor",
    contentTypes: ["starship"],
  },
  "sftpl-npcs": {
    packName: "sftpl-npcs",
    packId: `${MODULE_ID}.sftpl-npcs`,
    label: "SF3PL: NPCs",
    documentType: "Actor",
    contentTypes: ["npc"],
  },
  "sftpl-hazards": {
    packName: "sftpl-hazards",
    packId: `${MODULE_ID}.sftpl-hazards`,
    label: "SF3PL: Hazards",
    documentType: "Actor",
    contentTypes: ["hazard"],
  },
  "sftpl-journals": {
    packName: "sftpl-journals",
    packId: `${MODULE_ID}.sftpl-journals`,
    label: "SF3PL: Journals",
    documentType: "JournalEntry",
    contentTypes: ["journal"],
  },
} as const;

/**
 * Finds the appropriate pack configuration for a content type.
 * @param contentType The logical content type to look up.
 * @returns The PackConfig if found, or undefined.
 */
export function getPackForContentType(contentType: ContentType): PackConfig | undefined {
  for (const config of Object.values(PACK_CONFIGS)) {
    if (config.contentTypes.includes(contentType)) return config;
  }
  return undefined;
}
