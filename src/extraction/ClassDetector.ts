/**
 * Class Detector — identifies SFRPG character class entries in extracted PDF text.
 *
 * SFRPG class entries include:
 *
 *   CLASS NAME
 *   Key Ability Score: [ability]
 *   Hit Points: X   (flat value, not dice)
 *   Stamina Points: X
 *   Key Skills: [list]
 *   [Table of class features by level — BAB, Save Bonuses, Class Features]
 *
 * Key discriminators:
 *   • "Key Ability Score" — strongest signal, unique to class write-ups
 *   • "Stamina Points" — SFRPG-specific, not in NPC blocks
 *   • Class feature table entries (Bonus Feat, Mechanic Trick, etc.)
 */

import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class ClassDetector implements IContentDetector {
  readonly category: ContentCategory = "class";

  canDetect(text: string): boolean {
    const hasKeyAbility     = /key\s+ability\s+score/i.test(text);
    const hasStaminaPoints  = /stamina\s+points/i.test(text);
    const hasClassFeatures  = /class\s+feature/i.test(text);

    const isNpc    = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
    const isSpell  = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
    const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
    if (isNpc || isSpell || isWeapon) return false;

    let score = 0;
    if (hasKeyAbility)    score += 5;
    if (hasStaminaPoints) score += 3;
    if (hasClassFeatures) score += 2;
    if (/\bproficiencies\b/i.test(text)) score += 1;

    return score >= 4;
  }

  detect(text: string, pageNumber: number): DetectorMatch[] {
    if (!this.canDetect(text)) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const name          = this.extractName(lines);
    const keyAbility    = this.extractField(text, /key\s+ability\s+score\s*[:;]?\s*([^\n;]+)/i);
    const hp            = this.extractNumber(text, /hit\s+points\s*[:;]?\s*(\d+)/i);
    const stamina       = this.extractNumber(text, /stamina\s+points\s*[:;]?\s*(\d+)/i);
    const keySkills     = this.extractField(text, /class\s+skills?\s*[:;]?\s*([^\n]+)/i) ||
                          this.extractField(text, /key\s+skills?\s*[:;]?\s*([^\n]+)/i);
    const proficiencies = this.extractField(text, /proficiencies\s*[:;]?\s*([^\n]+)/i);
    const description   = this.buildDescription(lines, name);

    let score = 0;
    if (keyAbility) score++;
    if (hp > 0)     score++;
    if (stamina > 0) score++;

    const confidence = Math.min(0.55 + score * 0.12, 0.96);

    return [{
      name: name.trim(),
      rawText: text,
      structuredData: { keyAbility, hp, stamina, keySkills, proficiencies, description },
      confidence,
      startIndex: 0,
      endIndex: text.length,
      pageNumber,
      autoTags: ["class"],
    }];
  }

  private extractName(lines: string[]): string {
    for (const line of lines) {
      if (
        !line.includes(":") &&
        /^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) &&
        line.length < 60
      ) {
        return line;
      }
    }
    return lines[0] ?? "Unknown Class";
  }

  private extractField(text: string, pattern: RegExp): string {
    const m = text.match(pattern);
    return m ? m[1].trim() : "";
  }

  private extractNumber(text: string, pattern: RegExp): number {
    const m = text.match(pattern);
    return m ? parseInt(m[1], 10) : 0;
  }

  private buildDescription(lines: string[], name: string): string {
    const skip = /^(key\s+ability|hit\s+points|stamina\s+points|class\s+skills?|key\s+skills?|proficiencies|bab|base\s+attack)\b/i;
    return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
  }
}
