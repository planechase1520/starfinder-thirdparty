import { PromptManager } from "./PromptManager.js";

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
