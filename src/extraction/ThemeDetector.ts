/**
 * Theme Detector — identifies SFRPG theme entries in extracted PDF text.
 *
 * SFRPG theme blocks follow this format:
 *
 *   THEME NAME
 *   Theme Knowledge (1st Level)
 *   [description of 1st-level theme ability]
 *   [Level-gated theme abilities at 6th, 12th, 18th level]
 *
 * Key discriminators:
 *   • "Theme Knowledge" — the single strongest signal (unique to themes)
 *   • Level-gated abilities listed with headings like "6th Level", "12th Level"
 *   • The word "theme" in context (not a chapter heading)
 */

import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class ThemeDetector implements IContentDetector {
  readonly category: ContentCategory = "theme";

  canDetect(text: string): boolean {
    const hasThemeKnowledge = /theme\s+knowledge/i.test(text);

    const isNpc    = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
    const isSpell  = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
    const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
    if (isNpc || isSpell || isWeapon) return false;

    let score = 0;
    if (hasThemeKnowledge) score += 5;
    if (/\b6th\s+level\b/i.test(text))  score += 1;
    if (/\b12th\s+level\b/i.test(text)) score += 1;
    if (/\b18th\s+level\b/i.test(text)) score += 1;

    return score >= 4;
  }

  detect(text: string, pageNumber: number): DetectorMatch[] {
    if (!this.canDetect(text)) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const name = this.extractName(lines);
    const themeKnowledge = this.extractThemeKnowledge(text);
    const abilities = this.extractLevelAbilities(text);
    const description = themeKnowledge || this.buildDescription(lines, name);

    let score = 0;
    if (themeKnowledge) score += 2;
    if (abilities.length > 0) score++;

    const confidence = Math.min(0.55 + score * 0.1, 0.96);

    return [{
      name: name.trim(),
      rawText: text,
      structuredData: {
        themeKnowledge,
        abilityAt6: abilities[0] ?? "",
        abilityAt12: abilities[1] ?? "",
        abilityAt18: abilities[2] ?? "",
        description,
      },
      confidence,
      startIndex: 0,
      endIndex: text.length,
      pageNumber,
      autoTags: ["theme"],
    }];
  }

  private extractName(lines: string[]): string {
    for (const line of lines) {
      if (
        !line.includes(":") &&
        !/theme\s+knowledge/i.test(line) &&
        /^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) &&
        line.length < 60
      ) {
        return line;
      }
    }
    return lines[0] ?? "Unknown Theme";
  }

  private extractThemeKnowledge(text: string): string {
    const m = text.match(/theme\s+knowledge[^:]*\n([\s\S]{0,400}?)(?:\n\n|\n(?:[A-Z0-9 ]{4,}|\d+th\s+level))/i);
    if (m) return m[1].replace(/\s+/g, " ").trim();
    const m2 = text.match(/theme\s+knowledge[^\n]*\n([^\n]{0,300})/i);
    return m2 ? m2[1].replace(/\s+/g, " ").trim() : "";
  }

  /**
   * Returns [6th, 12th, 18th] level ability names in order.
   */
  private extractLevelAbilities(text: string): string[] {
    const abilities: string[] = [];
    for (const level of ["6th", "12th", "18th"]) {
      const pattern = new RegExp(`${level}\\s+level[^\\n]*\\n([^\\n]{0,200})`, "i");
      const m = text.match(pattern);
      abilities.push(m ? m[1].replace(/\s+/g, " ").trim() : "");
    }
    return abilities;
  }

  private buildDescription(lines: string[], name: string): string {
    const skip = /^(theme\s+knowledge|\d+th\s+level)/i;
    return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
  }
}
