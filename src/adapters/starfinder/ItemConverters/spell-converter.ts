/**
 * Spell Converter — Milestone 3
 *
 * Converts a ContentRecord with category "spell" into a Foundry SFRPG
 * spell Item document. Handles all spell parameters including school,
 * level, casting time, range, area, duration, saving throws, and SR.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class SpellConverter extends ConverterBase {
  readonly category = "spell" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "spell";
  readonly packSuffix = "sftpl-spells";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      description: this.description(record),
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      level: this.num(record, "level", 1),
      school: this.resolveSchool(this.str(record, "school")),
      subschool: this.str(record, "subschool"),
      descriptors: {
        value: this.parseDescriptors(this.str(record, "descriptors")),
        custom: "",
      },
      activation: {
        type: this.resolveActivation(this.str(record, "castingTime") || this.str(record, "activation")),
        cost: 1,
        condition: "",
      },
      range: {
        value: this.str(record, "range", ""),
        units: this.resolveRangeUnits(this.str(record, "range")),
        additional: "",
      },
      area: {
        value: this.str(record, "area", ""),
        units: "ft",
        shape: this.str(record, "areaShape", ""),
      },
      effect: {
        value: this.str(record, "effect", ""),
        units: "",
        shape: "",
      },
      targets: {
        value: this.str(record, "targets", ""),
      },
      duration: {
        value: this.str(record, "duration", ""),
        units: this.str(record, "durationUnits", ""),
        dismissible: this.bool(record, "dismissible"),
      },
      save: {
        type: this.str(record, "save") || this.str(record, "savingThrow", ""),
        dc: this.str(record, "saveDC", ""),
        harmless: this.bool(record, "harmless"),
      },
      sr: this.bool(record, "sr"),
      damage: {
        parts: this.parseDamage(this.str(record, "damage") || this.str(record, "damageFormula")),
      },
      rarity: this.str(record, "rarity", "common"),
    };
  }

  private resolveSchool(raw: string): string {
    const map: Record<string, string> = {
      abjuration: "abj",
      conjuration: "con",
      divination: "div",
      enchantment: "enc",
      evocation: "evo",
      illusion: "ill",
      necromancy: "nec",
      transmutation: "trs",
      universal: "uni",
    };
    return map[raw.toLowerCase()] ?? raw.toLowerCase() ?? "uni";
  }

  private resolveActivation(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("swift") || lower.includes("bonus")) return "swift";
    if (lower.includes("full")) return "full";
    if (lower.includes("reaction")) return "reaction";
    if (lower.includes("minute")) return "minute";
    return "standard";
  }

  private resolveRangeUnits(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("close")) return "close";
    if (lower.includes("medium")) return "medium";
    if (lower.includes("long")) return "long";
    if (lower.includes("touch")) return "touch";
    if (lower.includes("personal")) return "personal";
    if (lower.includes("ft") || lower.includes("feet")) return "ft";
    return "ft";
  }

  private parseDescriptors(raw: string): string[] {
    if (!raw) return [];
    return raw.split(/[,;]/).map((d) => d.trim().toLowerCase()).filter(Boolean);
  }

  private parseDamage(raw: string): Array<{ formula: string; type: { values: string[]; custom: string } }> {
    if (!raw) return [];
    return [{ formula: raw, type: { values: [], custom: "" } }];
  }
}
