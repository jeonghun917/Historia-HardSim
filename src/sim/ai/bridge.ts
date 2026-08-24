import { applyFiscalPolicy } from "../actions/fiscalPolicy";
import type { SimulationState, WorldDiff } from "../core/types";
import { planProject } from "../projects/planner";
import type { LocalLlmPort } from "./contracts";
import { compileIntent } from "./intentCompiler";
import { narrateComputedResult } from "./narrator";

export interface PlayerTurnResult {
  state: SimulationState;
  diff: WorldDiff;
  narration: string;
}

export async function runPlayerTurn(
  state: SimulationState,
  llm: LocalLlmPort,
  actor: string,
  playerCommand: string,
): Promise<PlayerTurnResult> {
  const intent = await compileIntent(llm, actor, playerCommand);
  let nextState = state;
  let diff: WorldDiff;

  if (intent.action.kind === "fiscal_policy") {
    const metadata = intent.action.metadata ?? {};
    const result = applyFiscalPolicy(state, {
      actor,
      taxRate: typeof metadata.taxRate === "number" ? metadata.taxRate : undefined,
      governmentSpendingAnnual:
        typeof metadata.governmentSpendingAnnual === "number" ? metadata.governmentSpendingAnnual : undefined,
    });
    nextState = result.state;
    diff = result.diff ?? {
      reason: result.error ?? "Fiscal policy action was rejected.",
      events: [result.error ?? "Fiscal policy action was rejected."],
    };
  } else {
    const result = planProject(state, intent.action);
    nextState = result.state;
    diff = result.diff ?? {
      reason: result.validation.failures.map((failure) => failure.message).join(" ") || "Action was rejected.",
      events: result.validation.failures.map((failure) => failure.message),
    };
  }

  const narration = await narrateComputedResult(llm, { playerCommand, diff });
  return { state: nextState, diff, narration };
}
