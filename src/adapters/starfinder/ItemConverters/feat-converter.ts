/**
 * Feat Converter — Milestone 3
 *
 * Converts a ContentRecord with category "feat" into a Foundry SFRPG
 * feat Item document. Supports combat, general, racial, and skill feats
 * with prerequisite parsing.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class FeatConverter extends ConverterBase {
  readonly category = "feat" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "feat";
  readonly packSuffix = "sftpl-feats";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    const featType = this.resolveFeatType(
      this.str(record, "featType") || this.str(record, "type")
    );

    return {
      description: this.description(record),
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      type: featType,
      prerequisites: {
        parts: this.parsePrerequisites(this.str(record, "prerequisites") || this.str(record, "prereqs")),
      },
      activation: {
        type: this.str(record, "activation") || "passive",
        cost: this.num(record, "activationCost", 0),
        condition: this.str(record, "activationCondition"),
      },
      abilityMods: {
        parts: [],
      },
      modifiers: [],
      rarity: this.str(record, "rarity", "common"),
    };
  }

  private resolveFeatType(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("combat")) return "combat";
    if (lower.includes("racial") || lower.includes("species")) return "racial";
    if (lower.includes("skill")) return "skill";
    if (lower.includes("general")) return "general";
    if (lower.includes("story")) return "story";
    return "general";
  }

  private parsePrerequisites(raw: string): string[] {
    if (!raw) return [];
    return raw.split(";").map((p) => p.trim()).filter(Boolean);
  }
}
