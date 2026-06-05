export interface PromptTemplate {
  category: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

export class PromptManager {
  private static readonly prompts = new Map<string, PromptTemplate>();

  static register(template: PromptTemplate): void {
    PromptManager.prompts.set(template.category, template);
  }

  static get(category: string): PromptTemplate | undefined {
    return PromptManager.prompts.get(category);
  }

  static getCategories(): string[] {
    return Array.from(PromptManager.prompts.keys());
  }

  static has(category: string): boolean {
    return PromptManager.prompts.has(category);
  }

  static buildUserPrompt(category: string, rawText: string, sourceBook: string): string {
    const template = PromptManager.get(category);
    if (!template) {
      throw new Error(`No prompt template registered for category: ${category}`);
    }
    return template.userPromptTemplate
      .replace(/\{\{rawText\}\}/g, rawText)
      .replace(/\{\{sourceBook\}\}/g, sourceBook);
  }
}
