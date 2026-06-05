import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class WeaponDetector implements IContentDetector {
  readonly category: ContentCategory = "weapon";

  canDetect(text: string): boolean {
    const lowercase = text.toLowerCase();
    const hasDamage = lowercase.includes("damage");
    const hasRange = lowercase.includes("range");
    const hasCapacity = lowercase.includes("capacity");
    const hasUsage = lowercase.includes("usage");
    const hasLevel = /level\s+\d+/i.test(lowercase);
    
    let score = 0;
    if (hasDamage) score += 2;
    if (hasRange) score += 1;
    if (hasCapacity) score += 1;
    if (hasUsage) score += 1;
    if (hasLevel) score += 1;

    const hasCategory = /\b(small arm|long arm|heavy weapon|sniper weapon|melee weapon|grenade|basic melee|advanced melee|small arms|long arms)\b/i.test(lowercase);
    if (hasCategory) score += 2;

    return score >= 3;
  }

  detect(text: string, pageNumber: number): DetectorMatch[] {
    if (!this.canDetect(text)) {
      return [];
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      return [];
    }

    let name = lines[0];
    const cleanLines: string[] = [];
    for (const line of lines) {
      if (/^level\s+(\d+)/i.test(line)) {
        continue;
      }
      cleanLines.push(line);
    }

    if (cleanLines.length > 0 && /^[A-Z0-9\s,\-–']{3,}$/.test(cleanLines[0])) {
      name = cleanLines[0];
    }

    let level = 1;
    const levelMatch = text.match(/\blevel\s+(\d+)/i);
    if (levelMatch) {
      level = parseInt(levelMatch[1], 10);
    }

    let damage = "";
    const damageMatch = text.match(/damage\s+([^;\n]+)/i);
    if (damageMatch) {
      damage = damageMatch[1].trim();
    }

    let damageType = "";
    if (damage) {
      const diceMatch = damage.match(/(\d+d\d+(?:\+\d+)?)\s*([A-Za-z& ]*)/i);
      if (diceMatch && diceMatch[2]) {
        damageType = diceMatch[2].trim();
      }
    }

    let range = "";
    const rangeMatch = text.match(/range\s+([^;\n]+)/i);
    if (rangeMatch) {
      range = rangeMatch[1].trim();
    }

    let capacity = "";
    const capacityMatch = text.match(/capacity\s+([^;\n]+)/i);
    if (capacityMatch) {
      capacity = capacityMatch[1].trim();
    }

    let usage = "";
    const usageMatch = text.match(/usage\s+([^;\n]+)/i);
    if (usageMatch) {
      usage = usageMatch[1].trim();
    }

    let bulk = "";
    const bulkMatch = text.match(/bulk\s+([^;\n]+)/i);
    if (bulkMatch) {
      bulk = bulkMatch[1].trim();
    }

    let weaponType = "Small arm";
    const typeMatch = text.match(/\b(small arm|long arm|heavy weapon|sniper weapon|melee weapon|grenade|basic melee|advanced melee|small arms|long arms|heavy)\b/i);
    if (typeMatch) {
      weaponType = typeMatch[1].trim();
    }

    let special = "";
    const specialMatch = text.match(/special\s+([^;\n]+)/i);
    if (specialMatch) {
      special = specialMatch[1].trim();
    }

    const descriptionLines: string[] = [];
    const weaponTypeRegex = /\b(small arm|long arm|heavy weapon|sniper weapon|melee weapon|grenade|basic melee|advanced melee|small arms|long arms|heavy)\b/i;
    for (const line of lines) {
      if (line.toLowerCase().includes("damage") || line.toLowerCase().includes("capacity") || line.toLowerCase().startsWith("level")) {
        continue;
      }
      if (line === name) {
        continue;
      }
      if (weaponTypeRegex.test(line) && line.length < 30) {
        continue;
      }
      descriptionLines.push(line);
    }
    const description = descriptionLines.join(" ").trim();

    const structuredData = {
      level,
      damage,
      damageType,
      range,
      capacity,
      usage,
      bulk,
      weaponType,
      special,
      description
    };

    let matchedCount = 0;
    if (damage) matchedCount++;
    if (range) matchedCount++;
    if (capacity) matchedCount++;
    if (usage) matchedCount++;
    if (bulk) matchedCount++;
    if (special) matchedCount++;

    const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);

    const autoTags = ["weapon"];
    if (weaponType) {
      autoTags.push(weaponType.toLowerCase().replace(/\s+/g, "-"));
    }

    return [{
      name: name.trim(),
      rawText: text,
      structuredData,
      confidence,
      startIndex: 0,
      endIndex: text.length,
      pageNumber,
      autoTags
    }];
  }
}
