export class OcrResultProcessor {
  static process(raw: string): string {
    let text = raw;

    text = text.replace(/(\w)(-?)\r?\n([a-z]\w*)/g, (_match: string, before: string, hyphen: string, after: string): string => {
      if (!hyphen) {
        return before + after;
      }
      const merged = (before + after).toLowerCase();
      const removeHyphenWords = new Set([
        "weapon", "ability", "attack", "damage", "special", "defense", "creature", "standard",
        "action", "movement", "monster", "character", "science", "fantasy", "starfinder", "shield",
        "armor", "feat", "skill", "spell", "level", "range", "speed", "bonus", "penalty", "round"
      ]);
      if (removeHyphenWords.has(merged)) {
        return before + after;
      }
      return before + "-" + after;
    });

    text = text.replace(/\r\n/g, "\n");
    text = text.replace(/ {3,}/g, "  ");

    text = text.split("\n").filter((line: string): boolean => {
      const trimmed = line.trim();
      const isPageNumber = /^(?:[—\-–]?\s*\d+\s*[—\-–]?|page\s+\d+)$/i.test(trimmed);
      return !isPageNumber;
    }).join("\n");

    text = text.replace(/\bSir\b/g, "Str");
    text = text.replace(/\bOex\b/g, "Dex");
    text = text.replace(/\bCon\.\b/g, "Con");
    text = text.replace(/\blnt\b/g, "Int");
    text = text.replace(/\bWls\b/g, "Wis");
    text = text.replace(/\bCha\.\b/g, "Cha");

    text = text.replace(/\bCR(\d)/gi, "CR $1");
    text = text.replace(/\bHP(\d)/gi, "HP $1");

    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
  }

  static estimateQuality(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    const totalChars = text.length;
    const alphaNumericChars = text.replace(/[^a-zA-Z0-9]/g, "").length;
    const alphaNumericRatio = alphaNumericChars / totalChars;

    const words = text.trim().split(/\s+/).filter((w: string): boolean => w.length > 0);
    if (words.length === 0) {
      return 0;
    }

    const totalWordLength = words.reduce((sum: number, w: string): number => sum + w.length, 0);
    const avgWordLength = totalWordLength / words.length;

    let wordLengthScore = 1;
    if (avgWordLength < 3) {
      wordLengthScore = avgWordLength / 3;
    } else if (avgWordLength > 8) {
      wordLengthScore = Math.max(0, 1 - (avgWordLength - 8) / 10);
    }

    let alphaRatioScore = 1;
    if (alphaNumericRatio < 0.5) {
      alphaRatioScore = alphaNumericRatio / 0.5;
    } else if (alphaNumericRatio > 0.95) {
      alphaRatioScore = Math.max(0, 1 - (alphaNumericRatio - 0.95) / 0.05);
    }

    const score = alphaRatioScore * wordLengthScore;
    return Math.max(0, Math.min(1, score));
  }
}
