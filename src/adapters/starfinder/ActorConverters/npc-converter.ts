/**
 * NPC Converter — Milestone 3
 *
 * Converts a ContentRecord with category "npc" into a Foundry SFRPG
 * npc2 Actor document. Builds the full NPC stat block including ability
 * scores, defensive stats (EAC/KAC/HP), speed, attack entries, and skills.
 *
 * The SFRPG system uses "npc2" as the actor type for the revised NPC format.
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

export class NpcConverter extends ConverterBase {
  readonly category = "npc" as const;
  readonly documentType = "Actor" as const;
  readonly sfrpgType = "npc2";
  readonly packSuffix = "sftpl-npcs";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    return {
      details: {
        alignment: this.str(record, "alignment", "N"),
        cr: this.parseCR(this.str(record, "cr") || this.str(record, "challengeRating", "1")),
        xp: {
          value: this.num(record, "xp", this.crToXP(this.str(record, "cr", "1"))),
        },
        source: `${record.sourceBook} pg. ${record.pageNumber}`,
        type: this.str(record, "creatureType") || this.str(record, "type", ""),
        subtype: this.str(record, "creatureSubtype") || this.str(record, "subtype", ""),
        size: this.resolveSize(this.str(record, "size", "medium")),
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
          value: this.num(record, "hp", 6),
          max: this.num(record, "hp", 6),
          min: 0,
        },
        sp: {
          value: 0,
          max: 0,
          min: 0,
        },
        init: {
          value: this.num(record, "initiative") || this.num(record, "init", 0),
          bonus: 0,
          total: this.num(record, "initiative") || this.num(record, "init", 0),
        },
        fort: {
          bonus: this.num(record, "fort", 0),
          misc: 0,
          value: this.num(record, "fort", 0),
        },
        reflex: {
          bonus: this.num(record, "ref", 0),
          misc: 0,
          value: this.num(record, "ref", 0),
        },
        will: {
          bonus: this.num(record, "will", 0),
          misc: 0,
          value: this.num(record, "will", 0),
        },
        bab: this.num(record, "bab", 0),
        cmd: {
          value: this.num(record, "cmd", 10),
        },
      },
      abilities: this.buildAbilities(record),
      skills: this.buildSkills(record),
      traits: {
        dr: this.str(record, "dr") || this.str(record, "damageReduction", ""),
        immunities: {
          value: this.parseList(this.str(record, "immunities")),
        },
        weaknesses: {
          value: this.parseList(this.str(record, "weaknesses")),
        },
        resistances: this.parseResistances(this.str(record, "resistances") || this.str(record, "sr", "")),
        senses: this.str(record, "senses", ""),
        languages: {
          value: this.parseList(this.str(record, "languages")),
          custom: "",
        },
      },
      speed: {
        value: this.num(record, "speed", 30),
        special: this.str(record, "otherSpeed", ""),
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

  private crToXP(cr: string): number {
    const crMap: Record<string, number> = {
      "1/6": 65, "1/4": 100, "1/3": 135, "1/2": 200,
      "1": 400, "2": 600, "3": 800, "4": 1200, "5": 1600,
      "6": 2400, "7": 3200, "8": 4800, "9": 6400, "10": 9600,
      "11": 12800, "12": 19200, "13": 25600, "14": 38400, "15": 51200,
      "16": 76800, "17": 102400, "18": 153600, "19": 204800, "20": 307200,
      "21": 409600, "22": 614400, "23": 819200, "24": 1228800, "25": 1638400,
    };
    return crMap[cr] ?? 400;
  }

  private resolveSize(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("fine")) return "fine";
    if (lower.includes("dim")) return "diminutive";
    if (lower.includes("tiny")) return "tiny";
    if (lower.includes("small")) return "small";
    if (lower.includes("large")) return "large";
    if (lower.includes("huge")) return "huge";
    if (lower.includes("garg")) return "gargantuan";
    if (lower.includes("col")) return "colossal";
    return "medium";
  }

  private buildAbilities(record: ContentRecord): Record<string, unknown> {
    const abilities = ["str", "dex", "con", "int", "wis", "cha"];
    const result: Record<string, unknown> = {};
    for (const ab of abilities) {
      const score = this.num(record, ab, 10);
      result[ab] = {
        value: score,
        min: 3,
        misc: 0,
        mod: Math.floor((score - 10) / 2),
        base: score,
      };
    }
    return result;
  }

  private buildSkills(record: ContentRecord): Record<string, unknown> {
    const skillsRaw = this.str(record, "skills");
    if (!skillsRaw) return {};

    const skills: Record<string, unknown> = {};
    const entries = skillsRaw.split(",");
    for (const entry of entries) {
      const match = entry.trim().match(/^(\w[\w\s]*?)\s*([+-]\d+)$/);
      if (match) {
        const skillName = match[1].trim().toLowerCase().replace(/\s+/g, "");
        const bonus = parseInt(match[2], 10);
        skills[skillName] = { value: 0, misc: bonus, ranks: 0, mod: bonus };
      }
    }
    return skills;
  }

  private parseList(raw: string): string[] {
    if (!raw) return [];
    return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }

  private parseResistances(raw: string): string {
    return raw ?? "";
  }
}
