import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class ArmorDetector implements IContentDetector {
  readonly category: ContentCategory = "armor";

  canDetect(text: string): boolean {
    const lowercase = text.toLowerCase();
    const hasEac = lowercase.includes("eac bonus") || lowercase.includes("eac +") || lowercase.includes("eac ");
    const hasKac = lowercase.includes("kac bonus") || lowercase.includes("kac +") || lowercase.includes("kac ");
    const hasMaxDex = lowercase.includes("max dex") || lowercase.includes("max. dex");
    const hasAcp = lowercase.includes("armor check") || lowercase.includes("acp");
    
    let score = 0;
    if (hasEac) score += 2;
    if (hasKac) score += 2;
    if (hasMaxDex) score += 1;
    if (hasAcp) score += 1;

    const hasArmorType = /\b(light armor|heavy armor|powered armor)\b/i.test(lowercase);
    if (hasArmorType) score += 2;

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

    let eac = 0;
    const eacMatch = text.match(/(?:eac\s+bonus:?\s*|eac\s*\+?\s*)([+-]?\d+)/i);
    if (eacMatch) {
      eac = parseInt(eacMatch[1], 10);
    }

    let kac = 0;
    const kacMatch = text.match(/(?:kac\s+bonus:?\s*|kac\s*\+?\s*)([+-]?\d+)/i);
    if (kacMatch) {
      kac = parseInt(kacMatch[1], 10);
    }

    let maxDex = 0;
    const maxDexMatch = text.match(/(?:max\s*dex\s*(?:bonus)?:?\s*|max\.\s*dex:?\s*)([+-]?\d+)/i);
    if (maxDexMatch) {
      maxDex = parseInt(maxDexMatch[1], 10);
    }

    let acp = 0;
    const acpMatch = text.match(/(?:armor\s*check\s*(?:penalty)?:?\s*|acp:?\s*)([+-]?\d+)/i);
    if (acpMatch) {
      acp = parseInt(acpMatch[1], 10);
    }

    let speedAdj = "";
    const speedMatch = text.match(/(?:speed\s*adjustment:?\s*|speed:?\s*)([^\n;]+)/i);
    if (speedMatch) {
      speedAdj = speedMatch[1].trim();
    }

    let upgradeSlots = 0;
    const slotsMatch = text.match(/(?:upgrade\s*slots:?\s*|slots:?\s*)(\d+)/i);
    if (slotsMatch) {
      upgradeSlots = parseInt(slotsMatch[1], 10);
    }

    let bulk = "";
    const bulkMatch = text.match(/(?:bulk:?\s*)([^\n;]+)/i);
    if (bulkMatch) {
      bulk = bulkMatch[1].trim();
    }

    let armorType = "Light Armor";
    const typeMatch = text.match(/\b(light armor|heavy armor|powered armor)\b/i);
    if (typeMatch) {
      armorType = typeMatch[1].trim();
    }

    let price = "";
    const priceMatch = text.match(/(?:price|cost):?\s*([^\n;]+)/i);
    if (priceMatch) {
      price = priceMatch[1].trim();
    }

    const descriptionLines: string[] = [];
    const armorKeywords = /\b(light armor|heavy armor|powered armor|eac|kac|max\s*dex|armor\s*check|acp|upgrade\s*slots|slots)\b/i;
    for (const line of lines) {
      if (line.toLowerCase().startsWith("level") || line.toLowerCase().startsWith("price") || line.toLowerCase().includes("eac bonus") || line.toLowerCase().includes("kac bonus")) {
        continue;
      }
      if (line === name) {
        continue;
      }
      if (armorKeywords.test(line) && line.length < 30) {
        continue;
      }
      descriptionLines.push(line);
    }
    const description = descriptionLines.join(" ").trim();

    const structuredData = {
      level,
      eac,
      kac,
      maxDex,
      acp,
      speedAdj,
      upgradeSlots,
      bulk,
      armorType,
      price,
      description
    };

    let matchedCount = 0;
    if (eacMatch) matchedCount++;
    if (kacMatch) matchedCount++;
    if (maxDexMatch) matchedCount++;
    if (acpMatch) matchedCount++;
    if (slotsMatch) matchedCount++;
    if (bulk) matchedCount++;

    const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);

    const autoTags = ["armor"];
    if (armorType) {
      autoTags.push(armorType.toLowerCase().replace(/\s+/g, "-"));
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
