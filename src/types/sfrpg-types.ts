/**
 * Starfinder RPG (SFRPG) system-specific type definitions.
 * Based on the sfrpg Foundry VTT system data model (v0.25+).
 * These types model the `system` data object for SFRPG documents.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export interface SfrpgDescription {
  value: string;
  chat: string;
  unidentified: string;
}

export interface SfrpgQuantity {
  value: number;
  max: number;
}

/** Represents a numeric attribute with current/max values. */
export interface SfrpgAttribute {
  value: number;
  min: number;
  max: number;
}

export interface SfrpgDamageFormula {
  formula: string;
  /** Damage type (e.g. "B", "P", "S", "F", "E", "So", "C", "A", "Fo"). */
  type: SfrpgDamageType;
}

export type SfrpgDamageType = "B" | "P" | "S" | "F" | "E" | "So" | "C" | "A" | "Fo" | "";

export interface SfrpgCapacity {
  value: number;
  max: number;
}

// ---------------------------------------------------------------------------
// Item: Weapon
// ---------------------------------------------------------------------------

export interface SfrpgWeaponSystem {
  description: SfrpgDescription;
  source: string;
  type: "basic melee" | "advanced melee" | "small arm" | "longarm" | "heavy" | "sniper" | "special";
  subtype: string;
  level: number;
  price: number;
  bulk: string;
  weaponType: "ranged" | "melee" | "thrown";
  proficiencyType: "basic" | "advanced" | "longarm" | "heavy" | "sniper" | "special";
  damage: SfrpgDamageFormula[];
  critical: {
    parts: string[];
  };
  range: {
    value: number;
    units: "ft" | "m" | "";
  };
  capacity: SfrpgCapacity;
  usage: {
    value: number;
    per: "round" | "shot" | "";
  };
  special: string;
  properties: Record<string, boolean>;
  actionType: "mwak" | "rwak" | "";
  actionTarget: string;
  area: {
    value: number;
    units: "ft" | "m" | "";
    type: "sphere" | "cone" | "line" | "" ;
  };
  save: {
    type: "fort" | "ref" | "will" | "";
    dc: string;
    descriptor: string;
  };
  container: { contents: unknown[] };
  equipped: boolean;
  identified: boolean;
  quantity: number;
  rarity: "common" | "uncommon" | "rare" | "legendary" | "";
  chatFlavor: string;
  attuned: boolean;
}

// ---------------------------------------------------------------------------
// Item: Armor
// ---------------------------------------------------------------------------

export interface SfrpgArmorSystem {
  description: SfrpgDescription;
  source: string;
  type: "light" | "heavy" | "powered" | "shield";
  level: number;
  price: number;
  bulk: string;
  armor: {
    eac: number;
    kac: number;
    val: number;
    savant?: number;
  };
  maxDexBonus: number;
  armorCheckPenalty: number;
  speedAdjustment: number;
  upgradeSlots: number;
  upgrades: unknown[];
  equipped: boolean;
  identified: boolean;
  quantity: number;
  rarity: "common" | "uncommon" | "rare" | "legendary" | "";
  properties: Record<string, boolean>;
  container: { contents: unknown[] };
}

// ---------------------------------------------------------------------------
// Item: Equipment / Consumable / Technological / Magic / Hybrid
// ---------------------------------------------------------------------------

export interface SfrpgEquipmentSystem {
  description: SfrpgDescription;
  source: string;
  type: "equipment" | "consumable" | "technological" | "magic" | "hybrid" | "other";
  level: number;
  price: number;
  bulk: string;
  equipped: boolean;
  identified: boolean;
  quantity: number;
  capacity: SfrpgCapacity;
  usage: { value: number; per: string };
  rarity: "common" | "uncommon" | "rare" | "legendary" | "";
  container: { contents: unknown[] };
}

// ---------------------------------------------------------------------------
// Item: Augmentation
// ---------------------------------------------------------------------------

export interface SfrpgAugmentationSystem {
  description: SfrpgDescription;
  source: string;
  type: "biotech" | "cybernetic" | "magitech" | "necrografts" | "personal upgrade" | "racial";
  level: number;
  price: number;
  system: "brain" | "eyes" | "heart" | "lungs" | "arm" | "leg" | "all limbs" | "foot" | "hand" | "all hands" | "spinal" | "throat" | "skin" | "universal" | "";
  capacity: SfrpgCapacity;
  usage: { value: number; per: string };
  equipped: boolean;
  identified: boolean;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Item: Feat
// ---------------------------------------------------------------------------

export interface SfrpgFeatSystem {
  description: SfrpgDescription;
  source: string;
  type: "feat" | "combat" | "general" | "skill" | "racial" | "creature" | "companion";
  prerequisites: {
    value: string[];
  };
  activation: {
    type: "none" | "action" | "move" | "swift" | "full" | "reaction" | "round" | "minute" | "hour";
    cost: number;
    condition: string;
  };
  uses: {
    value: number;
    max: number;
    per: "sr" | "lr" | "day" | "turn" | "";
  };
  recharge: {
    value: string;
  };
  requirements: string;
  level: number;
}

// ---------------------------------------------------------------------------
// Item: Spell
// ---------------------------------------------------------------------------

export interface SfrpgSpellSystem {
  description: SfrpgDescription;
  source: string;
  level: number;
  school: "abj" | "con" | "div" | "enc" | "evo" | "ill" | "nec" | "trs" | "uni";
  components: {
    value: string;
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    focus: boolean;
    divineFocus: boolean;
  };
  lists: {
    mystic: number | null;
    technomancer: number | null;
    witchwarper: number | null;
    precog: number | null;
    [key: string]: number | null;
  };
  activation: {
    type: "action" | "move" | "swift" | "full" | "round" | "1" | "2" | "3";
    cost: number;
    condition: string;
  };
  duration: {
    value: string;
    units: "inst" | "turn" | "round" | "minute" | "hour" | "day" | "perm" | "spec" | "";
    concentration: boolean;
    dismissal: boolean;
    discharge: boolean;
  };
  target: {
    value: string;
  };
  range: {
    value: string;
    units: "personal" | "touch" | "close" | "medium" | "long" | "unlimited" | "ft" | "m" | "";
    additional: string;
  };
  area: {
    value: string;
    units: "ft" | "m" | "";
    type: "sphere" | "cylinder" | "cone" | "line" | "emanation" | "";
    shapable: boolean;
    effect: string;
  };
  save: {
    type: "fort" | "ref" | "will" | "none" | "";
    dc: string;
    descriptor: string;
  };
  sr: boolean;
  damage: SfrpgDamageFormula[];
  actionType: "save" | "util" | "heal" | "attack" | "abil" | "";
}

// ---------------------------------------------------------------------------
// Item: Class
// ---------------------------------------------------------------------------

export interface SfrpgClassSystem {
  description: SfrpgDescription;
  source: string;
  levels: number;
  bab: "slow" | "medium" | "fast";
  hpPerLevel: number;
  sp: number;
  skillRanksPerLevel: number;
  isMaster: boolean;
  proficiencies: {
    armor: string[];
    weapon: string[];
    saves: {
      fort: "slow" | "fast";
      ref: "slow" | "fast";
      will: "slow" | "fast";
    };
  };
  keyAbility: "str" | "dex" | "con" | "int" | "wis" | "cha";
}

// ---------------------------------------------------------------------------
// Item: Race (Species)
// ---------------------------------------------------------------------------

export interface SfrpgRaceSystem {
  description: SfrpgDescription;
  source: string;
  type: "humanoid" | "monstrous humanoid" | "aberration" | "construct" | "dragon" | "fey" | "magical beast" | "outsider" | "plant" | "undead" | "vermin" | string;
  subtype: string;
  hit_points: number;
  size: "fine" | "diminutive" | "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal";
  speed: {
    base: number;
    special: string;
  };
  abilityMods: {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
  };
  traits: string[];
  languages: {
    value: string[];
    custom: string;
  };
}

// ---------------------------------------------------------------------------
// Item: Theme
// ---------------------------------------------------------------------------

export interface SfrpgThemeSystem {
  description: SfrpgDescription;
  source: string;
  abilityMod: {
    ability: "str" | "dex" | "con" | "int" | "wis" | "cha" | "";
    value: number;
  };
}

// ---------------------------------------------------------------------------
// Actor: NPC
// ---------------------------------------------------------------------------

export interface SfrpgNpcSystem {
  description: SfrpgDescription;
  source: string;
  details: {
    alignment: string;
    race: string;
    class: string;
    environment: string;
    organization: string;
    cr: number;
    xp: { value: number };
    type: string;
    subtype: string;
    rarity: string;
  };
  attributes: {
    hp: SfrpgAttribute;
    sp: SfrpgAttribute;
    rp: SfrpgAttribute;
    eac: { value: number };
    kac: { value: number };
    cmd: { value: number };
    init: { value: number; total: number };
    bab: { value: number };
    fort: { value: number };
    ref: { value: number };
    will: { value: number };
    speed: {
      value: string;
      special: string;
      land: { base: number };
      fly: { base: number; maneuverability: string };
      swim: { base: number };
      burrow: { base: number };
      climb: { base: number };
    };
    senses: { darkvision: number; lowlightVision: boolean; blindsense: number; blindsight: number; senseText: string };
  };
  abilities: {
    str: { value: number; mod: number };
    dex: { value: number; mod: number };
    con: { value: number; mod: number };
    int: { value: number; mod: number };
    wis: { value: number; mod: number };
    cha: { value: number; mod: number };
  };
  skills: Record<string, { enabled: boolean; value: number; mod: number; ranks: number }>;
}

// ---------------------------------------------------------------------------
// Actor: Starship
// ---------------------------------------------------------------------------

export interface SfrpgStarshipSystem {
  description: SfrpgDescription;
  source: string;
  details: {
    tier: number;
    frame: string;
    size: "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal";
    shields: string;
    cost: number;
    buildPoints: number;
  };
  attributes: {
    hp: SfrpgAttribute;
    shields: { forward: number; starboard: number; aft: number; port: number; total: number };
    powerCoreUnits: number;
    speed: number;
    maneuverability: "clumsy" | "poor" | "average" | "good" | "perfect";
    acPiloting: number;
    acTargeting: number;
    driftEngine: string;
    expansionBays: number;
  };
  crew: {
    captain: { actors: unknown[] };
    pilot: { actors: unknown[] };
    gunner: { actors: unknown[] };
    engineer: { actors: unknown[] };
    chiefMate: { actors: unknown[] };
    magicOfficer: { actors: unknown[] };
    scienceOfficer: { actors: unknown[] };
  };
}

// ---------------------------------------------------------------------------
// Actor: Vehicle
// ---------------------------------------------------------------------------

export interface SfrpgVehicleSystem {
  description: SfrpgDescription;
  source: string;
  details: {
    type: string;
    level: number;
    price: number;
    bulk: string;
    passengers: number;
    cargo: number;
    hardness: number;
  };
  attributes: {
    hp: SfrpgAttribute;
    speed: {
      land: number;
      water: number;
      air: number;
      ftl: boolean;
    };
    eac: { value: number };
    kac: { value: number };
  };
}

// ---------------------------------------------------------------------------
// Actor: Hazard
// ---------------------------------------------------------------------------

export interface SfrpgHazardSystem {
  description: SfrpgDescription;
  source: string;
  details: {
    type: "environmental" | "haunt" | "trap" | "affliction";
    subtype: string;
    cr: number;
    xp: { value: number };
    rarity: string;
    reset: string;
  };
  attributes: {
    perception: { dc: number };
    disable: { dc: number; skill: string };
    trigger: string;
    effect: string;
    save: { type: string; dc: number };
  };
}

// ---------------------------------------------------------------------------
// Union types for adapters
// ---------------------------------------------------------------------------

export type SfrpgItemSystem =
  | SfrpgWeaponSystem
  | SfrpgArmorSystem
  | SfrpgEquipmentSystem
  | SfrpgAugmentationSystem
  | SfrpgFeatSystem
  | SfrpgSpellSystem
  | SfrpgClassSystem
  | SfrpgRaceSystem
  | SfrpgThemeSystem;

export type SfrpgActorSystem =
  | SfrpgNpcSystem
  | SfrpgStarshipSystem
  | SfrpgVehicleSystem
  | SfrpgHazardSystem;
