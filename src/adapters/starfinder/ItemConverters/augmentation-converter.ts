/**
 * Augmentation Converter — Milestone 3
 *
 * Converts a ContentRecord with category "augmentation" into a Foundry SFRPG
 * augmentation Item document. Handles biotech, cybernetic, magitech, and
 * necrografts with system slot assignment.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class AugmentationConverter extends ConverterBase {
  readonly category = "augmentation" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "augmentation";
  readonly packSuffix = "sftpl-augmentations";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      quantity: this.num(record, "quantity", 1),
      bulk: this.parseBulk(this.str(record, "bulk", "0")),
      level: this.num(record, "level", 1),
      price: this.num(record, "price", 0),
      description: this.description(record),
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      type: this.resolveAugType(this.str(record, "type") || this.str(record, "augType")),
      system: this.str(record, "system") || this.str(record, "bodySlot", ""),
      equipped: false,
      rarity: this.str(record, "rarity", "common"),
    };
  }

  private resolveAugType(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("bio")) return "biotech";
    if (lower.includes("cyber")) return "cybernetic";
    if (lower.includes("magi")) return "magitech";
    if (lower.includes("necro")) return "necrograft";
    if (lower.includes("personal")) return "personal-upgrade";
    return "cybernetic";
  }

  private parseBulk(raw: string): number {
    if (raw.toLowerCase() === "l") return 0.1;
    if (raw === "-" || raw === "") return 0;
    return Number(raw) || 0;
  }
}
