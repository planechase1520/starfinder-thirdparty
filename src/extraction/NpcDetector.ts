import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class NpcDetector implements IContentDetector {
  readonly category: ContentCategory = "npc";

  canDetect(text: string): boolean {
    const lowercase = text.toLowerCase();
    const hasCr = /\bcr\s+\d+/i.test(lowercase) || /\bcr\s+\d+\/\d+/i.test(lowercase);
    const hasEacKac = lowercase.includes("eac") && lowercase.includes("kac");
    const hasSaves = lowercase.includes("fort") && lowercase.includes("ref") && lowercase.includes("will");
    const hasAbilities = lowercase.includes("str") && lowercase.includes("dex") && lowercase.includes("con");
    
    let score = 0;
    if (hasCr) score += 2;
    if (hasEacKac) score += 2;
    if (hasSaves) score += 1;
    if (hasAbilities) score += 1;

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
    const crLineMatch = text.match(/^([^\n]+?)\s+\bcr\s+([0-9/]+)/i);
    if (crLineMatch) {
      name = crLineMatch[1].trim();
    } else {
      for (const line of lines) {
        const match = line.match(/^([^\n]+?)\s+\bcr\s+([0-9/]+)/i);
        if (match) {
          name = match[1].trim();
          break;
        }
      }
    }

    let cr = "1";
    const crMatch = text.match(/\bcr\s+([0-9/]+)/i);
    if (crMatch) {
      cr = crMatch[1].trim();
    }

    let xp = "";
    const xpMatch = text.match(/\bxp\s+([0-9,]+)/i);
    if (xpMatch) {
      xp = xpMatch[1].trim();
    }

    let hp = 0;
    const hpMatch = text.match(/\bhp\s+(\d+)/i);
    if (hpMatch) {
      hp = parseInt(hpMatch[1], 10);
    }

    let eac = 10;
    const eacMatch = text.match(/\beac\s*(\d+)/i);
    if (eacMatch) {
      eac = parseInt(eacMatch[1], 10);
    }

    let kac = 10;
    const kacMatch = text.match(/\bkac\s*(\d+)/i);
    if (kacMatch) {
      kac = parseInt(kacMatch[1], 10);
    }

    let fort = 0;
    const fortMatch = text.match(/\bfort\s*([+-]\d+)/i);
    if (fortMatch) {
      fort = parseInt(fortMatch[1], 10);
    }

    let ref = 0;
    const refMatch = text.match(/\bref\s*([+-]\d+)/i);
    if (refMatch) {
      ref = parseInt(refMatch[1], 10);
    }

    let will = 0;
    const willMatch = text.match(/\bwill\s*([+-]\d+)/i);
    if (willMatch) {
      will = parseInt(willMatch[1], 10);
    }

    let str = 10;
    const strMatch = text.match(/\bstr\s*([+-]?\d+)/i);
    if (strMatch) {
      str = parseInt(strMatch[1], 10);
    }

    let dex = 10;
    const dexMatch = text.match(/\bdex\s*([+-]?\d+)/i);
    if (dexMatch) {
      dex = parseInt(dexMatch[1], 10);
    }

    let con = 10;
    const conMatch = text.match(/\bcon\s*([+-]?\d+)/i);
    if (conMatch) {
      con = parseInt(conMatch[1], 10);
    }

    let int = 10;
    const intMatch = text.match(/\bint\s*([+-]?\d+)/i);
    if (intMatch) {
      int = parseInt(intMatch[1], 10);
    }

    let wis = 10;
    const wisMatch = text.match(/\bwis\s*([+-]?\d+)/i);
    if (wisMatch) {
      wis = parseInt(wisMatch[1], 10);
    }

    let cha = 10;
    const chaMatch = text.match(/\bcha\s*([+-]?\d+)/i);
    if (chaMatch) {
      cha = parseInt(chaMatch[1], 10);
    }

    let speed = "";
    const speedMatch = text.match(/\bspeed\s*([^\n;]+)/i);
    if (speedMatch) {
      speed = speedMatch[1].trim();
    }

    let initiative = 0;
    const initMatch = text.match(/\b(?:init|initiative)\s*([+-]?\d+)/i);
    if (initMatch) {
      initiative = parseInt(initMatch[1], 10);
    }

    const attacks: string[] = [];
    for (const line of lines) {
      if (/^(?:melee|ranged)\s+/i.test(line)) {
        attacks.push(line.trim());
      }
    }

    let skills = "";
    const skillsMatch = text.match(/\bskills\s*([^\n]+)/i);
    if (skillsMatch) {
      skills = skillsMatch[1].trim();
    }

    let languages = "";
    const languagesMatch = text.match(/\blanguages\s*([^\n]+)/i);
    if (languagesMatch) {
      languages = languagesMatch[1].trim();
    }

    const descriptionLines: string[] = [];
    const npcKeywords = /^(xp|init|senses|perception|eac|kac|fort|ref|will|hp|speed|melee|ranged|str|dex|con|int|wis|cha|skills|languages|other gear|tactics|defense|offense|statistics):?/i;
    for (const line of lines) {
      if (line === name || line.includes("CR " + cr)) {
        continue;
      }
      if (npcKeywords.test(line)) {
        continue;
      }
      descriptionLines.push(line);
    }
    const description = descriptionLines.join(" ").trim();

    const structuredData = {
      cr,
      xp,
      hp,
      eac,
      kac,
      fort,
      ref,
      will,
      str,
      dex,
      con,
      int,
      wis,
      cha,
      speed,
      initiative,
      attacks,
      skills,
      languages,
      description
    };

    let matchedCount = 0;
    if (crMatch) matchedCount++;
    if (xpMatch) matchedCount++;
    if (hpMatch) matchedCount++;
    if (eacMatch) matchedCount++;
    if (kacMatch) matchedCount++;
    if (strMatch) matchedCount++;
    if (skillsMatch) matchedCount++;

    const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);

    const autoTags = ["npc", `cr-${cr}`];

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
