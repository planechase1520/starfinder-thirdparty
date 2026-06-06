/**
 * Species Detector — detects SFRPG species (race) stat blocks in extracted PDF text.
 *
 * A Starfinder species stat block follows this structure:
 *
 *   SPECIES NAME
 *   Ability Adjustments: +2 Str, +2 Con, –2 Int
 *   Hit Points: 6
 *   Size and Type: [Species]s are Medium humanoids with the [subtype] subtype.
 *   [Racial Trait (Ex)]: Description…
 *
 * Key discriminators (never appear in weapon/armor/NPC blocks):
 *   • "Ability Adjustments:" or "Ability Modifiers:"
 *   • "Hit Points:" followed by a small bare number (not a dice expression)
 *   • "Size and Type:"
 *
 * Each trait block that follows "(Ex)", "(Su)", or "(Sp)" is extracted as a
 * separate racial ability entry in `racialAbilities`.
 */

import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

const ABILITY_NAMES: Record<string, string> = {
  str: "str", strength: "str",
  dex: "dex", dexterity: "dex",
  con: "con", constitution: "con",
  int: "int", intelligence: "int",
  wis: "wis", wisdom: "wis",
  cha: "cha", charisma: "cha",
};

const SIZE_MAP: Record<string, string> = {
  fine: "fine", diminutive: "diminutive", tiny: "tiny",
  small: "small", medium: "medium", large: "large",
  huge: "huge", gargantuan: "gargantuan", colossal: "colossal",
};

export class SpeciesDetector implements IContentDetector {
  readonly category: ContentCategory = "race";

  canDetect(text: string): boolean {
    const lower = text.toLowerCase();

    const hasAbilityAdj = /ability\s+(adjustments?|modifiers?)\s*:/i.test(text);
    const hasSizeAndType = /size\s+and\s+type\s*:/i.test(text);

    let score = 0;
    if (hasAbilityAdj) score += 3;
    if (hasSizeAndType) score += 3;
    if (/hit\s+points?\s*:\s*\d+(?:\s|$)/i.test(text)) score += 2;
    if (/\(Ex\)|\(Su\)|\(Sp\)/i.test(text)) score += 1;
    if (/subtype/i.test(lower)) score += 1;
    if (/racial\s+trait/i.test(lower)) score += 1;

    return score >= 4;
  }

  detect(text: string, pageNumber: number): DetectorMatch[] {
    if (!this.canDetect(text)) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const name = this.extractName(lines);
    const abilityMods = this.extractAbilityMods(text);
    const hp = this.extractHp(text);
    const size = this.extractSize(text);
    const subtype = this.extractSubtype(text);
    const racialAbilities = this.extractRacialAbilities(text);
    const description = this.buildDescription(lines, name);

    let matchedCount = 0;
    if (abilityMods.length > 0) matchedCount += 2;
    if (hp > 0) matchedCount++;
    if (size) matchedCount++;
    if (subtype) matchedCount++;
    if (racialAbilities.length > 0) matchedCount++;

    const confidence = Math.min(0.5 + matchedCount * 0.08, 0.97);

    const autoTags = ["species"];
    if (subtype) autoTags.push(subtype.toLowerCase());

    return [{
      name: name.trim(),
      rawText: text,
      structuredData: {
        abilityMods,
        hp,
        size,
        subtype,
        racialAbilities,
        description,
      },
      confidence,
      startIndex: 0,
      endIndex: text.length,
      pageNumber,
      autoTags,
    }];
  }

  private extractName(lines: string[]): string {
    for (const line of lines) {
      if (
        line &&
        !line.includes(":") &&
        /^[A-Z][A-Za-z\s'\-–]{2,}$/.test(line) &&
        line.length < 60
      ) {
        return line;
      }
      if (/^[A-Z][A-Z\s'\-–]{2,}$/.test(line) && line.length < 60) {
        return line;
      }
    }
    return lines[0] ?? "Unknown Species";
  }

  /**
   * Parses "Ability Adjustments: +2 Str, +2 Con, –2 Int" into
   * an array of {mod: "+2", ability: "str"} objects.
   */
  private extractAbilityMods(text: string): Array<{ mod: string; ability: string }> {
    const match = text.match(/ability\s+(?:adjustments?|modifiers?)\s*:\s*([^\n]+)/i);
    if (!match) return [];

    const parts = match[1].split(/,\s*/);
    const results: Array<{ mod: string; ability: string }> = [];

    for (const part of parts) {
      const modMatch = part.trim().match(/([+\-–−]?\s*\d+)\s+([A-Za-z]+)/);
      if (modMatch) {
        const mod = modMatch[1].replace(/–|−/, "-").replace(/\s+/, "");
        const rawAbility = modMatch[2].toLowerCase();
        const ability = ABILITY_NAMES[rawAbility];
        if (ability) {
          results.push({ mod: mod.startsWith("-") ? mod : `+${mod.replace("+", "")}`, ability });
        }
      }
    }

    return results;
  }

  private extractHp(text: string): number {
    const match = text.match(/hit\s+points?\s*:\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractSize(text: string): string {
    const match = text.match(/size\s+and\s+type\s*:[^.]*?\b(fine|diminutive|tiny|small|medium|large|huge|gargantuan|colossal)\b/i);
    if (match) return SIZE_MAP[match[1].toLowerCase()] ?? "medium";

    const fallback = text.match(/\b(fine|diminutive|tiny|small|medium|large|huge|gargantuan|colossal)\b/i);
    return fallback ? SIZE_MAP[fallback[1].toLowerCase()] ?? "medium" : "medium";
  }

  private extractSubtype(text: string): string {
    const subtypeMatch = text.match(/with\s+the\s+(\w+)\s+subtype/i);
    if (subtypeMatch) return subtypeMatch[1].toLowerCase();

    const typeMatch = text.match(/(?:are|is)\s+\w+\s+(\w+)\s+with/i);
    return typeMatch ? typeMatch[1].toLowerCase() : "humanoid";
  }

  /**
   * Extracts individual racial ability blocks.
   * Each ability is introduced by "Name (Ex):", "Name (Su):", or "Name (Sp):".
   */
  private extractRacialAbilities(text: string): Array<{ name: string; type: string; description: string }> {
    const abilities: Array<{ name: string; type: string; description: string }> = [];
    const regex = /([A-Z][A-Za-z\s'\-–]{1,50}?)\s+\((Ex|Su|Sp)\)\s*:/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const abilityName = match[1].trim();
      const abilityType = match[2];
      const start = match.index + match[0].length;

      const nextMatch = regex.source ? text.slice(start).search(/[A-Z][A-Za-z\s'\-–]{1,50}?\s+\((Ex|Su|Sp)\)\s*:/) : -1;
      const desc = nextMatch > 0
        ? text.slice(start, start + nextMatch).trim()
        : text.slice(start).split(/\n\n/)[0]?.trim() ?? "";

      abilities.push({ name: abilityName, type: abilityType, description: desc });
    }

    return abilities;
  }

  private buildDescription(lines: string[], speciesName: string): string {
    const skipPatterns = [
      /ability\s+(?:adjustments?|modifiers?)\s*:/i,
      /hit\s+points?\s*:/i,
      /size\s+and\s+type\s*:/i,
    ];

    const descLines = lines.filter(line => {
      if (line === speciesName) return false;
      if (skipPatterns.some(p => p.test(line))) return false;
      return true;
    });

    return descLines.join(" ").trim();
  }
}
