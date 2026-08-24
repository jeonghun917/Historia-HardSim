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

    const energySurplus = polity.resources.energyProductionMonthly - polity.resources.energyDemandMonthly;
    const materialFlow = polity.resources.materialProductionMonthly - polity.resources.materialDemandMonthly;
    const nextMaterialStock = Math.max(0, polity.resources.materialStock + materialFlow);
    const nextEnergyCapacity = Math.max(0, polity.capacities.energy + energySurplus);
    const nextMaterialCapacity = Math.max(0, nextMaterialStock);

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

    const energyDelta = nextEnergyCapacity - polity.capacities.energy;
    const materialsDelta = nextMaterialCapacity - polity.capacities.materials;
    polityCapacityDelta[polityId] = { energy: energyDelta, materials: materialsDelta };

    ledgerEntries.push(makeLedgerEntry(
      { ...nextState, ledger: [...(nextState.ledger ?? []), ...ledgerEntries] },
      {
        type: "resource_tick",
        actor: polityId,
        reason: "Monthly energy and materials balance applied.",
        data: { energySurplus, materialFlow, nextMaterialStock },
      },
    ));
  }

  return { state: nextState, ledgerEntries, polityCapacityDelta };
}
