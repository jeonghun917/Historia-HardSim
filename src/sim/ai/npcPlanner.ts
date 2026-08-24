import type { ActionRequest } from "../actions/types";
import { validateAction } from "../actions/validator";
import type { PolityId, SimulationState } from "../core/types";
import type { DiplomaticAction } from "../systems/diplomacy";

interface ScoredCandidate {
  action: ActionRequest;
  score: number;
  reason: string;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function candidateActions(state: SimulationState, actor: PolityId): ScoredCandidate[] {
  const polity = state.polities[actor];
  if (!polity) return [];
  const candidates: ScoredCandidate[] = [];

  const treasuryPressure = polity.economy
    ? clamp01(polity.economy.debt / Math.max(1, polity.economy.gdp))
    : 0;
  const logisticsPressure = polity.logisticsState
    ? clamp01(polity.logisticsState.utilization)
    : 0;
  const industryPressure = polity.industryState
    ? clamp01(polity.industryState.utilization)
    : 0;

  if (polity.military && polity.military.supplyStock < polity.military.monthlySupplyDemand * 3) {
    const shortage = clamp01(
      1 - polity.military.supplyStock / Math.max(1, polity.military.monthlySupplyDemand * 3),
    );
    candidates.push({
      score: 0.9 + shortage * 1.4 + logisticsPressure * 0.2,
      reason: "restore strategic supply buffer",
      action: {
        actor,
        kind: "military_supply_production",
        requestedScale: Math.max(1, polity.military.monthlySupplyDemand * 3 - polity.military.supplyStock),
        durationMonths: 2,
        capacityCost: { industry: 0.5, logistics: 0.25 },
        upfrontCost: { materials: 0.5 },
      },
    });
  }

  if (polity.resources && polity.resources.energyProductionMonthly < polity.resources.energyDemandMonthly) {
    const shortage = clamp01(
      1 - polity.resources.energyProductionMonthly / Math.max(1, polity.resources.energyDemandMonthly),
    );
    candidates.push({
      score: 1.2 + shortage * 2 + industryPressure * 0.3,
      reason: "remove energy bottleneck",
      action: {
        actor,
        kind: "energy_expansion",
        requestedScale: Math.max(1, polity.resources.energyDemandMonthly - polity.resources.energyProductionMonthly),
        durationMonths: 12,
        capacityCost: { industry: 0.5, logistics: 0.2 },
        upfrontCost: { treasury: 1, materials: 0.5 },
      },
    });
  }

  if (polity.resources && polity.resources.materialProductionMonthly < polity.resources.materialDemandMonthly) {
    const shortage = clamp01(
      1 - polity.resources.materialProductionMonthly / Math.max(1, polity.resources.materialDemandMonthly),
    );
    candidates.push({
      score: 1.1 + shortage * 1.8 + industryPressure * 0.2,
      reason: "remove material bottleneck",
      action: {
        actor,
        kind: "materials_expansion",
        requestedScale: Math.max(1, polity.resources.materialDemandMonthly - polity.resources.materialProductionMonthly),
        durationMonths: 12,
        capacityCost: { industry: 0.5, logistics: 0.3 },
        upfrontCost: { treasury: 1 },
      },
    });
  }

  if (polity.industryState && polity.capacities.industry < polity.industryState.capitalStock * 1.1) {
    candidates.push({
      score: 0.8 + industryPressure * 1.2 - treasuryPressure * 0.5,
      reason: "expand productive capacity",
      action: {
        actor,
        kind: "industrial_expansion",
        requestedScale: Math.max(1, polity.industryState.capitalStock * 0.1),
        durationMonths: 18,
        capacityCost: { industry: 0.4, logistics: 0.2 },
        upfrontCost: { treasury: 1, materials: 0.5 },
      },
    });
  }

  candidates.push({
    score: 0.55 + logisticsPressure * 1.25 - treasuryPressure * 0.4,
    reason: "relieve infrastructure pressure",
    action: {
      actor,
      kind: "infrastructure_expansion",
      requestedScale: 1,
      durationMonths: 12,
      capacityCost: { industry: 0.5, logistics: 0.25 },
      upfrontCost: { treasury: 1, materials: 0.25 },
    },
  });

  if (polity.researchState && polity.capacities.research > 0) {
    candidates.push({
      score: 0.45 + clamp01(polity.capacities.research / 100) * 0.8 - treasuryPressure * 0.2,
      reason: "convert spare research capacity into long-run capability",
      action: {
        actor,
        kind: "research_program",
        requestedScale: Math.max(1, polity.capacities.research * 0.1),
        durationMonths: 12,
        capacityCost: { research: 0.5, administration: 0.1 },
        upfrontCost: { treasury: 0.5 },
      },
    });
  }

  return candidates;
}

export interface NpcActionChoice {
  action: ActionRequest;
  score: number;
  reason: string;
}

export function rankNpcActions(state: SimulationState, actor: PolityId): NpcActionChoice[] {
  const valid: NpcActionChoice[] = [];
  for (const candidate of candidateActions(state, actor)) {
    const validation = validateAction(state, candidate.action);
    if (validation.status === "rejected") continue;
    const executionRatio = validation.feasibleScale / Math.max(1, candidate.action.requestedScale);
    valid.push({
      action: { ...candidate.action, requestedScale: validation.feasibleScale },
      score: candidate.score * (0.5 + executionRatio * 0.5),
      reason: candidate.reason,
    });
  }
  return valid.sort((a, b) => b.score - a.score);
}

export function chooseNpcAction(state: SimulationState, actor: PolityId): ActionRequest | undefined {
  return rankNpcActions(state, actor)[0]?.action;
}

export interface NpcDiplomaticChoice {
  counterpart: PolityId;
  action: DiplomaticAction;
  intensity: number;
  score?: number;
}

export function chooseNpcDiplomaticAction(
  state: SimulationState,
  actor: PolityId,
): NpcDiplomaticChoice | undefined {
  const polity = state.polities[actor];
  if (!polity) return undefined;

  const choices: NpcDiplomaticChoice[] = [];
  for (const [counterpart, relation] of Object.entries(polity.diplomacy ?? {})) {
    if (!state.polities[counterpart]) continue;

    if (relation.tension > 0.45) {
      choices.push({
        counterpart,
        action: "reduce_tension",
        intensity: Math.min(0.2, 0.05 + relation.tension * 0.12),
        score: relation.tension * 1.5 + (1 - relation.trust) * 0.4,
      });
    }
    if (relation.trust > 0.6 && relation.treatyCommitment < 0.65) {
      choices.push({
        counterpart,
        action: "formalize_cooperation",
        intensity: 0.08,
        score: relation.trust * 0.9 + (1 - relation.treatyCommitment) * 0.6,
      });
    }
    if (relation.tradeDependence < 0.55 && relation.tension < 0.5) {
      choices.push({
        counterpart,
        action: "expand_trade",
        intensity: 0.1,
        score: (1 - relation.tradeDependence) * 0.7 + relation.trust * 0.5,
      });
    }
  }

  choices.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return choices[0];
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
    const supplyRisk = 1 - front.supplyFactor;
    const instability = 1 - front.stability;
    const score = regionValue * 0.45 + rolePressure * 0.2 + supplyRisk * 0.2 + instability * 0.15;
    if (score > bestScore) {
      bestScore = score;
      bestId = front.id;
    }
  }
  return bestId;
}
