/**
 * Item schema validation rules for Starfinder content types.
 *
 * Each schema defines:
 *   - required: fields that must be present and non-empty
 *   - optional: fields that may be present with type expectations
 *   - enums: fields that must be one of a specified set of values
 *   - numeric: fields that must be a number within an optional range
 */

import type { ContentType } from "../../types/module-types.js";

// ---------------------------------------------------------------------------
// Schema definition types
// ---------------------------------------------------------------------------

export interface FieldSchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  min?: number;
  max?: number;
  enum?: readonly string[];
  minLength?: number;
}

export type ContentSchema = Record<string, FieldSchema>;

// ---------------------------------------------------------------------------
// Item schemas
// ---------------------------------------------------------------------------

export const WEAPON_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  level: { type: "number", required: true, min: 1, max: 20 },
  price: { type: "number", min: 0 },
  bulk: { type: "string" },
  type: { type: "string", required: true, enum: ["basic melee", "advanced melee", "small arm", "longarm", "heavy", "sniper", "special"] },
  weaponType: { type: "string", required: true, enum: ["ranged", "melee", "thrown"] },
  damage: { type: "string" },
  range: { type: "number", min: 0 },
  capacity: { type: "number", min: 0 },
  usage: { type: "number", min: 1 },
  rarity: { type: "string", enum: ["common", "uncommon", "rare", "legendary", ""] },
};

export const ARMOR_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  level: { type: "number", required: true, min: 1, max: 20 },
  price: { type: "number", min: 0 },
  bulk: { type: "string" },
  type: { type: "string", required: true, enum: ["light", "heavy", "powered", "shield"] },
  eac: { type: "number", required: true },
  kac: { type: "number", required: true },
  maxDex: { type: "number" },
  acp: { type: "number" },
  speedAdjust: { type: "number" },
  upgradeSlots: { type: "number", min: 0 },
  rarity: { type: "string", enum: ["common", "uncommon", "rare", "legendary", ""] },
};

export const EQUIPMENT_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  level: { type: "number", required: true, min: 1, max: 20 },
  price: { type: "number", min: 0 },
  bulk: { type: "string" },
  type: { type: "string", enum: ["equipment", "consumable", "technological", "magic", "hybrid", "other"] },
  rarity: { type: "string", enum: ["common", "uncommon", "rare", "legendary", ""] },
};

export const AUGMENTATION_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  level: { type: "number", required: true, min: 1, max: 20 },
  price: { type: "number", min: 0 },
  type: { type: "string", required: true, enum: ["biotech", "cybernetic", "magitech", "necrografts", "personal upgrade", "racial"] },
  system: { type: "string", required: true },
};

export const FEAT_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  type: { type: "string", enum: ["feat", "combat", "general", "skill", "racial", "creature", "companion"] },
};

export const SPELL_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  level: { type: "number", required: true, min: 0, max: 6 },
  school: { type: "string", required: true, enum: ["abj", "con", "div", "enc", "evo", "ill", "nec", "trs", "uni"] },
};

export const RACE_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  hp: { type: "number", min: 0 },
  size: { type: "string", enum: ["fine", "diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"] },
  speed: { type: "number", min: 0 },
};

export const THEME_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
};

export const CLASS_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  hpPerLevel: { type: "number", required: true, min: 1 },
  bab: { type: "string", required: true, enum: ["slow", "medium", "fast"] },
  skillRanksPerLevel: { type: "number", min: 1 },
  keyAbility: { type: "string", enum: ["str", "dex", "con", "int", "wis", "cha"] },
};

export const ARCHETYPE_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
};

export const JOURNAL_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
};

// ---------------------------------------------------------------------------
// Schema registry
// ---------------------------------------------------------------------------

export const ITEM_SCHEMAS: Readonly<Partial<Record<ContentType, ContentSchema>>> = {
  weapon: WEAPON_SCHEMA,
  armor: ARMOR_SCHEMA,
  equipment: EQUIPMENT_SCHEMA,
  augmentation: AUGMENTATION_SCHEMA,
  feat: FEAT_SCHEMA,
  spell: SPELL_SCHEMA,
  race: RACE_SCHEMA,
  theme: THEME_SCHEMA,
  class: CLASS_SCHEMA,
  archetypeFeature: ARCHETYPE_SCHEMA,
  journal: JOURNAL_SCHEMA,
};
