/**
 * Vehicle Converter — Milestone 3
 *
 * Converts a ContentRecord with category "vehicle" into a Foundry SFRPG
 * vehicle Actor document. Handles land vehicles, aircraft, and water vehicles
 * including speed, drive/pilot DC, attack profiles, and crew.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class VehicleConverter extends ConverterBase {
  readonly category = "vehicle" as const;
  readonly documentType = "Actor" as const;
  readonly sfrpgType = "vehicle";
  readonly packSuffix = "sftpl-vehicles";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      details: {
        source: `${record.sourceBook} pg. ${record.pageNumber}`,
        type: this.resolveVehicleType(this.str(record, "type") || this.str(record, "vehicleType")),
        biography: { value: this.str(record, "description") },
      },
      attributes: {
        eac: {
          value: this.num(record, "eac", 10),
          min: 0,
        },
        kac: {
          value: this.num(record, "kac", 10),
          min: 0,
        },
        hp: {
          value: this.num(record, "hp", 20),
          max: this.num(record, "hp", 20),
          min: 0,
        },
        hardness: this.num(record, "hardness", 0),
        cover: this.str(record, "cover", "total"),
      },
      frame: {
        size: this.resolveSize(this.str(record, "size", "large")),
        bulk: this.num(record, "bulk", 50),
        price: this.num(record, "price", 0),
        level: this.num(record, "level", 1),
      },
      movement: {
        speed: this.num(record, "speed", 30),
        speedType: this.str(record, "speedType", "land"),
        fullSpeed: this.num(record, "fullSpeed") || this.num(record, "speed", 30) * 3,
        pilotingBonus: this.num(record, "pilotingBonus", 0),
        driveDC: this.num(record, "driveDC", 15),
        maneuver: this.resolveManeuver(this.str(record, "maneuver")),
      },
      crew: {
        minimumCrew: this.num(record, "minCrew") || this.num(record, "crew", 1),
        maximumPassengers: this.num(record, "maxPassengers") || this.num(record, "passengers", 0),
      },
    };
  }

  private resolveVehicleType(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("air") || lower.includes("fly")) return "air";
    if (lower.includes("water") || lower.includes("sea") || lower.includes("aqua")) return "water";
    return "land";
  }

  private resolveSize(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("small")) return "small";
    if (lower.includes("medium")) return "medium";
    if (lower.includes("large")) return "large";
    if (lower.includes("huge")) return "huge";
    if (lower.includes("garg")) return "gargantuan";
    if (lower.includes("col")) return "colossal";
    return "large";
  }

  private resolveManeuver(raw: string): string {
    const lower = (raw ?? "").toLowerCase();
    if (lower.includes("perfect")) return "perfect";
    if (lower.includes("good")) return "good";
    if (lower.includes("average")) return "average";
    if (lower.includes("poor")) return "poor";
    if (lower.includes("clumsy")) return "clumsy";
    return "average";
  }
}
