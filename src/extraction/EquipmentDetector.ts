/**
 * Equipment Detector — identifies general equipment items in SFRPG PDF text.
 *
 * SFRPG equipment stat blocks look like:
 *
 *   ITEM NAME
 *   Level X; Price Y credits; Bulk L
 *   [Description paragraph]
 *
 * Key discriminators (never appear in weapon/armor blocks at these thresholds):
 *   • "Price:" or "price" followed by a credit value
 *   • "Level" followed by a number (1–20)
 *   • "Bulk" keyword
 *   • No weapon damage dice (e.g., "1d6"), EAC/KAC bonus lines, or CR
 */

import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class EquipmentDetector implements IContentDetector {
  readonly category: ContentCategory = "equipment";

  canDetect(text: string): boolean {
    const lower = text.toLowerCase();

    const hasPrice = /price\s*[\d,]+|\bprice\s+\d/i.test(text);
    const hasLevel = /\blevel\s+\d{1,2}\b/i.test(text);
    const hasBulk  = /\bbulk\b/i.test(lower);
    const hasCapacityOrUsage = /\bcapacity\b|\busage\b/i.test(lower);

    const isWeapon  = /\bdamage\s+\d+d\d+|small\s+arm|long\s+arm|heavy\s+weapon/i.test(text);
    const isArmor   = /\beac\s+bonus\b|\bkac\s+bonus\b|\bmax\s*dex\b/i.test(text);
    const isNpc     = /\bcr\s+\d|\bstr\s+\d|\bfort\s+[+-]\d/i.test(text);
    const isSpell   = /\bcasting\s*time\b|\bschool\s*:/i.test(text);

    if (isWeapon || isArmor || isNpc || isSpell) return false;

    let score = 0;
    if (hasPrice) score += 3;
    if (hasLevel) score += 2;
    if (hasBulk)  score += 2;
    if (hasCapacityOrUsage) score += 1;

    return score >= 4;
  }

  detect(text: string, pageNumber: number): DetectorMatch[] {
    if (!this.canDetect(text)) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const name = this.extractName(lines);
    const level = this.extractLevel(text);
    const price = this.extractPrice(text);
    const bulk  = this.extractBulk(text);
    const hands = this.extractHands(text);
    const capacity = this.extractField(text, /capacity\s*[:;]?\s*([^\n;]+)/i);
    const usage    = this.extractField(text, /usage\s*[:;]?\s*([^\n;]+)/i);
    const slots    = this.extractField(text, /upgrade\s*slots?\s*[:;]?\s*(\d+)/i);
    const description = this.buildDescription(lines, name);

    let score = 0;
    if (level > 0) score++;
    if (price)     score++;
    if (bulk)      score++;

    const confidence = Math.min(0.45 + score * 0.12, 0.95);

    return [{
      name: name.trim(),
      rawText: text,
      structuredData: { level, price, bulk, hands, capacity, usage, upgradeSlots: slots, description },
      confidence,
      startIndex: 0,
      endIndex: text.length,
      pageNumber,
      autoTags: ["equipment"],
    }];
  }

  private extractName(lines: string[]): string {
    for (const line of lines) {
      if (!line.includes(":") && !line.includes(";") && /^[A-Z][A-Za-z0-9\s'\-–,]+$/.test(line) && line.length < 70) {
        return line;
      }
    }
    return lines[0] ?? "Unknown Equipment";
  }

  private extractLevel(text: string): number {
    const m = text.match(/\blevel\s+(\d{1,2})\b/i);
    return m ? parseInt(m[1], 10) : 0;
  }

  private extractPrice(text: string): string {
    const m = text.match(/price\s*[:;]?\s*([\d,]+(?:\s*credits?)?)/i);
    return m ? m[1].trim() : "";
  }

  private extractBulk(text: string): string {
    const m = text.match(/bulk\s*[:;]?\s*([^\n;,]+)/i);
    return m ? m[1].trim().split(/\s/)[0] ?? "" : "";
  }

  private extractHands(text: string): string {
    const m = text.match(/\bhands?\s*[:;]?\s*([^\n;,]+)/i);
    return m ? m[1].trim() : "";
  }

  private extractField(text: string, pattern: RegExp): string {
    const m = text.match(pattern);
    return m ? m[1].trim() : "";
  }

  private buildDescription(lines: string[], name: string): string {
    const skip = /^(level|price|bulk|capacity|usage|upgrade\s*slot|hands?)\b/i;
    return lines
      .filter(l => l !== name && !skip.test(l))
      .join(" ")
      .trim();
  }
}
