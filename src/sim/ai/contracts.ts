import type { ActionRequest } from "../actions/types";
import type { WorldDiff } from "../core/types";

export interface IntentEnvelope {
  action: ActionRequest;
  confidence?: number;
  notes?: string[];
}

export interface LocalLlmPort {
  structured<T>(input: {
    system: string;
    user: string;
    schemaName: string;
  }): Promise<T>;
  text(input: { system: string; user: string }): Promise<string>;
}

export interface NarrationInput {
  playerCommand?: string;
  diff: WorldDiff;
}
