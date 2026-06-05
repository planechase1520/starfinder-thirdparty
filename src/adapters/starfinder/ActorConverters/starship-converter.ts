/**
 * Starship Converter — Milestone 3
 *
 * Converts a ContentRecord with category "starship" into a Foundry SFRPG
 * starship Actor document. Handles frame, tier, PCU, shields, AC, TL,
 * DT, crew actions, and speed/maneuverability.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class StarshipConverter extends ConverterBase {
  readonly category = "starship" as const;
  readonly documentType = "Actor" as const;
  readonly sfrpgType = "starship";
  readonly packSuffix = "sftpl-starships";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      details: {
        source: `${record.sourceBook} pg. ${record.pageNumber}`,
        biography: { value: this.str(record, "description") },
        frame: this.str(record, "frame", ""),
        manufacturer: this.str(record, "manufacturer", ""),
        model: this.str(record, "model", ""),
        tier: this.parseTier(this.str(record, "tier", "1")),
        size: this.resolveSize(this.str(record, "size", "medium")),
        price: this.num(record, "price", 0),
      },
      attributes: {
        hp: {
          value: this.num(record, "hp", 30),
          max: this.num(record, "hp", 30),
          min: 0,
        },
        dt: this.num(record, "dt", 0),
        ct: Math.floor(this.num(record, "hp", 30) / 5),
        shields: {
          forward: this.num(record, "shieldsForward") || this.num(record, "shields", 0),
          starboard: this.num(record, "shieldsStarboard") || this.num(record, "shields", 0),
          port: this.num(record, "shieldsPort") || this.num(record, "shields", 0),
          aft: this.num(record, "shieldsAft") || this.num(record, "shields", 0),
        },
        ac: {
          value: this.num(record, "ac", 10),
          misc: 0,
        },
        tl: {
          value: this.num(record, "tl", 10),
          misc: 0,
        },
        pcu: this.num(record, "pcu", 30),
        powerCoreUnits: this.num(record, "pcu", 30),
        bsp: this.num(record, "bsp", 0),
      },
      movement: {
        speed: this.num(record, "speed", 6),
        maneuverability: this.resolveManeuverability(this.str(record, "maneuver") || this.str(record, "maneuverability")),
      },
      crew: {
        captain: { limit: 1 },
        pilot: { limit: 1 },
        gunners: { limit: this.num(record, "gunners", 1) },
        engineers: { limit: this.num(record, "engineers", 1) },
        science: { limit: this.num(record, "scienceOfficers", 1) },
      },
    };
  }

  private parseTier(raw: string): number {
    if (raw.includes("/")) {
      const [num, den] = raw.split("/").map(Number);
      return num / den;
    }
    return Number(raw) || 1;
  }

  private resolveSize(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("tiny")) return "tiny";
    if (lower.includes("small")) return "small";
    if (lower.includes("medium")) return "medium";
    if (lower.includes("large")) return "large";
    if (lower.includes("huge")) return "huge";
    if (lower.includes("garg")) return "gargantuan";
    if (lower.includes("col")) return "colossal";
    return "medium";
  }

  private resolveManeuverability(raw: string): string {
    const lower = (raw ?? "").toLowerCase();
    if (lower.includes("perfect")) return "perfect";
    if (lower.includes("good")) return "good";
    if (lower.includes("average")) return "average";
    if (lower.includes("poor")) return "poor";
    if (lower.includes("clumsy")) return "clumsy";
    return "average";
  }
}
