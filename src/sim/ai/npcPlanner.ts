import type { ActionRequest } from "../actions/types";
import { validateAction } from "../actions/validator";
import type { PolityId, SimulationState } from "../core/types";
import type { DiplomaticAction } from "../systems/diplomacy";

function candidateActions(state: SimulationState, actor: PolityId): ActionRequest[] {
  const polity = state.polities[actor];
  if (!polity) return [];
  const candidates: ActionRequest[] = [];

  if (polity.military && polity.military.supplyStock < polity.military.monthlySupplyDemand * 3) {
    candidates.push({
      actor,
      kind: "military_supply_production",
      requestedScale: Math.max(1, polity.military.monthlySupplyDemand * 3 - polity.military.supplyStock),
      durationMonths: 2,
      capacityCost: { industry: 0.5, logistics: 0.25 },
      upfrontCost: { materials: 0.5 },
    });
  }

  if (polity.resources && polity.resources.energyProductionMonthly < polity.resources.energyDemandMonthly) {
    candidates.push({
      actor,
      kind: "energy_expansion",
      requestedScale: Math.max(1, polity.resources.energyDemandMonthly - polity.resources.energyProductionMonthly),
      durationMonths: 12,
      capacityCost: { industry: 0.5, logistics: 0.2 },
      upfrontCost: { treasury: 1, materials: 0.5 },
    });
  }

  if (polity.resources && polity.resources.materialProductionMonthly < polity.resources.materialDemandMonthly) {
    candidates.push({
      actor,
      kind: "materials_expansion",
      requestedScale: Math.max(1, polity.resources.materialDemandMonthly - polity.resources.materialProductionMonthly),
      durationMonths: 12,
      capacityCost: { industry: 0.5, logistics: 0.3 },
      upfrontCost: { treasury: 1 },
    });
  }

  if (polity.industryState && polity.capacities.industry < polity.industryState.capitalStock * 1.1) {
    candidates.push({
      actor,
      kind: "industrial_expansion",
      requestedScale: Math.max(1, polity.industryState.capitalStock * 0.1),
      durationMonths: 18,
      capacityCost: { industry: 0.4, logistics: 0.2 },
      upfrontCost: { treasury: 1, materials: 0.5 },
    });
  }

  candidates.push({
    actor,
    kind: "infrastructure_expansion",
    requestedScale: 1,
    durationMonths: 12,
    capacityCost: { industry: 0.5, logistics: 0.25 },
    upfrontCost: { treasury: 1, materials: 0.25 },
  });

  return candidates;
}

export function chooseNpcAction(state: SimulationState, actor: PolityId): ActionRequest | undefined {
  for (const candidate of candidateActions(state, actor)) {
    const validation = validateAction(state, candidate);
    if (validation.status === "rejected") continue;
    return { ...candidate, requestedScale: validation.feasibleScale };
  }
  return undefined;
}

export interface NpcDiplomaticChoice {
  counterpart: PolityId;
  action: DiplomaticAction;
  intensity: number;
}

export function chooseNpcDiplomaticAction(
  state: SimulationState,
  actor: PolityId,
): NpcDiplomaticChoice | undefined {
  const polity = state.polities[actor];
  if (!polity) return undefined;

  const relations = Object.entries(polity.diplomacy ?? {});
  for (const [counterpart, relation] of relations) {
    if (!state.polities[counterpart]) continue;
    if (relation.tension > 0.7) {
      return { counterpart, action: "reduce_tension", intensity: 0.15 };
    }
    if (relation.trust > 0.7 && relation.treatyCommitment < 0.5) {
      return { counterpart, action: "formalize_cooperation", intensity: 0.1 };
    }
    if (relation.tradeDependence < 0.3 && relation.tension < 0.5) {
      return { counterpart, action: "expand_trade", intensity: 0.1 };
    }
  }

  return undefined;
}

export function chooseNpcFrontPriority(state: SimulationState, actor: PolityId): string | undefined {
  let bestId: string | undefined;
  let bestScore = -Infinity;
  for (const front of Object.values(state.fronts ?? {})) {
    if (front.attacker !== actor && front.defender !== actor) continue;
    const rolePressure = front.attacker === actor ? front.pressure : 1 - front.pressure;
    const regionValue = front.regionIds.reduce(
      (sum, regionId) => sum + (state.regions?.[regionId]?.strategicValue ?? 1),
      0,
    );
    const score = regionValue * 0.5 + front.supplyFactor * 0.3 + rolePressure * 0.2;
    if (score > bestScore) {
      bestScore = score;
      bestId = front.id;
    }
  }
  return bestId;
}
