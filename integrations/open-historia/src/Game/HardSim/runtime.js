import {
  CapacitorLocalLlmClient,
  OpenAiCompatibleLocalClient,
  advanceMonths,
  applyDiplomaticAction,
  bootstrapFromOpenHistoriaWorld,
  chooseNpcAction,
  chooseNpcDiplomaticAction,
  planProject,
  runPlayerTurn,
  toOpenHistoriaPresentationPatch,
} from "../../vendor/hardsim/index.js";

const DEFAULT_STORAGE_KEY = "historia-hardsim-state-v1";

function readJsonStorage(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(key, value) {
  globalThis.localStorage?.setItem(key, JSON.stringify(value));
}

export function getNativeLlmPlugin() {
  return globalThis.Capacitor?.Plugins?.LocalLlm ?? null;
}

function createLlmClient(options = {}) {
  if (options.preferNative !== false && getNativeLlmPlugin()) {
    return new CapacitorLocalLlmClient(options.predictLength ?? 768);
  }

  const endpoint = options.endpoint
    || globalThis.localStorage?.getItem("openai_compatible_endpoint")
    || "http://127.0.0.1:11434/v1";
  const model = options.model
    || globalThis.localStorage?.getItem("openai_compatible_model")
    || "qwen";
  const apiKey = options.apiKey
    || globalThis.localStorage?.getItem("openai_compatible_api_key")
    || undefined;
  return new OpenAiCompatibleLocalClient({ endpoint, model, apiKey });
}

export function createHardSimRuntime(options = {}) {
  const storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
  const loadState = options.loadState || (() => readJsonStorage(storageKey));
  const saveState = options.saveState || ((state) => writeJsonStorage(storageKey, state));
  const llm = options.llm || createLlmClient(options.llmOptions);

  function ensureState(world, date) {
    return loadState() || bootstrapFromOpenHistoriaWorld(world, date);
  }

  async function runCommand({ world, date, actor, command }) {
    const state = ensureState(world, date);
    const result = await runPlayerTurn(state, llm, actor, command);
    saveState(result.state);
    return {
      ...result,
      presentation: toOpenHistoriaPresentationPatch(result.state, result.diff),
    };
  }

  function jump({ world, date, months }) {
    const state = ensureState(world, date);
    const result = advanceMonths(state, months);
    saveState(result.state);
    return {
      ...result,
      presentation: toOpenHistoriaPresentationPatch(result.state, result.diff),
    };
  }

  function runNpcTurn({ world, date, actor }) {
    let state = ensureState(world, date);
    const action = chooseNpcAction(state, actor);
    if (action) {
      const planned = planProject(state, action);
      state = planned.state;
    }

    const diplomacy = chooseNpcDiplomaticAction(state, actor);
    if (diplomacy) {
      state = applyDiplomaticAction(
        state,
        actor,
        diplomacy.counterpart,
        diplomacy.action,
        diplomacy.intensity,
      ).state;
    }

    saveState(state);
    return state;
  }

  return {
    ensureState,
    loadState,
    saveState,
    runCommand,
    jump,
    runNpcTurn,
    llm,
  };
}
