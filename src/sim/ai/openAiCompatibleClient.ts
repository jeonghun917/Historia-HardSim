import type { LocalLlmPort } from "./contracts";

export interface OpenAiCompatibleClientOptions {
  endpoint: string;
  model: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function extractText(payload: unknown): string {
  const value = payload as {
    choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
  };
  const message = value.choices?.[0]?.message;
  const toolArguments = message?.tool_calls?.[0]?.function?.arguments;
  if (typeof toolArguments === "string" && toolArguments.length > 0) return toolArguments;
  if (typeof message?.content === "string") return message.content;
  throw new Error("Local LLM response contained no usable content.");
}

export class OpenAiCompatibleLocalClient implements LocalLlmPort {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenAiCompatibleClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request(system: string, user: string, structured: boolean): Promise<string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.options.apiKey) headers.authorization = `Bearer ${this.options.apiKey}`;

    const response = await this.fetchImpl(joinUrl(this.options.endpoint, "chat/completions"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.options.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: structured ? 0 : 0.4,
        ...(structured ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Local LLM request failed (${response.status}): ${body.slice(0, 300)}`);
    }
    return extractText(await response.json());
  }

  async structured<T>(input: { system: string; user: string; schemaName: string }): Promise<T> {
    const raw = await this.request(
      `${input.system} Return only one JSON object for schema ${input.schemaName}.`,
      input.user,
      true,
    );
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error("Local LLM returned invalid JSON.");
    }
  }

  async text(input: { system: string; user: string }): Promise<string> {
    return this.request(input.system, input.user, false);
  }
}
