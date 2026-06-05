import type { ContentCategory } from "../database/content-record.js";
import type { IContentDetector, DetectorMatch } from "../pdf/pdf-types.js";

export class VehicleDetector implements IContentDetector {
  readonly category: ContentCategory = "vehicle";

  canDetect(text: string): boolean {
    const lowercase = text.toLowerCase();
    const hasVehicle = lowercase.includes("vehicle");
    const hasHardness = lowercase.includes("hardness");
    const hasAutopilot = lowercase.includes("autopilot");
    const hasCover = lowercase.includes("cover");
    
    let score = 0;
    if (hasVehicle) score += 2;
    if (hasHardness) score += 2;
    if (hasAutopilot) score += 1;
    if (hasCover) score += 1;

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
    const vehicleTypeRegex = /\b(tiny|small|medium|large|huge|gargantuan|colossal)\s+(?:land|sea|air|hover|water|space)?\s*vehicle/i;
    const sizeLineMatch = text.match(vehicleTypeRegex);
    
    if (sizeLineMatch) {
      const matchIndex = lines.findIndex(l => vehicleTypeRegex.test(l));
      if (matchIndex > 0) {
        name = lines[matchIndex - 1];
      }
    }

    let size = "Medium";
    if (sizeLineMatch) {
      size = sizeLineMatch[1].charAt(0).toUpperCase() + sizeLineMatch[1].slice(1).toLowerCase();
    }

    let speed = "";
    const speedMatch = text.match(/speed\s*([^\n;]+)/i);
    if (speedMatch) {
      speed = speedMatch[1].trim();
    }

    let eac = 10;
    const eacMatch = text.match(/eac\s*(\d+)/i);
    if (eacMatch) {
      eac = parseInt(eacMatch[1], 10);
    }

    let kac = 10;
    const kacMatch = text.match(/kac\s*(\d+)/i);
    if (kacMatch) {
      kac = parseInt(kacMatch[1], 10);
    }

    let hp = 0;
    const hpMatch = text.match(/hp\s*(\d+)/i);
    if (hpMatch) {
      hp = parseInt(hpMatch[1], 10);
    }

    let hardness = 0;
    const hardnessMatch = text.match(/hardness\s*(\d+)/i);
    if (hardnessMatch) {
      hardness = parseInt(hardnessMatch[1], 10);
    }

    let attacks = "";
    const attacksMatch = text.match(/(?:attack|attacks|attack\s*\(ram\))\s*:?\s*([^\n]+)/i);
    if (attacksMatch) {
      attacks = attacksMatch[1].trim();
    }

    let crew = "";
    const crewMatch = text.match(/crew\s*:?\s*([^\n;]+)/i);
    if (crewMatch) {
      crew = crewMatch[1].trim();
    }

    let passengers = "";
    const passengersMatch = text.match(/passengers\s*:?\s*([^\n;]+)/i);
    if (passengersMatch) {
      passengers = passengersMatch[1].trim();
    }

    let cargo = "";
    const cargoMatch = text.match(/cargo\s*:?\s*([^\n;]+)/i);
    if (cargoMatch) {
      cargo = cargoMatch[1].trim();
    }

    let modifiers = "";
    const modifiersMatch = text.match(/modifiers\s*:?\s*([^\n]+)/i);
    if (modifiersMatch) {
      modifiers = modifiersMatch[1].trim();
    }

    const descriptionLines: string[] = [];
    const vehicleKeywords = /^(speed|eac|kac|hp|hardness|attacks|attack|crew|passengers|cargo|modifiers|autopilot):?/i;
    for (const line of lines) {
      if (line === name || vehicleTypeRegex.test(line)) {
        continue;
      }
      if (vehicleKeywords.test(line)) {
        continue;
      }
      descriptionLines.push(line);
    }
    const description = descriptionLines.join(" ").trim();

    const structuredData = {
      size,
      speed,
      eac,
      kac,
      hp,
      hardness,
      attacks,
      crew,
      passengers,
      cargo,
      modifiers,
      description
    };

    let matchedCount = 0;
    if (sizeLineMatch) matchedCount++;
    if (speedMatch) matchedCount++;
    if (eacMatch) matchedCount++;
    if (kacMatch) matchedCount++;
    if (hardnessMatch) matchedCount++;
    if (crewMatch) matchedCount++;

    const confidence = Math.min(0.4 + (matchedCount * 0.1), 1.0);

    const autoTags = ["vehicle", size.toLowerCase()];

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
