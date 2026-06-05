/**
 * Hazard Converter — Milestone 3
 *
 * Converts a ContentRecord with category "hazard" into a Foundry SFRPG
 * hazard Actor document. Hazards include traps, environmental hazards,
 * and haunts. They are represented as Actors in SFRPG.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class HazardConverter extends ConverterBase {
  readonly category = "hazard" as const;
  readonly documentType = "Actor" as const;
  readonly sfrpgType = "hazard";
  readonly packSuffix = "sftpl-hazards";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      details: {
        source: `${record.sourceBook} pg. ${record.pageNumber}`,
        type: this.resolveHazardType(this.str(record, "type") || this.str(record, "hazardType")),
        cr: this.parseCR(this.str(record, "cr") || this.str(record, "challengeRating", "1")),
        xp: {
          value: this.num(record, "xp", 400),
        },
        biography: { value: this.str(record, "description") },
        reset: this.str(record, "reset", ""),
        disarm: this.str(record, "disarm", ""),
        trigger: this.str(record, "trigger", ""),
        effect: this.str(record, "effect", ""),
      },
      attributes: {
        hp: {
          value: this.num(record, "hp", 0),
          max: this.num(record, "hp", 0),
          min: 0,
        },
        hardness: this.num(record, "hardness", 0),
        noticePerception: this.num(record, "noticePerception") || this.num(record, "noticedc", 20),
        disableEngineering: this.num(record, "disableEngineering") || this.num(record, "disabledc", 20),
        senses: this.str(record, "senses", ""),
      },
      saves: {
        fort: {
          value: this.num(record, "fort", 0),
        },
        reflex: {
          value: this.num(record, "ref", 0),
        },
        will: {
          value: this.num(record, "will", 0),
        },
      },
    };
  }

  private parseCR(raw: string): number {
    if (raw.includes("/")) {
      const [num, den] = raw.split("/").map(Number);
      return num / den;
    }
    return Number(raw) || 1;
  }

  private resolveHazardType(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("trap")) return "trap";
    if (lower.includes("haunt")) return "haunt";
    if (lower.includes("environ")) return "environmental";
    return "trap";
  }
}
