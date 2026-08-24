import { makeLedgerEntry } from "../core/ledger";
import type { LedgerEntry, PolityId, SimulationState } from "../core/types";

export interface ResourceTickResult {
  state: SimulationState;
  ledgerEntries: LedgerEntry[];
  polityCapacityDelta: Record<PolityId, { energy?: number; materials?: number }>;
}

export function tickResources(state: SimulationState): ResourceTickResult {
  let nextState = state;
  const ledgerEntries: LedgerEntry[] = [];
  const polityCapacityDelta: Record<PolityId, { energy?: number; materials?: number }> = {};

  for (const [polityId, polity] of Object.entries(state.polities)) {
    if (!polity.resources) continue;

    const energyAvailable = Math.max(0, polity.resources.energyProductionMonthly);
    const energyShortfall = Math.max(0, polity.resources.energyDemandMonthly - energyAvailable);
    const materialFlow = polity.resources.materialProductionMonthly - polity.resources.materialDemandMonthly;
    const nextMaterialStock = Math.max(0, polity.resources.materialStock + materialFlow);
    const nextEnergyCapacity = energyAvailable;
    const nextMaterialCapacity = nextMaterialStock;

    const nextPolity = {
      ...polity,
      capacities: {
        ...polity.capacities,
        energy: nextEnergyCapacity,
        materials: nextMaterialCapacity,
      },
      resources: { ...polity.resources, materialStock: nextMaterialStock },
    };

    nextState = {
      ...nextState,
      polities: { ...nextState.polities, [polityId]: nextPolity },
    };

    polityCapacityDelta[polityId] = {
      energy: nextEnergyCapacity - polity.capacities.energy,
      materials: nextMaterialCapacity - polity.capacities.materials,
    };

    ledgerEntries.push(makeLedgerEntry(
      { ...nextState, ledger: [...(nextState.ledger ?? []), ...ledgerEntries] },
      {
        type: "resource_tick",
        actor: polityId,
        reason: "Monthly energy flow and materials stock balance applied.",
        data: { energyAvailable, energyShortfall, materialFlow, nextMaterialStock },
      },
    ));
  }

  return { state: nextState, ledgerEntries, polityCapacityDelta };
}
