import type { ActionKind, ActionRequest } from "../actions/types";
import type { IntentEnvelope, LocalLlmPort } from "./contracts";

const ACTION_KINDS = new Set<ActionKind>([
  "industrial_expansion",
  "infrastructure_expansion",
  "energy_expansion",
  "materials_expansion",
  "research_program",
  "military_equipment_production",
  "military_supply_production",
  "military_training",
  "fiscal_policy",
  "generic_project",
]);

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function validateIntentEnvelope(value: unknown): IntentEnvelope {
  if (!value || typeof value !== "object") throw new Error("Intent output must be an object.");
  const raw = value as Record<string, unknown>;
  const action = raw.action as Record<string, unknown> | undefined;
  if (!action || typeof action !== "object") throw new Error("Intent output requires action.");
  if (typeof action.actor !== "string" || action.actor.length === 0) throw new Error("Action actor is required.");
  if (typeof action.kind !== "string" || !ACTION_KINDS.has(action.kind as ActionKind)) {
    throw new Error(`Unsupported action kind: ${String(action.kind)}`);
  }
  if (!isFinitePositive(action.requestedScale)) throw new Error("requestedScale must be finite and positive.");

  const normalized: ActionRequest = {
    actor: action.actor,
    kind: action.kind as ActionKind,
    requestedScale: action.requestedScale,
  };

  if (typeof action.durationMonths === "number" && Number.isFinite(action.durationMonths)) {
    normalized.durationMonths = Math.max(1, Math.ceil(action.durationMonths));
  }
  if (typeof action.target === "string") normalized.target = action.target;
  if (Array.isArray(action.requiredTechnologies)) {
    normalized.requiredTechnologies = action.requiredTechnologies.filter((v): v is string => typeof v === "string");
  }
  if (action.minimumCapacities && typeof action.minimumCapacities === "object") {
    normalized.minimumCapacities = action.minimumCapacities as ActionRequest["minimumCapacities"];
  }
  if (action.capacityCost && typeof action.capacityCost === "object") {
    normalized.capacityCost = action.capacityCost as ActionRequest["capacityCost"];
  }
  if (action.upfrontCost && typeof action.upfrontCost === "object") {
    normalized.upfrontCost = action.upfrontCost as ActionRequest["upfrontCost"];
  }

  return {
    action: normalized,
    confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : undefined,
    notes: Array.isArray(raw.notes) ? raw.notes.filter((v): v is string => typeof v === "string") : undefined,
  };
}

export async function compileIntent(
  llm: LocalLlmPort,
  actor: string,
  playerCommand: string,
): Promise<IntentEnvelope> {
  const raw = await llm.structured<unknown>({
    schemaName: "HistoriaHardSimIntent",
    system: [
      "Convert the player command into exactly one Historia HardSim action.",
      "Do not decide whether it succeeds.",
      "Do not invent state changes, outcomes, rewards, casualties, resources or completion effects.",
      `The actor is ${actor}.`,
    ].join(" "),
    user: playerCommand,
  });
  const validated = validateIntentEnvelope(raw);
  return { ...validated, action: { ...validated.action, actor } };
}
