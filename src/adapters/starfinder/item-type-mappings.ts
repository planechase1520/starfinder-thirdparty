/**
 * Starfinder 1E item and actor type mappings.
 *
 * Maps logical content types to SFRPG system type strings and
 * Foundry document types. This file is the single source of truth
 * for type identity in the Starfinder adapter.
 *
 * When the SFRPG system changes type names, update only this file.
 */

import type { ContentType } from "../../types/module-types.js";

/** Maps a logical ContentType to the SFRPG item type string. */
export const SFRPG_ITEM_TYPE_MAP: Readonly<Record<string, string>> = {
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
} as const;

/** Maps a logical ContentType to the SFRPG actor type string. */
export const SFRPG_ACTOR_TYPE_MAP: Readonly<Record<string, string>> = {
  npc: "npc",
  vehicle: "vehicle",
  starship: "starship",
  hazard: "hazard",
} as const;

/** Determines the Foundry document type for a given content type. */
export function getDocumentTypeForContent(contentType: ContentType): "Item" | "Actor" | "JournalEntry" {
  if (contentType === "journal") return "JournalEntry";
  if (contentType in SFRPG_ACTOR_TYPE_MAP) return "Actor";
  return "Item";
}

/** Returns the system-specific type string for a content type. */
export function getSfrpgSystemType(contentType: ContentType): string {
  if (contentType === "journal") return "journal";
  if (contentType in SFRPG_ITEM_TYPE_MAP) return SFRPG_ITEM_TYPE_MAP[contentType]!;
  if (contentType in SFRPG_ACTOR_TYPE_MAP) return SFRPG_ACTOR_TYPE_MAP[contentType]!;
  return contentType;
}

/**
 * Required fields per content type for validation.
 * Field names use dot-notation for nested paths.
 */
export const SFRPG_REQUIRED_FIELDS: Readonly<Record<ContentType, string[]>> = {
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
} as const;

/**
 * Weapon type strings recognized by the SFRPG system.
 */
export const SFRPG_WEAPON_TYPES = [
  "basic melee",
  "advanced melee",
  "small arm",
  "longarm",
  "heavy",
  "sniper",
  "special",
] as const;

/** Armor type strings recognized by the SFRPG system. */
export const SFRPG_ARMOR_TYPES = ["light", "heavy", "powered", "shield"] as const;

/** Spell schools recognized by the SFRPG system. */
export const SFRPG_SPELL_SCHOOLS = ["abj", "con", "div", "enc", "evo", "ill", "nec", "trs", "uni"] as const;

/** Augmentation types recognized by the SFRPG system. */
export const SFRPG_AUGMENTATION_TYPES = [
  "biotech",
  "cybernetic",
  "magitech",
  "necrografts",
  "personal upgrade",
  "racial",
] as const;
