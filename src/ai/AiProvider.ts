export interface IAiProvider {
  name: string;
  isConfigured: boolean;
  complete(prompt: string, systemPrompt: string): Promise<string>;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenAiCompatibleProvider implements IAiProvider {
  public readonly name = "openai-compatible";
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(baseUrl: string, apiKey: string, model: string = "gpt-4o-mini") {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  get isConfigured(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  async complete(prompt: string, systemPrompt: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error("OpenAI provider is not configured: API key is missing.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 2000
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("AI provider authentication failed: invalid API key.");
        }
        if (response.status === 429) {
          throw new Error("AI provider rate limit exceeded. Please try again later.");
        }
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`AI provider request failed with status ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("AI provider returned an empty or invalid response structure.");
      }

      return content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("AI provider request timed out after 30 seconds.");
      }
      throw error;
    }
  }
}

export class NullAiProvider implements IAiProvider {
  public readonly name = "null-provider";
  public readonly isConfigured = false;

  complete(): Promise<string> {
    return Promise.reject(new Error("AI provider is not configured."));
  }
}
