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
    const nextState = { ...state, polities: { ...state.polities, [project.owner]: nextPolity } };
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
    const nextState = { ...state, polities: { ...state.polities, [project.owner]: nextPolity } };
    const ledgerEntry = makeLedgerEntry(nextState, {
      type: "system_effect",
      actor: project.owner,
      projectId: project.id,
      reason: `Infrastructure expansion added ${gain} logistics capacity by ruleset.`,
      data: { system: "logistics", logisticsCapacityGain: gain },
    });
    return { state: nextState, capacityDelta: { logistics: gain }, ledgerEntry };
  }

  if (project.kind === "energy_expansion" && polity.resources) {
    const gain = project.scale;
    const nextPolity = {
      ...polity,
      resources: {
        ...polity.resources,
        energyProductionMonthly: polity.resources.energyProductionMonthly + gain,
      },
      capacities: { ...polity.capacities, energy: polity.capacities.energy + gain },
    };
    const nextState = { ...state, polities: { ...state.polities, [project.owner]: nextPolity } };
    const ledgerEntry = makeLedgerEntry(nextState, {
      type: "system_effect",
      actor: project.owner,
      projectId: project.id,
      reason: `Energy expansion added ${gain} monthly energy production.`,
      data: { system: "resources", energyProductionGain: gain },
    });
    return { state: nextState, capacityDelta: { energy: gain }, ledgerEntry };
  }

  if (project.kind === "materials_expansion" && polity.resources) {
    const gain = project.scale;
    const nextPolity = {
      ...polity,
      resources: {
        ...polity.resources,
        materialProductionMonthly: polity.resources.materialProductionMonthly + gain,
      },
    };
    const nextState = { ...state, polities: { ...state.polities, [project.owner]: nextPolity } };
    const ledgerEntry = makeLedgerEntry(nextState, {
      type: "system_effect",
      actor: project.owner,
      projectId: project.id,
      reason: `Materials expansion added ${gain} monthly material production.`,
      data: { system: "resources", materialProductionGain: gain },
    });
    return { state: nextState, ledgerEntry };
  }

  if (project.kind === "research_program" && project.target && !polity.technologies.includes(project.target)) {
    const nextPolity = { ...polity, technologies: [...polity.technologies, project.target] };
    const nextState = { ...state, polities: { ...state.polities, [project.owner]: nextPolity } };
    const ledgerEntry = makeLedgerEntry(nextState, {
      type: "technology_unlocked",
      actor: project.owner,
      projectId: project.id,
      reason: `Technology unlocked: ${project.target}.`,
      data: { technology: project.target },
    });
    return { state: nextState, ledgerEntry };
  }

  return { state };
}
