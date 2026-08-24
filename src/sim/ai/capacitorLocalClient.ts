import type { LocalLlmPort } from "./contracts";

interface LocalLlmPlugin {
  loadModel(input: { path: string }): Promise<{ ready: boolean }>;
  generate(input: {
    system: string;
    user: string;
    predictLength?: number;
  }): Promise<{ text: string }>;
  unloadModel(): Promise<{ ready: boolean }>;
  status(): Promise<{ ready: boolean; state?: string }>;
}

interface CapacitorLike {
  Plugins?: {
    LocalLlm?: LocalLlmPlugin;
  };
}

function plugin(): LocalLlmPlugin {
  const capacitor = (globalThis as typeof globalThis & { Capacitor?: CapacitorLike }).Capacitor;
  const value = capacitor?.Plugins?.LocalLlm;
  if (!value) throw new Error("Native LocalLlm Capacitor plugin is unavailable.");
  return value;
}

export class CapacitorLocalLlmClient implements LocalLlmPort {
  constructor(private readonly predictLength = 768) {}

  async loadModel(path: string): Promise<void> {
    const result = await plugin().loadModel({ path });
    if (!result.ready) throw new Error("Native model did not become ready.");
  }

  async unloadModel(): Promise<void> {
    await plugin().unloadModel();
  }

  async isReady(): Promise<boolean> {
    return (await plugin().status()).ready;
  }

  private async request(system: string, user: string): Promise<string> {
    const result = await plugin().generate({
      system,
      user,
      predictLength: this.predictLength,
    });
    if (typeof result.text !== "string" || result.text.trim().length === 0) {
      throw new Error("Native LLM returned no usable text.");
    }
    return result.text.trim();
  }

  async structured<T>(input: { system: string; user: string; schemaName: string }): Promise<T> {
    const raw = await this.request(
      `${input.system} Return exactly one valid JSON object for schema ${input.schemaName}; no markdown fences or commentary.`,
      input.user,
    );
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error("Native LLM returned invalid JSON.");
    }
  }

  async text(input: { system: string; user: string }): Promise<string> {
    return this.request(input.system, input.user);
  }
}
