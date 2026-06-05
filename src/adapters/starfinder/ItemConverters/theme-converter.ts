/**
 * Theme Converter — Milestone 3
 *
 * Converts a ContentRecord with category "theme" into a Foundry SFRPG
 * theme Item document. Themes provide ability score modifiers and class
 * skill bonuses from levels 1, 6, 12, and 18.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class ThemeConverter extends ConverterBase {
  readonly category = "theme" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "theme";
  readonly packSuffix = "sftpl-themes";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      description: this.description(record),
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      abilityMod: {
        ability: this.resolveAbility(this.str(record, "abilityMod") || this.str(record, "keyAbility")),
        value: this.num(record, "abilityModValue", 1),
      },
      skill: this.str(record, "classSkill") || this.str(record, "themeSkill", ""),
      themeKnowledge: {
        subtype: this.str(record, "knowledgeSubtype", ""),
        skill: this.str(record, "knowledgeSkill", ""),
      },
      rarity: this.str(record, "rarity", "common"),
    };
  }

  private resolveAbility(raw: string): string {
    const map: Record<string, string> = {
      strength: "str", str: "str",
      dexterity: "dex", dex: "dex",
      constitution: "con", con: "con",
      intelligence: "int", int: "int",
      wisdom: "wis", wis: "wis",
      charisma: "cha", cha: "cha",
      any: "any",
    };
    return map[raw.toLowerCase()] ?? "any";
  }
}
