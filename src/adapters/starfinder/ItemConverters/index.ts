/**
 * Item Converters Index — Milestone 3
 *
 * Exports all SFRPG item category converters and provides a convenience
 * factory function that returns a pre-constructed array of all item converters
 * for registration in the ConverterRegistry.
 */

export { WeaponConverter } from "./weapon-converter.js";
export { ArmorConverter } from "./armor-converter.js";
export { EquipmentConverter } from "./equipment-converter.js";
export { AugmentationConverter } from "./augmentation-converter.js";
export { FeatConverter } from "./feat-converter.js";
export { SpellConverter } from "./spell-converter.js";
export { SpeciesConverter } from "./species-converter.js";
export { ThemeConverter } from "./theme-converter.js";
export { ClassConverter } from "./class-converter.js";
export { ArchetypeConverter } from "./archetype-converter.js";

import type { ICategoryConverter } from "../converter-types.js";
import { WeaponConverter } from "./weapon-converter.js";
import { ArmorConverter } from "./armor-converter.js";
import { EquipmentConverter } from "./equipment-converter.js";
import { AugmentationConverter } from "./augmentation-converter.js";
import { FeatConverter } from "./feat-converter.js";
import { SpellConverter } from "./spell-converter.js";
import { SpeciesConverter } from "./species-converter.js";
import { ThemeConverter } from "./theme-converter.js";
import { ClassConverter } from "./class-converter.js";
import { ArchetypeConverter } from "./archetype-converter.js";

/**
 * Returns an array of all item converter instances.
 * Use this to bulk-register item converters with the ConverterRegistry.
 */
export function createItemConverters(): ICategoryConverter[] {
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
