/**
 * Actor schema validation rules for Starfinder content types.
 * Covers NPCs, Starships, Vehicles, and Hazards.
 */

import type { ContentType } from "../../types/module-types.js";
import type { ContentSchema } from "./item-schemas.js";

// ---------------------------------------------------------------------------
// Actor schemas
// ---------------------------------------------------------------------------

export const NPC_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  cr: { type: "number", required: true, min: 0.125, max: 30 },
  xp: { type: "number", min: 0 },
  hp: { type: "number", required: false, min: 1 },
  eac: { type: "number", min: 10 },
  kac: { type: "number", min: 10 },
  fort: { type: "number" },
  ref: { type: "number" },
  will: { type: "number" },
  alignment: { type: "string", enum: ["LG", "LN", "LE", "NG", "N", "NE", "CG", "CN", "CE", ""] },
  type: { type: "string" },
  str: { type: "number", min: 1 },
  dex: { type: "number", min: 1 },
  con: { type: "number", min: 1 },
  int: { type: "number", min: 1 },
  wis: { type: "number", min: 1 },
  cha: { type: "number", min: 1 },
};

export const STARSHIP_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  tier: { type: "number", required: true, min: 0.25, max: 20 },
  size: {
    type: "string",
    enum: ["tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"],
  },
  hp: { type: "number", min: 1 },
  speed: { type: "number", min: 1 },
  maneuverability: {
    type: "string",
    enum: ["clumsy", "poor", "average", "good", "perfect"],
  },
};

export const VEHICLE_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  level: { type: "number", required: true, min: 1, max: 20 },
  price: { type: "number", min: 0 },
  hp: { type: "number", min: 1 },
  eac: { type: "number", min: 10 },
  kac: { type: "number", min: 10 },
  landSpeed: { type: "number", min: 0 },
};

export const HAZARD_SCHEMA: ContentSchema = {
  name: { type: "string", required: true, minLength: 1 },
  cr: { type: "number", required: true, min: 0.125, max: 30 },
  type: {
    type: "string",
    enum: ["environmental", "haunt", "trap", "affliction", ""],
  },
  xp: { type: "number", min: 0 },
};

// ---------------------------------------------------------------------------
// Schema registry
// ---------------------------------------------------------------------------

export const ACTOR_SCHEMAS: Readonly<Partial<Record<ContentType, ContentSchema>>> = {
  npc: NPC_SCHEMA,
  starship: STARSHIP_SCHEMA,
  vehicle: VEHICLE_SCHEMA,
  hazard: HAZARD_SCHEMA,
};
