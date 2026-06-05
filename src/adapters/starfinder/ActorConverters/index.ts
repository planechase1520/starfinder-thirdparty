/**
 * Actor Converters Index — Milestone 3
 *
 * Exports all SFRPG actor category converters and provides a convenience
 * factory function that returns a pre-constructed array for bulk registration.
 */

export { NpcConverter } from "./npc-converter.js";
export { VehicleConverter } from "./vehicle-converter.js";
export { StarshipConverter } from "./starship-converter.js";
export { HazardConverter } from "./hazard-converter.js";

import type { ICategoryConverter } from "../converter-types.js";
import { NpcConverter } from "./npc-converter.js";
import { VehicleConverter } from "./vehicle-converter.js";
import { StarshipConverter } from "./starship-converter.js";
import { HazardConverter } from "./hazard-converter.js";

/**
 * Returns an array of all actor converter instances.
 * Use this to bulk-register actor converters with the ConverterRegistry.
 */
export function createActorConverters(): ICategoryConverter[] {
  return [
    new NpcConverter(),
    new VehicleConverter(),
    new StarshipConverter(),
    new HazardConverter(),
  ];
}
