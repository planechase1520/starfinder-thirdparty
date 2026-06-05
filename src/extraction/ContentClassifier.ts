import type { ContentCategory } from "../database/content-record.js";
import type { DetectorMatch, IContentDetector } from "../pdf/pdf-types.js";
import { WeaponDetector } from "./WeaponDetector.js";
import { ArmorDetector } from "./ArmorDetector.js";
import { SpellDetector } from "./SpellDetector.js";
import { NpcDetector } from "./NpcDetector.js";
import { VehicleDetector } from "./VehicleDetector.js";
import { StarshipDetector } from "./StarshipDetector.js";
import { ModuleLogger } from "../utils/logger.js";

export interface ClassifierResult {
  matches: DetectorMatch[];
  dominantCategory: ContentCategory | "unknown";
  blocksProcessed: number;
  durationMs: number;
}

export class ContentClassifier {
  private static detectors: IContentDetector[] = [
    new WeaponDetector(),
    new ArmorDetector(),
    new SpellDetector(),
    new NpcDetector(),
    new VehicleDetector(),
    new StarshipDetector(),
  ];

  static classify(
    textBlocks: Array<{ text: string; pageNumber: number }>,
    minConfidence = 0.3
  ): ClassifierResult {
    const start = Date.now();
    const allMatches: DetectorMatch[] = [];

    for (const block of textBlocks) {
      const blockMatches = this.classifyBlock(block.text, block.pageNumber);
      for (const m of blockMatches) {
        if (m.confidence >= minConfidence) {
          allMatches.push(m);
        }
      }
    }

    const categoryCounts = new Map<string, number>();
    for (const match of allMatches) {
      const cat = match.structuredData._category as string | undefined;
      if (cat) {
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
      }
    }

    let dominantCategory: ContentCategory | "unknown" = "unknown";
    let maxCount = 0;
    for (const [cat, count] of categoryCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantCategory = cat as ContentCategory;
      }
    }

    return {
      matches: allMatches,
      dominantCategory,
      blocksProcessed: textBlocks.length,
      durationMs: Date.now() - start,
    };
  }

  static classifyBlock(text: string, pageNumber: number): DetectorMatch[] {
    const results: DetectorMatch[] = [];
    for (const detector of this.detectors) {
      try {
        if (detector.canDetect(text)) {
          const matches = detector.detect(text, pageNumber);
          for (const m of matches) {
            m.structuredData._category = detector.category;
            results.push(m);
          }
        }
      } catch (err) {
        ModuleLogger.warn(`ContentClassifier: ${detector.category} detector threw an error`, err);
      }
    }
    return results;
  }

  static registerDetector(detector: IContentDetector): void {
    this.detectors.push(detector);
  }
}
