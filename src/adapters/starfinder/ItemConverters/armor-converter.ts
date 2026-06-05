/**
 * Armor Converter — Milestone 3
 *
 * Converts a ContentRecord with category "armor" into a Foundry SFRPG
 * armor Item document. Handles light, heavy, and powered armor types
 * including EAC/KAC bonuses, Max Dex, ACP, speed adjustment, and upgrade slots.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class ArmorConverter extends ConverterBase {
  readonly category = "armor" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "armor";
  readonly packSuffix = "sftpl-armor";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    const armorType = this.resolveArmorType(this.str(record, "type") || this.str(record, "armorType"));

    return {
      quantity: this.num(record, "quantity", 1),
      bulk: this.parseBulk(this.str(record, "bulk", "1")),
      level: this.num(record, "level", 1),
      price: this.num(record, "price", 0),
      description: this.description(record),
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      type: armorType,
      armor: {
        eac: this.num(record, "eac", 0),
        kac: this.num(record, "kac", 0),
      },
      maxDexBonus: this.parseMaxDex(this.str(record, "maxDex") || this.str(record, "maxDexBonus")),
      armorCheckPenalty: this.num(record, "acp", 0) || this.num(record, "armorCheckPenalty", 0),
      speedAdjustment: this.parseSpeedAdjust(this.str(record, "speedAdjust") || this.str(record, "speedAdjustment")),
      upgradeSlots: this.num(record, "upgradeSlots", 0),
      equipped: false,
      rarity: this.str(record, "rarity", "common"),
    };
  }

  private resolveArmorType(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("powered")) return "powered";
    if (lower.includes("heavy")) return "heavy";
    return "light";
  }

  private parseMaxDex(raw: string): number {
    if (!raw || raw === "-" || raw === "—") return 99;
    return Number(raw) || 5;
  }

  private parseSpeedAdjust(raw: string): number {
    if (!raw || raw === "-" || raw === "—") return 0;
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  }

  private parseBulk(raw: string): number {
    if (raw.toLowerCase() === "l") return 0.1;
    if (raw === "-" || raw === "") return 0;
    return Number(raw) || 1;
  }
}
