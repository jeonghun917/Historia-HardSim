import { makeLedgerEntry } from "../core/ledger";
import type { LedgerEntry, PolityId, SimulationState } from "../core/types";

export interface MilitaryTickResult {
  state: SimulationState;
  ledgerEntries: LedgerEntry[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function mobilizePersonnel(
  state: SimulationState,
  actor: PolityId,
  requested: number,
): { state: SimulationState; accepted: number; ledgerEntry?: LedgerEntry } {
  const polity = state.polities[actor];
  if (!polity?.military || requested <= 0) return { state, accepted: 0 };

  const military = polity.military;
  const laborFloor = Math.max(0, polity.capacities.labor * 0.7);
  const laborAvailableForMobilization = Math.max(0, polity.capacities.labor - laborFloor);
  const reserveAvailable = Math.max(0, military.reservePersonnel - military.mobilizedPersonnel);
  const mobilizationHeadroom = Math.max(0, military.mobilizationLimit - military.mobilizedPersonnel);
  const accepted = Math.max(0, Math.min(requested, reserveAvailable, mobilizationHeadroom, laborAvailableForMobilization));
  if (accepted <= 0) return { state, accepted: 0 };

  const nextPolity = {
    ...polity,
    capacities: { ...polity.capacities, labor: polity.capacities.labor - accepted },
    military: {
      ...military,
      mobilizedPersonnel: military.mobilizedPersonnel + accepted,
      monthlySupplyDemand: military.monthlySupplyDemand + accepted * 0.001,
    },
  };
  const nextState: SimulationState = {
    ...state,
    polities: { ...state.polities, [actor]: nextPolity },
  };
  const ledgerEntry = makeLedgerEntry(nextState, {
    type: "mobilization_changed",
    actor,
    reason: `Mobilized ${accepted} personnel within reserve, mobilization and labor limits.`,
    data: { requested, accepted },
  });
  return { state: nextState, accepted, ledgerEntry };
}

export function tickMilitary(state: SimulationState): MilitaryTickResult {
  let nextState = state;
  const ledgerEntries: LedgerEntry[] = [];

  for (const [polityId, polity] of Object.entries(state.polities)) {
    if (!polity.military) continue;
    const military = polity.military;
    const logisticsFactor = clamp(polity.capacities.logistics / Math.max(1, military.monthlySupplyDemand), 0, 1);
    const availableSupply = Math.min(military.supplyStock, military.monthlySupplyDemand * logisticsFactor);
    const supplyFactor = military.monthlySupplyDemand <= 0
      ? 1
      : clamp(availableSupply / military.monthlySupplyDemand, 0, 1);
    const nextSupplyStock = Math.max(0, military.supplyStock - availableSupply);
    const targetReadiness = clamp(supplyFactor * 0.65 + military.training * 0.35, 0, 1);
    const nextReadiness = clamp(military.readiness + (targetReadiness - military.readiness) * 0.25, 0, 1);

    const nextPolity = {
      ...polity,
      military: {
        ...military,
        supplyStock: nextSupplyStock,
        readiness: nextReadiness,
      },
    };
    nextState = { ...nextState, polities: { ...nextState.polities, [polityId]: nextPolity } };

    ledgerEntries.push(makeLedgerEntry(
      { ...nextState, ledger: [...(nextState.ledger ?? []), ...ledgerEntries] },
      {
        type: "military_tick",
        actor: polityId,
        reason: `Military readiness updated to ${nextReadiness.toFixed(3)} from supply and training constraints.`,
        data: { logisticsFactor, supplyFactor, availableSupply, supplyStockAfter: nextSupplyStock },
      },
    ));
  }

  return { state: nextState, ledgerEntries };
}
