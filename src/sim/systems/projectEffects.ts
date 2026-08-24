import { makeLedgerEntry } from "../core/ledger";
import type { CapacityPool, LedgerEntry, ProjectState, SimulationState } from "../core/types";

export interface ProjectEffectResult {
  state: SimulationState;
  capacityDelta?: Partial<CapacityPool>;
  ledgerEntry?: LedgerEntry;
}

export function applyProjectCompletionEffect(
  state: SimulationState,
  project: ProjectState,
): ProjectEffectResult {
  const polity = state.polities[project.owner];
  if (!polity) return { state };

  if (project.kind === "industrial_expansion") {
    const gain = project.scale;
    const nextPolity = {
      ...polity,
      capacities: { ...polity.capacities, industry: polity.capacities.industry + gain },
      industryState: polity.industryState
        ? { ...polity.industryState, capitalStock: polity.industryState.capitalStock + gain }
        : { capitalStock: gain, utilization: 0 },
    };
    const nextState = {
      ...state,
      polities: { ...state.polities, [project.owner]: nextPolity },
    };
    const ledgerEntry = makeLedgerEntry(nextState, {
      type: "system_effect",
      actor: project.owner,
      projectId: project.id,
      reason: `Industrial expansion added ${gain} industrial capacity by ruleset.`,
      data: { system: "industry", industryCapacityGain: gain },
    });
    return { state: nextState, capacityDelta: { industry: gain }, ledgerEntry };
  }

  if (project.kind === "infrastructure_expansion") {
    const gain = project.scale;
    const nextPolity = {
      ...polity,
      capacities: { ...polity.capacities, logistics: polity.capacities.logistics + gain },
      logisticsState: polity.logisticsState
        ? { ...polity.logisticsState, networkCapacity: polity.logisticsState.networkCapacity + gain }
        : { networkCapacity: gain, utilization: 0 },
    };
    const nextState = {
      ...state,
      polities: { ...state.polities, [project.owner]: nextPolity },
    };
    const ledgerEntry = makeLedgerEntry(nextState, {
      type: "system_effect",
      actor: project.owner,
      projectId: project.id,
      reason: `Infrastructure expansion added ${gain} logistics capacity by ruleset.`,
      data: { system: "logistics", logisticsCapacityGain: gain },
    });
    return { state: nextState, capacityDelta: { logistics: gain }, ledgerEntry };
  }

  return { state };
}
