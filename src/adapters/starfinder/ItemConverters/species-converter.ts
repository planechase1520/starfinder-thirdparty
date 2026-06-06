/**
 * Species Converter — Milestone 3+
 *
 * Converts a ContentRecord with category "race" into a Foundry SFRPG
 * race Item document.
 *
 * SFRPG race items store:
 *   - hp           — base hit points granted at level 1
 *   - size         — "fine" | "diminutive" | "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal"
 *   - subtype      — creature subtype string (e.g. "humanoid")
 *   - abilityMods  — { parts: [[modifier, abilityKey], …] }
 *   - damage       — { parts: [] } for natural weapon entries (usually empty on import)
 *   - modifiers    — flat modifier array (empty on import; user can fill later)
 *
 * The rawContent produced by SpeciesDetector includes:
 *   abilityMods   → Array<{ mod: string; ability: string }>
 *   hp            → number
 *   size          → string
 *   subtype       → string
 *   racialAbilities → Array<{ name, type, description }>
 *   description   → string
 */

import type { ContentRecord } from "../../../database/content-record.js";
import { ConverterBase } from "../converter-base.js";

interface AbilityModEntry {
  mod: string;
  ability: string;
}

interface RacialAbility {
  name: string;
  type: string;
  description: string;
}

const VALID_SIZES = new Set([
  "fine", "diminutive", "tiny", "small", "medium",
  "large", "huge", "gargantuan", "colossal",
]);

export class SpeciesConverter extends ConverterBase {
  readonly category = "race" as const;
  readonly documentType = "Item" as const;
  readonly sfrpgType = "race";
  readonly packSuffix = "sftpl-species";

  protected buildSystemData(record: ContentRecord): Record<string, unknown> {
    const raw = record.rawContent as Record<string, unknown>;

    const hp = typeof raw["hp"] === "number" ? raw["hp"] : 4;

    const rawSize = typeof raw["size"] === "string" ? raw["size"].toLowerCase() : "medium";
    const size = VALID_SIZES.has(rawSize) ? rawSize : "medium";

    const subtype = typeof raw["subtype"] === "string" ? raw["subtype"] : "humanoid";

    const abilityModParts = this.buildAbilityModParts(raw["abilityMods"]);

    const racialAbilityDesc = this.buildRacialAbilitiesHtml(raw["racialAbilities"]);
    const baseDescription = this.str(record, "description");
    const fullDescription = racialAbilityDesc
      ? `${baseDescription}\n\n${racialAbilityDesc}`.trim()
      : baseDescription;

    return {
      description: {
        value: fullDescription,
        chat: "",
        unidentified: "",
      },
      source: `${record.sourceBook} pg. ${record.pageNumber}`,
      hp,
      size,
      subtype,
      abilityMods: {
        parts: abilityModParts,
      },
      damage: {
        parts: [],
      },
      modifiers: [],
      rarity: this.str(record, "rarity", "common"),
    };
  }

  /**
   * Converts the SpeciesDetector abilityMods array into the format
   * expected by SFRPG: [["+2", "str"], ["-2", "int"], …]
   */
  private buildAbilityModParts(raw: unknown): Array<[string, string]> {
    if (!Array.isArray(raw)) return [];

    const parts: Array<[string, string]> = [];
    for (const entry of raw as unknown[]) {
      if (
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        typeof (entry as AbilityModEntry).mod === "string" &&
        typeof (entry as AbilityModEntry).ability === "string"
      ) {
        const { mod, ability } = entry as AbilityModEntry;
        if (mod && ability) {
          parts.push([mod, ability]);
        }
      }
    }

    return parts;
  }

  /**
   * Renders racial abilities as a simple HTML list to embed in the description.
   * Users can refine this in the item sheet.
   */
  private buildRacialAbilitiesHtml(raw: unknown): string {
    if (!Array.isArray(raw) || raw.length === 0) return "";

    const items = (raw as unknown[]).map((entry) => {
      const e = entry as Partial<RacialAbility>;
      const name = e.name ?? "Racial Ability";
      const type = e.type ? ` (${e.type})` : "";
      const desc = e.description ?? "";
      return `<li><strong>${name}${type}:</strong> ${desc}</li>`;
    });

    return `<ul>${items.join("")}</ul>`;
  }
}
