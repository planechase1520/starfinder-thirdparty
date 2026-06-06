/**
 * Feat Detector — identifies SFRPG feat entries in extracted PDF text.
 *
 * SFRPG feat blocks follow this format:
 *
 *   FEAT NAME (Combat / General / Skill / etc.)
 *   Prerequisites: [list or "none"]
 *   Benefit: [description of what the feat does]
 *   Special: [optional extra note]
 *   Normal: [optional note about what characters without the feat can do]
 *
 * Key discriminators:
 *   • "Benefit:" — the single strongest signal (always present on feats)
 *   • "Prerequisites:" or "Prerequisite:"
 *   • Optional "(Combat)", "(General)", "(Skill)", "(Teamwork)" tag on the name line
 *   • No stat-block numbers (no EAC, KAC, CR, Str/Dex/Con)
 */

import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

const FEAT_TYPE_TAGS = ["combat", "general", "skill", "teamwork", "gunnery", "psionics"];

export class FeatDetector implements IContentDetector {
  readonly category: ContentCategory = "feat";

  canDetect(text: string): boolean {
    const hasBenefit       = /\bbenefit\s*:/i.test(text);
    const hasPrerequisite  = /\bprerequisites?\s*:/i.test(text);

    const isNpc    = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
    const isSpell  = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
    const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
    if (isNpc || isSpell || isWeapon) return false;

    let score = 0;
    if (hasBenefit)      score += 4;
    if (hasPrerequisite) score += 2;

    return score >= 4;
  }

  detect(text: string, pageNumber: number): DetectorMatch[] {
    if (!this.canDetect(text)) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const { name, featType } = this.extractNameAndType(lines);
    const prerequisites = this.extractField(text, /prerequisites?\s*:\s*([^\n]+)/i);
    const benefit       = this.extractMultiLine(text, /benefit\s*:\s*/i, /^(?:special|normal|prerequisite)/i);
    const special       = this.extractField(text, /special\s*:\s*([^\n]+)/i);
    const normal        = this.extractField(text, /normal\s*:\s*([^\n]+)/i);
    const description   = benefit || this.buildDescription(lines, name);

    let score = 0;
    if (prerequisites) score++;
    if (benefit)       score++;
    if (featType)      score++;

    const confidence = Math.min(0.5 + score * 0.13, 0.95);

    return [{
      name: name.trim(),
      rawText: text,
      structuredData: { featType, prerequisites, benefit, special, normal, description },
      confidence,
      startIndex: 0,
      endIndex: text.length,
      pageNumber,
      autoTags: ["feat", ...(featType ? [featType.toLowerCase()] : [])],
    }];
  }

  private extractNameAndType(lines: string[]): { name: string; featType: string } {
    for (const line of lines) {
      if (!line.includes(":")) {
        const typeMatch = line.match(/\(([A-Za-z]+)\)\s*$/);
        if (typeMatch) {
          const featType = typeMatch[1];
          const name = line.replace(/\s*\([A-Za-z]+\)\s*$/, "").trim();
          return { name, featType };
        }
        if (/^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) && line.length < 70) {
          const lower = line.toLowerCase();
          const detectedType = FEAT_TYPE_TAGS.find(t => lower.includes(t)) ?? "";
          return { name: line, featType: detectedType };
        }
      }
    }
    return { name: lines[0] ?? "Unknown Feat", featType: "" };
  }

  private extractField(text: string, pattern: RegExp): string {
    const m = text.match(pattern);
    return m ? m[1].trim() : "";
  }

  /**
   * Extracts a multi-line field value starting after `startPattern` and
   * ending when a line begins with `stopPattern`.
   */
  private extractMultiLine(text: string, startPattern: RegExp, stopPattern: RegExp): string {
    const startMatch = text.search(startPattern);
    if (startMatch < 0) return "";
    const afterStart = text.slice(startMatch).replace(startPattern, "");
    const lines = afterStart.split(/\r?\n/);
    const result: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (result.length > 0 && stopPattern.test(trimmed)) break;
      if (trimmed) result.push(trimmed);
    }
    return result.join(" ").trim();
  }

  private buildDescription(lines: string[], name: string): string {
    const skip = /^(prerequisites?|benefit|special|normal)\s*:/i;
    return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
  }
}
