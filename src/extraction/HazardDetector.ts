/**
 * Hazard Detector — identifies SFRPG hazard entries in extracted PDF text.
 *
 * SFRPG hazard stat blocks look like:
 *
 *   HAZARD NAME       CR X
 *   XP Y
 *   Type [environmental / haunt / trap]
 *   Perception DC Z (to notice)
 *   Disable [skill] DC Z
 *   Trigger [description]
 *   Effect [description]
 *
 * Key discriminators:
 *   • "Perception DC" + "Disable" — core to hazards, absent in NPC blocks
 *   • Hazard types: environmental / haunt / trap
 *   • Has "Trigger:" and/or "Effect:"
 *   • CR present but no EAC/KAC (distinguishes hazard from NPC)
 */

import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

const HAZARD_TYPES = ["environmental", "haunt", "trap", "disease", "radiation", "void", "gravity"];

export class HazardDetector implements IContentDetector {
  readonly category: ContentCategory = "hazard";

  canDetect(text: string): boolean {
    const hasPerceptionDc = /perception\s+dc\s*\d+/i.test(text);
    const hasDisable      = /\bdisable\b/i.test(text);
    const hasTrigger      = /\btrigger\b/i.test(text);
    const hasEffect       = /\beffect\b/i.test(text);
    const hasHazardType   = HAZARD_TYPES.some(t => new RegExp(`\\b${t}\\b`, "i").test(text));

    const isFullNpc = /\beac\s*\d+.*\bkac\s*\d+|\bfort\s+[+-]\d+.*\bref\s+[+-]\d+/i.test(text);
    if (isFullNpc) return false;

    const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
    const isSpell  = /\bcasting\s*time\b|\bschool\s*:/i.test(text);
    if (isWeapon || isSpell) return false;

    let score = 0;
    if (hasPerceptionDc) score += 3;
    if (hasDisable)      score += 2;
    if (hasTrigger)      score += 2;
    if (hasEffect)       score += 1;
    if (hasHazardType)   score += 2;

    return score >= 4;
  }

  detect(text: string, pageNumber: number): DetectorMatch[] {
    if (!this.canDetect(text)) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const name        = this.extractName(lines, text);
    const cr          = this.extractField(text, /\bcr\s+([0-9/]+)/i);
    const xp          = this.extractField(text, /\bxp\s+([\d,]+)/i);
    const hazardType  = this.extractHazardType(text);
    const perceptionDc = this.extractNumber(text, /perception\s+dc\s*(\d+)/i);
    const disableDc   = this.extractNumber(text, /disable\b[^:]*\bdc\s*(\d+)/i);
    const trigger     = this.extractMultiLine(text, /trigger\s*[:;]?\s*/i, /^(?:effect|reset|onset)/i);
    const effect      = this.extractMultiLine(text, /effect\s*[:;]?\s*/i, /^(?:trigger|reset|onset|countermeasures)/i);
    const description = this.buildDescription(lines, name);

    let score = 0;
    if (cr)           score++;
    if (perceptionDc) score++;
    if (disableDc)    score++;

    const confidence = Math.min(0.5 + score * 0.13, 0.96);

    return [{
      name: name.trim(),
      rawText: text,
      structuredData: { cr, xp, hazardType, perceptionDc, disableDc, trigger, effect, description },
      confidence,
      startIndex: 0,
      endIndex: text.length,
      pageNumber,
      autoTags: ["hazard", ...(hazardType ? [hazardType.toLowerCase()] : []), ...(cr ? [`cr-${cr}`] : [])],
    }];
  }

  private extractName(lines: string[], text: string): string {
    const crLineMatch = text.match(/^([^\n]+?)\s+\bcr\s+([0-9/]+)/im);
    if (crLineMatch) return crLineMatch[1].trim();
    for (const line of lines) {
      if (!line.includes(":") && /^[A-Z][A-Za-z0-9\s'\-–]+$/.test(line) && line.length < 60) {
        return line;
      }
    }
    return lines[0] ?? "Unknown Hazard";
  }

  private extractField(text: string, pattern: RegExp): string {
    const m = text.match(pattern);
    return m ? m[1].trim() : "";
  }

  private extractNumber(text: string, pattern: RegExp): number {
    const m = text.match(pattern);
    return m ? parseInt(m[1], 10) : 0;
  }

  private extractHazardType(text: string): string {
    const lower = text.toLowerCase();
    for (const t of HAZARD_TYPES) {
      if (new RegExp(`\\b${t}\\b`).test(lower)) {
        return t.charAt(0).toUpperCase() + t.slice(1);
      }
    }
    return "Hazard";
  }

  private extractMultiLine(text: string, startPattern: RegExp, stopPattern: RegExp): string {
    const startIdx = text.search(startPattern);
    if (startIdx < 0) return "";
    const afterStart = text.slice(startIdx).replace(startPattern, "");
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
    const skip = /^(cr|xp|type|perception\s+dc|disable|trigger|effect|reset|onset)\b/i;
    return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
  }
}
