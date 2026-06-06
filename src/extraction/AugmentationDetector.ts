/**
 * Augmentation Detector — identifies SFRPG augmentation (cybernetic, biotech,
 * magitech, neuro-hack) entries in extracted PDF text.
 *
 * SFRPG augmentation stat blocks look like:
 *
 *   AUGMENTATION NAME          (all-caps heading)
 *   Cybernetic (or Biotech / Magitech / Neuro-hack)
 *   System: [body slot]
 *   Level X; Price Y
 *   [Description]
 *
 * Key discriminators:
 *   • "System:" followed by a body slot (arm, hand, eyes, ears, brain, etc.)
 *   • One of: cybernetic / biotech / magitech / neuro-hack
 *   • Level + Price present
 */

import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

const AUGMENTATION_TYPES = ["cybernetic", "biotech", "magitech", "neuro-hack", "neurohack"];

const BODY_SLOTS = [
  "arm", "hand", "foot", "leg", "eye", "ear", "brain", "heart",
  "lungs", "spinal column", "throat", "skin", "all", "none",
];

export class AugmentationDetector implements IContentDetector {
  readonly category: ContentCategory = "augmentation";

  canDetect(text: string): boolean {
    const lower = text.toLowerCase();

    const hasSystem = /\bsystem\s*:/i.test(text);
    const hasAugType = AUGMENTATION_TYPES.some(t => lower.includes(t));
    const hasSlot = BODY_SLOTS.some(s => lower.includes(s));
    const hasLevel = /\blevel\s+\d{1,2}\b/i.test(text);
    const hasPrice = /\bprice\b/i.test(lower);

    const isNpc    = /\bcr\s+\d|\bfort\s+[+-]\d/i.test(text);
    const isWeapon = /\bdamage\s+\d+d\d+/i.test(text);
    if (isNpc || isWeapon) return false;

    let score = 0;
    if (hasSystem)  score += 4;
    if (hasAugType) score += 3;
    if (hasSlot)    score += 1;
    if (hasLevel)   score += 1;
    if (hasPrice)   score += 1;

    return score >= 4;
  }

  detect(text: string, pageNumber: number): DetectorMatch[] {
    if (!this.canDetect(text)) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const name    = this.extractName(lines);
    const augType = this.extractAugType(text);
    const system  = this.extractSystem(text);
    const level   = this.extractLevel(text);
    const price   = this.extractPrice(text);
    const description = this.buildDescription(lines, name);

    let score = 0;
    if (system)  score++;
    if (augType) score++;
    if (level > 0) score++;

    const confidence = Math.min(0.5 + score * 0.13, 0.96);

    return [{
      name: name.trim(),
      rawText: text,
      structuredData: { augType, system, level, price, description },
      confidence,
      startIndex: 0,
      endIndex: text.length,
      pageNumber,
      autoTags: ["augmentation", ...(augType ? [augType.toLowerCase()] : [])],
    }];
  }

  private extractName(lines: string[]): string {
    for (const line of lines) {
      if (
        !line.includes(":") &&
        !AUGMENTATION_TYPES.some(t => line.toLowerCase() === t) &&
        /^[A-Z][A-Za-z0-9\s'\-–,]+$/.test(line) &&
        line.length < 70
      ) {
        return line;
      }
    }
    return lines[0] ?? "Unknown Augmentation";
  }

  private extractAugType(text: string): string {
    const lower = text.toLowerCase();
    for (const t of AUGMENTATION_TYPES) {
      if (lower.includes(t)) return t.charAt(0).toUpperCase() + t.slice(1);
    }
    return "Augmentation";
  }

  private extractSystem(text: string): string {
    const m = text.match(/system\s*:\s*([^\n;]+)/i);
    return m ? m[1].trim() : "";
  }

  private extractLevel(text: string): number {
    const m = text.match(/\blevel\s+(\d{1,2})\b/i);
    return m ? parseInt(m[1], 10) : 0;
  }

  private extractPrice(text: string): string {
    const m = text.match(/price\s*[:;]?\s*([\d,]+(?:\s*credits?)?)/i);
    return m ? m[1].trim() : "";
  }

  private buildDescription(lines: string[], name: string): string {
    const skip = /^(system|level|price|cybernetic|biotech|magitech|neuro-?hack)\b/i;
    return lines.filter(l => l !== name && !skip.test(l)).join(" ").trim();
  }
}
