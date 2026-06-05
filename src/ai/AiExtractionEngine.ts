import type { ExtractedRecord } from "../pdf/pdf-types.js";
import { type IAiProvider, NullAiProvider, OpenAiCompatibleProvider } from "./AiProvider.js";
import { PromptManager } from "./PromptManager.js";
import { ModuleLogger } from "../utils/logger.js";
import "./ExtractionPrompts.js";

interface Game {
  settings: {
    get(moduleId: string, settingId: string): unknown;
  };
}

declare const game: Game;

export class AiExtractionEngine {
  private readonly provider: IAiProvider;

  constructor(provider: IAiProvider) {
    this.provider = provider;
  }

  async refineRecord(record: ExtractedRecord, sourceBook: string): Promise<ExtractedRecord> {
    if (!this.provider.isConfigured) {
      return record;
    }
    if (!PromptManager.has(record.category)) {
      return record;
    }

    try {
      const template = PromptManager.get(record.category);
      if (!template) {
        return record;
      }

      const userPrompt = PromptManager.buildUserPrompt(record.category, record.rawText, sourceBook);
      const systemPrompt = template.systemPrompt;

      const responseText = await this.provider.complete(userPrompt, systemPrompt);
      const parsedData = JSON.parse(responseText) as unknown;

      if (parsedData && typeof parsedData === "object" && !Array.isArray(parsedData)) {
        const structuredData = parsedData as Record<string, unknown>;
        return {
          ...record,
          structuredData: {
            ...record.structuredData,
            ...structuredData
          },
          detectionMethod: "ai",
          confidence: Math.max(record.confidence, 0.9)
        };
      }
    } catch (error) {
      ModuleLogger.error(`AI Extraction Engine failed to refine record "${record.name}":`, error);
    }

    return record;
  }

  async refineBatch(
    records: ExtractedRecord[],
    sourceBook: string,
    onProgress?: (done: number, total: number) => void
  ): Promise<ExtractedRecord[]> {
    const results: ExtractedRecord[] = [];
    const total = records.length;

    if (onProgress) {
      onProgress(0, total);
    }

    for (let i = 0; i < total; i++) {
      const record = records[i];
      if (record.confidence < 0.7 && PromptManager.has(record.category)) {
        const refined = await this.refineRecord(record, sourceBook);
        results.push(refined);
      } else {
        results.push(record);
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return results;
  }

  static fromSettings(moduleId: string): AiExtractionEngine {
    const apiKeySetting = game.settings.get(moduleId, "aiApiKey");
    const apiKey = typeof apiKeySetting === "string" ? apiKeySetting : "";

    const baseUrlSetting = game.settings.get(moduleId, "aiBaseUrl");
    const baseUrl = typeof baseUrlSetting === "string" ? baseUrlSetting : "https://api.openai.com";

    const modelSetting = game.settings.get(moduleId, "aiModel");
    const model = typeof modelSetting === "string" ? modelSetting : "gpt-4o-mini";

    if (apiKey.trim().length === 0) {
      return new AiExtractionEngine(new NullAiProvider());
    }

    return new AiExtractionEngine(new OpenAiCompatibleProvider(baseUrl, apiKey, model));
  }
}
