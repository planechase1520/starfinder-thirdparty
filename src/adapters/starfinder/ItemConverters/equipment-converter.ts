/**
 * Equipment Converter — Milestone 3
 *
 * Converts a ContentRecord with category "equipment" into a Foundry SFRPG
 * equipment Item document. Equipment covers general gear, technological
 * items, hybrid items, magic items, and consumables.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class EquipmentConverter extends ConverterBase {
  readonly category = "equipment" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "equipment";
  readonly packSuffix = "sftpl-equipment";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      quantity: this.num(record, "quantity", 1),
      bulk: this.parseBulk(this.str(record, "bulk", "L")),
      level: this.num(record, "level", 1),
      price: this.num(record, "price", 0),
      description: this.description(record),
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      type: this.resolveEquipType(this.str(record, "type") || this.str(record, "equipType")),
      capacity: {
        value: this.num(record, "capacity", 0),
        max: this.num(record, "capacity", 0),
      },
      usage: {
        value: this.num(record, "usage", 0),
        per: this.str(record, "usagePer", "charge"),
      },
      equipped: false,
      rarity: this.str(record, "rarity", "common"),
    };
  }

  private resolveEquipType(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("tech")) return "technological";
    if (lower.includes("magic")) return "magic";
    if (lower.includes("hybrid")) return "hybrid";
    if (lower.includes("augment")) return "augmentation";
    if (lower.includes("consum")) return "consumable";
    return "technological";
  }

  private parseBulk(raw: string): number {
    if (raw.toLowerCase() === "l") return 0.1;
    if (raw === "-" || raw === "") return 0;
    return Number(raw) || 0.1;
  }
}
