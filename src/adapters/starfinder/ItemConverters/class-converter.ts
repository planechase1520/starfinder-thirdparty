/**
 * Class Converter — Milestone 3
 *
 * Converts a ContentRecord with category "class" into a Foundry SFRPG
 * class Item document. Handles key ability, hit points, stamina points,
 * BAB progression, saving throw progressions, and skill ranks.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class ClassConverter extends ConverterBase {
  readonly category = "class" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "class";
  readonly packSuffix = "sftpl-classes";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      description: this.description(record),
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      keyAbility: this.resolveAbility(this.str(record, "keyAbility") || this.str(record, "abilityScore")),
      hp: this.num(record, "hp", 6),
      sp: this.num(record, "sp", 6),
      skillRanks: this.num(record, "skillRanks", 4),
      levels: 20,
      bab: this.resolveProgression(this.str(record, "bab") || this.str(record, "babProgression")),
      saves: {
        fort: this.resolveProgression(this.str(record, "fortSave") || this.str(record, "fort", "poor")),
        ref: this.resolveProgression(this.str(record, "refSave") || this.str(record, "ref", "poor")),
        will: this.resolveProgression(this.str(record, "willSave") || this.str(record, "will", "poor")),
      },
      proficiencies: {
        weapon: this.parseList(this.str(record, "weaponProficiencies")),
        armor: this.parseList(this.str(record, "armorProficiencies")),
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
    };
    return map[raw.toLowerCase()] ?? "str";
  }

  private resolveProgression(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("full") || lower === "1" || lower === "good") return "full";
    if (lower.includes("3/4") || lower.includes("3") || lower === "medium") return "3/4";
    if (lower.includes("1/2") || lower.includes("half") || lower === "poor") return "1/2";
    return "poor";
  }

  private parseList(raw: string): string[] {
    if (!raw) return [];
    return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
}
