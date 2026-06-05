/**
 * Archetype Converter — Milestone 3
 *
 * Converts a ContentRecord with category "archetypeFeature" into a Foundry SFRPG
 * archetypeFeature Item document. Handles alternate class feature substitutions
 * for archetypes including level requirements and replaced features.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class ArchetypeConverter extends ConverterBase {
  readonly category = "archetypeFeature" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "archetypeFeature";
  readonly packSuffix = "sftpl-archetypes";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      description: this.description(record),
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      levels: this.parseLevels(this.str(record, "levels") || this.str(record, "level")),
      replaces: this.parseList(this.str(record, "replaces") || this.str(record, "replacedFeatures")),
      archetype: {
        name: this.str(record, "archetype") || this.str(record, "archetypeName", ""),
      },
      rarity: this.str(record, "rarity", "common"),
    };
  }

  private parseLevels(raw: string): number[] {
    if (!raw) return [];
    return raw.split(/[,;]/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 20);
  }

  private parseList(raw: string): string[] {
    if (!raw) return [];
    return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
}
