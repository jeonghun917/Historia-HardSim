import { appendLedgerEntries, makeLedgerEntry } from "../core/ledger";
import type { FrontState, PolityId, RegionId, SimulationState } from "../core/types";

export interface FrontUpdateResult {
  state: SimulationState;
  front?: FrontState;
  error?: string;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function upsertFront(
  state: SimulationState,
  input: {
    id: string;
    attacker: PolityId;
    defender: PolityId;
    regionIds: RegionId[];
  },
): FrontUpdateResult {
  if (!state.polities[input.attacker] || !state.polities[input.defender]) {
    return { state, error: "Front participants must exist." };
  }
  if (input.attacker === input.defender || input.regionIds.length === 0) {
    return { state, error: "Front requires distinct participants and at least one region." };
  }
  const invalidRegion = input.regionIds.find((id) => !state.regions?.[id]);
  if (invalidRegion) return { state, error: `Unknown region: ${invalidRegion}` };

  const existing = state.fronts?.[input.id];
  const attacker = state.polities[input.attacker];
  const defender = state.polities[input.defender];
  const attackerMilitary = attacker.military;
  const defenderMilitary = defender.military;

  const attackerReadiness = attackerMilitary?.readiness ?? 0;
  const defenderReadiness = defenderMilitary?.readiness ?? 0;
  const attackerSupply = attackerMilitary && attackerMilitary.monthlySupplyDemand > 0
    ? Math.min(1, attackerMilitary.supplyStock / attackerMilitary.monthlySupplyDemand)
    : 1;
  const defenderSupply = defenderMilitary && defenderMilitary.monthlySupplyDemand > 0
    ? Math.min(1, defenderMilitary.supplyStock / defenderMilitary.monthlySupplyDemand)
    : 1;
  const logistics = Math.max(1, attacker.capacities.logistics + defender.capacities.logistics);
  const attackerLogisticsShare = attacker.capacities.logistics / logistics;

  const pressure = clamp01(0.5 + (attackerReadiness - defenderReadiness) * 0.25 + (attackerSupply - defenderSupply) * 0.2);
  const supplyFactor = clamp01((attackerSupply + attackerLogisticsShare) / 2);
  const stability = clamp01(1 - Math.abs(pressure - 0.5) * 1.4);

  const front: FrontState = {
    id: input.id,
    attacker: input.attacker,
    defender: input.defender,
    regionIds: [...input.regionIds],
    pressure,
    supplyFactor,
    stability,
  };

  let nextState: SimulationState = {
    ...state,
    fronts: { ...(state.fronts ?? {}), [input.id]: front },
  };
  const entry = makeLedgerEntry(nextState, {
    type: "front_updated",
    actor: input.attacker,
    reason: `Front ${input.id} updated from authoritative readiness and supply state.`,
    data: { before: existing, after: front },
  });
  nextState = appendLedgerEntries(nextState, [entry]);
  return { state: nextState, front };
}
