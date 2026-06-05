/**
 * Converter Registry — Milestone 3
 *
 * Central registry that maps every ContentCategory to the converter
 * responsible for producing the corresponding Foundry document.
 *
 * Usage:
 *   const registry = ConverterRegistry.build();
 *   const converter = registry.get("weapon");
 *   const result = converter.convert(record);
 */

import type { ContentCategory } from "../../database/content-record.js";
import type { ICategoryConverter } from "./converter-types.js";
import { createItemConverters } from "./ItemConverters/index.js";
import { createActorConverters } from "./ActorConverters/index.js";
import { JournalConverter } from "./JournalConverters/journal-converter.js";
import { ModuleLogger } from "../../utils/logger.js";

export class ConverterRegistry {
  private readonly registry = new Map<ContentCategory, ICategoryConverter>();

  private constructor() {}

  /**
   * Builds and returns a ConverterRegistry pre-populated with all
   * Starfinder 1E converters (items, actors, and journals).
   */
  static build(): ConverterRegistry {
    const instance = new ConverterRegistry();

    for (const converter of createItemConverters()) {
      instance.register(converter);
    }

    for (const converter of createActorConverters()) {
      instance.register(converter);
    }

    const journalConverter = new JournalConverter();
    instance.registry.set(journalConverter.category, journalConverter as unknown as ICategoryConverter);

    ModuleLogger.info(
      `[ConverterRegistry] Registered ${instance.registry.size} converters: ` +
      [...instance.registry.keys()].join(", ")
    );

    return instance;
  }

  /**
   * Registers a converter instance. Overwrites any existing converter for
   * the same category (allows runtime overrides for testing or modding).
   */
  register(converter: ICategoryConverter): void {
    if (this.registry.has(converter.category)) {
      ModuleLogger.warn(
        `[ConverterRegistry] Overwriting existing converter for category: ${converter.category}`
      );
    }
    this.registry.set(converter.category, converter);
  }

  /**
   * Returns the converter for the given category, or undefined if not registered.
   */
  get(category: ContentCategory): ICategoryConverter | undefined {
    return this.registry.get(category);
  }

  /**
   * Returns true if a converter is registered for the given category.
   */
  has(category: ContentCategory): boolean {
    return this.registry.has(category);
  }

  /**
   * Returns the list of all registered categories.
   */
  getRegisteredCategories(): ContentCategory[] {
    return [...this.registry.keys()];
  }

  /**
   * Returns all registered converters as an array.
   */
  getAll(): ICategoryConverter[] {
    return [...this.registry.values()];
  }
}
