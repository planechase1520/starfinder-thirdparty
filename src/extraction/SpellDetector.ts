import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class SpellDetector implements IContentDetector {
  readonly category: ContentCategory = "spell";

  canDetect(text: string): boolean {
    const lowercase = text.toLowerCase();
    const hasSchool = lowercase.includes("school:") || lowercase.includes("school ");
    const hasCastingTime = lowercase.includes("casting time:") || lowercase.includes("casting time ");
    const hasClasses = lowercase.includes("classes:") || lowercase.includes("classes ") || lowercase.includes("mystic ") || lowercase.includes("technomancer ");
    const hasRange = lowercase.includes("range:") || lowercase.includes("range ");
    const hasDuration = lowercase.includes("duration:") || lowercase.includes("duration ");

    let score = 0;
    if (hasSchool) score += 2;
    if (hasCastingTime) score += 2;
    if (hasClasses) score += 1;
    if (hasRange) score += 1;
    if (hasDuration) score += 1;

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
      if (/^school:/i.test(line) || /^classes:/i.test(line)) {
        continue;
      }
      cleanLines.push(line);
    }

    if (cleanLines.length > 0 && /^[A-Z0-9\s,\-–']{3,}$/.test(cleanLines[0])) {
      name = cleanLines[0];
    }

    let school = "";
    const schoolMatch = text.match(/school:?\s*([a-za-z]+)/i);
    if (schoolMatch) {
      school = schoolMatch[1].trim();
    }

    let classesStr = "";
    const classesMatch = text.match(/classes:?\s*([^\n]+)/i);
    if (classesMatch) {
      classesStr = classesMatch[1].trim();
    } else {
      const classLevelMatch = text.match(/(?:mystic|technomancer|witchwarper|precog|caster)\s+\d+/gi);
      if (classLevelMatch) {
        classesStr = classLevelMatch.join(", ");
      }
    }

    const classesList: string[] = [];
    let level = 1;
    if (classesStr) {
      const splitClasses = classesStr.split(",").map(c => c.trim()).filter(Boolean);
      for (const cls of splitClasses) {
        classesList.push(cls);
        const match = cls.match(/\d+/);
        if (match) {
          const l = parseInt(match[0], 10);
          if (l > level) {
            level = l;
          }
        }
      }
    }

    let castingTime = "";
    const castingMatch = text.match(/casting\s*time:?\s*([^\n;]+)/i);
    if (castingMatch) {
      castingTime = castingMatch[1].trim();
    }

    let range = "";
    const rangeMatch = text.match(/range:?\s*([^\n;]+)/i);
    if (rangeMatch) {
      range = rangeMatch[1].trim();
    }

    let targets = "";
    const targetsMatch = text.match(/(?:targets|target|area|effect):?\s*([^\n;]+)/i);
    if (targetsMatch) {
      targets = targetsMatch[1].trim();
    }

    let duration = "";
    const durationMatch = text.match(/duration:?\s*([^\n;]+)/i);
    if (durationMatch) {
      duration = durationMatch[1].trim();
    }

    let savingThrow = "";
    const saveMatch = text.match(/saving\s*throw:?\s*([^;\n]+)/i);
    if (saveMatch) {
      savingThrow = saveMatch[1].trim();
    }

    let spellResistance = "";
    const srMatch = text.match(/spell\s*resistance:?\s*([^\n]+)/i);
    if (srMatch) {
      spellResistance = srMatch[1].trim();
    }

    const descriptionLines: string[] = [];
    const spellKeywords = /^(school|classes|casting\s*time|range|targets|duration|saving\s*throw|spell\s*resistance|target|area|effect):/i;
    for (const line of lines) {
      if (line === name) {
        continue;
      }
      if (spellKeywords.test(line)) {
        continue;
      }
      descriptionLines.push(line);
    }
    const description = descriptionLines.join(" ").trim();

    const structuredData = {
      level,
      school,
      castingTime,
      range,
      targets,
      duration,
      savingThrow,
      spellResistance,
      classes: classesList,
      description
    };

    let matchedCount = 0;
    if (school) matchedCount++;
    if (castingTime) matchedCount++;
    if (range) matchedCount++;
    if (duration) matchedCount++;
    if (savingThrow) matchedCount++;
    if (spellResistance) matchedCount++;

    const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);

    const autoTags = ["spell"];
    if (school) {
      autoTags.push(school.toLowerCase());
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
