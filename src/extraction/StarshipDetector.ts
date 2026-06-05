import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class StarshipDetector implements IContentDetector {
  readonly category: ContentCategory = "starship";

  canDetect(text: string): boolean {
    const lowercase = text.toLowerCase();
    const hasStarship = lowercase.includes("starship");
    const hasTier = /\btier\s+\d+/i.test(lowercase);
    const hasHpDtCt = lowercase.includes("hp") && (lowercase.includes("dt") || lowercase.includes("ct"));
    const hasShields = lowercase.includes("shields");

    let score = 0;
    if (hasStarship) score += 2;
    if (hasTier) score += 2;
    if (hasHpDtCt) score += 2;
    if (hasShields) score += 1;

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
    const tierMatch = text.match(/^([^\n]+?)\s+\btier\s+(\d+)/i);
    if (tierMatch) {
      name = tierMatch[1].trim();
    } else {
      for (const line of lines) {
        const match = line.match(/^([^\n]+?)\s+\btier\s+(\d+)/i);
        if (match) {
          name = match[1].trim();
          break;
        }
      }
    }

    let tier = "1";
    const tierRegexMatch = text.match(/\btier\s*(\d+)/i);
    if (tierRegexMatch) {
      tier = tierRegexMatch[1];
    }

    let size = "Medium";
    const sizePattern = /\b(tiny|small|medium|large|huge|gargantuan|colossal)\s+starship/i;
    const sizeRegexMatch = text.match(sizePattern);
    if (sizeRegexMatch) {
      size = sizeRegexMatch[1].charAt(0).toUpperCase() + sizeRegexMatch[1].slice(1).toLowerCase();
    }

    let hp = 0;
    const hpMatch = text.match(/\bhp\s*(\d+)/i);
    if (hpMatch) {
      hp = parseInt(hpMatch[1], 10);
    }

    let dt = 0;
    const dtMatch = text.match(/\bdt\s*(\d+)/i);
    if (dtMatch) {
      dt = parseInt(dtMatch[1], 10);
    }

    let ct = 0;
    const ctMatch = text.match(/\bct\s*(\d+)/i);
    if (ctMatch) {
      ct = parseInt(ctMatch[1], 10);
    }

    let speed = 0;
    const speedMatch = text.match(/\bspeed\s*(\d+)/i);
    if (speedMatch) {
      speed = parseInt(speedMatch[1], 10);
    }

    let maneuverability = "average";
    const manMatch = text.match(/\bmaneuverability\s*([a-za-z0-9()\-–\s]+)/i);
    if (manMatch) {
      maneuverability = manMatch[1].trim();
    }

    const shields = { forward: 0, port: 0, starboard: 0, aft: 0 };
    const shieldMatch = text.match(/shields\s*(?:forward\s*(\d+),\s*port\s*(\d+),\s*starboard\s*(\d+),\s*aft\s*(\d+)|([^\n]+))/i);
    if (shieldMatch) {
      if (shieldMatch[1]) {
        shields.forward = parseInt(shieldMatch[1], 10);
        shields.port = parseInt(shieldMatch[2], 10);
        shields.starboard = parseInt(shieldMatch[3], 10);
        shields.aft = parseInt(shieldMatch[4], 10);
      } else if (shieldMatch[5]) {
        const genValMatch = shieldMatch[5].match(/\d+/);
        if (genValMatch) {
          const v = parseInt(genValMatch[0], 10);
          shields.forward = v;
          shields.port = v;
          shields.starboard = v;
          shields.aft = v;
        }
      }
    }

    let powerCore = "";
    const pcMatch = text.match(/power\s*core\s*:?\s*([^\n;]+)/i);
    if (pcMatch) {
      powerCore = pcMatch[1].trim();
    }

    let driftEngine = "";
    const driftMatch = text.match(/drift\s*engine\s*:?\s*([^\n;]+)/i);
    if (driftMatch) {
      driftEngine = driftMatch[1].trim();
    }

    let sensors = "";
    const sensMatch = text.match(/sensors\s*:?\s*([^\n;]+)/i);
    if (sensMatch) {
      sensors = sensMatch[1].trim();
    }

    const attacks: string[] = [];
    for (const line of lines) {
      if (/^attack\s*\(/i.test(line)) {
        attacks.push(line.trim());
      }
    }

    const crew = { captain: "", pilot: "", gunner: "", engineer: "", scienceOfficer: "" };
    const crewLineMatch = text.match(/crew\s*:?\s*([^\n]+)/i);
    if (crewLineMatch) {
      const crewStr = crewLineMatch[1].toLowerCase();
      if (crewStr.includes("captain")) crew.captain = "Captain";
      if (crewStr.includes("pilot")) crew.pilot = "Pilot";
      if (crewStr.includes("gunner")) crew.gunner = "Gunner";
      if (crewStr.includes("engineer")) crew.engineer = "Engineer";
      if (crewStr.includes("science officer") || crewStr.includes("science")) crew.scienceOfficer = "Science Officer";
    }

    const descriptionLines: string[] = [];
    const starshipKeywords = /^(tier|speed|maneuverability|hp|dt|ct|shields|power\s*core|drift\s*engine|sensors|attack|attacks|crew):?/i;
    for (const line of lines) {
      if (line === name || sizePattern.test(line)) {
        continue;
      }
      if (starshipKeywords.test(line)) {
        continue;
      }
      descriptionLines.push(line);
    }
    const description = descriptionLines.join(" ").trim();

    const structuredData = {
      tier,
      size,
      hp,
      dt,
      ct,
      speed,
      maneuverability,
      shields,
      powerCore,
      driftEngine,
      sensors,
      attacks,
      crew,
      description
    };

    let matchedCount = 0;
    if (tierRegexMatch) matchedCount++;
    if (sizeRegexMatch) matchedCount++;
    if (hpMatch) matchedCount++;
    if (shieldMatch) matchedCount++;
    if (pcMatch) matchedCount++;
    if (sensMatch) matchedCount++;

    const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);

    const autoTags = ["starship", size.toLowerCase()];

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
