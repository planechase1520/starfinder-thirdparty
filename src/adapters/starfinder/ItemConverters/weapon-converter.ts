/**
 * Weapon Converter — Milestone 3
 *
 * Converts a ContentRecord with category "weapon" into a Foundry SFRPG
 * weapon Item document. Supports both ranged and melee weapons including
 * damage formula parsing, range, capacity, and usage.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class WeaponConverter extends ConverterBase {
  readonly category = "weapon" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "weapon";
  readonly packSuffix = "sftpl-weapons";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    const r = record.rawContent;

    const weaponType = this.str(record, "weaponType") || this.str(record, "type") || "smallArm";
    const isRanged = !["battleglove", "club", "dagger", "longsword", "sword", "melee"].some(
      (t) => String(r["type"] ?? "").toLowerCase().includes(t)
    );

    const damageFormula = this.str(record, "damageFormula") || this.str(record, "damage") || "1d6";
    const damageTypes = this.parseDamageTypes(this.str(record, "damageType") || this.str(record, "damageTypes") || "B");
    const critEffect = this.str(record, "critical") || this.str(record, "critEffect") || "";

    return {
      quantity: this.num(record, "quantity", 1),
      bulk: this.parseBulk(this.str(record, "bulk", "1")),
      level: this.num(record, "level", 1),
      price: this.num(record, "price", 0),
      description: this.description(record),
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      type: weaponType,
      weaponType: isRanged ? "ranged" : "melee",
      damage: [
        {
          formula: damageFormula,
          type: { values: damageTypes, custom: "" },
        },
      ],
      critical: {
        parts: critEffect ? [critEffect] : [],
      },
      range: {
        value: this.num(record, "range", isRanged ? 30 : 5),
        units: "ft",
        additional: "",
        increment: this.num(record, "rangeIncrement", isRanged ? 5 : 0),
      },
      capacity: {
        value: this.num(record, "capacity", 20),
        max: this.num(record, "capacity", 20),
      },
      usage: {
        value: this.num(record, "usage", 1),
        per: "shot",
      },
      special: this.str(record, "special"),
      equipped: false,
      proficient: false,
      rarity: this.str(record, "rarity", "common"),
    };
  }

  private parseDamageTypes(raw: string): string[] {
    const typeMap: Record<string, string> = {
      bludgeoning: "B", b: "B",
      piercing: "P", p: "P",
      slashing: "S", s: "S",
      fire: "F", f: "F",
      cold: "C", c: "C",
      electricity: "E", e: "E",
      acid: "A", a: "A",
      sonic: "So",
      force: "force",
    };
    return raw
      .split(/[\s,&]+/)
      .map((t) => typeMap[t.toLowerCase()] ?? t.toUpperCase())
      .filter(Boolean);
  }

  private parseBulk(raw: string): number {
    if (raw.toLowerCase() === "l") return 0.1;
    if (raw === "-" || raw === "") return 0;
    return Number(raw) || 1;
  }
}
