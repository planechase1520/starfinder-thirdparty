/**
 * Archetype Detector — identifies SFRPG archetype entries in extracted PDF text.
 *
 * SFRPG archetype blocks follow this format:
 *
 *   ARCHETYPE NAME
 *   [Flavor text / description]
 *   Associated Classes: [class list]
 *   Alternate Class Features
 *   [Level X] [Feature Name] — replaces [original feature]
 *
 * Key discriminators:
 *   • "Alternate Class Features" — strongest signal, almost exclusive to archetypes
 *   • "Associated Classes:" listing which base classes can take the archetype
 *   • Level-keyed features using "replaces" or "alters" language
 */

import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class ArchetypeDetector implements IContentDetector {
  readonly category: ContentCategory = "archetypeFeature";

  canDetect(text: string): boolean {
    const hasAlternateFeatures = /alternate\s+class\s+features?/i.test(text);
    const hasAssociatedClasses = /associated\s+classes?\s*:/i.test(text);
    const hasReplaces          = /\breplaces?\b/i.test(text);

    const isNpc    = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
    const isSpell  = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
    const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
    if (isNpc || isSpell || isWeapon) return false;

    let score = 0;
    if (hasAlternateFeatures) score += 5;
    if (hasAssociatedClasses) score += 3;
    if (hasReplaces)          score += 1;

    return score >= 4;
  }

  detect(text: string, pageNumber: number): DetectorMatch[] {
    if (!this.canDetect(text)) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const name             = this.extractName(lines);
    const associatedClasses = this.extractField(text, /associated\s+classes?\s*:\s*([^\n]+)/i);
    const altFeatures      = this.extractAltFeatures(text);
    const description      = this.buildDescription(lines, name);

    let score = 0;
    if (associatedClasses) score++;
    if (altFeatures.length > 0) score++;

    const confidence = Math.min(0.55 + score * 0.15, 0.96);

    return [{
      name: name.trim(),
      rawText: text,
      structuredData: {
        associatedClasses,
        altFeatureCount: altFeatures.length,
        altFeatures: altFeatures.slice(0, 8),
        description,
      },
      confidence,
      startIndex: 0,
      endIndex: text.length,
      pageNumber,
      autoTags: ["archetype"],
    }];
  }

  private extractName(lines: string[]): string {
    for (const line of lines) {
      if (
        !line.includes(":") &&
        !/alternate\s+class/i.test(line) &&
        /^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) &&
        line.length < 60
      ) {
        return line;
      }
    }
    return lines[0] ?? "Unknown Archetype";
  }

  private extractField(text: string, pattern: RegExp): string {
    const m = text.match(pattern);
    return m ? m[1].trim() : "";
  }

  /**
   * Extracts alternate class feature entries (level + feature name pairs).
   */
  private extractAltFeatures(text: string): string[] {
    const features: string[] = [];
    const regex = /(?:(\d+)(?:st|nd|rd|th)\s+level|level\s+(\d+))[^:\n]*[:—–]\s*([^\n]{3,80})/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const lvl = m[1] ?? m[2] ?? "?";
      const feat = m[3].trim();
      features.push(`Level ${lvl}: ${feat}`);
    }
    return features;
  }

  private buildDescription(lines: string[], name: string): string {
    const skip = /^(associated\s+classes?|alternate\s+class\s+features?)/i;
    return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
  }
}
