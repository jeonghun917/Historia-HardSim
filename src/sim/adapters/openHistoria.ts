import type { CapacityPool, SimulationState, WorldDiff } from "../core/types";

export interface OpenHistoriaPresentationPatch {
  date?: string;
  notifications: string[];
  polityStats: Record<string, Record<string, number>>;
  projectEvents: Array<{ id: string; status: string; progress: number }>;
}

function numericCapacitySnapshot(capacities: CapacityPool): Record<string, number> {
  return { ...capacities };
}

/**
 * Converts authoritative HardSim output into presentation data only.
 * This adapter intentionally has no reverse mutation path.
 */
export function toOpenHistoriaPresentationPatch(
  state: SimulationState,
  diff: WorldDiff,
): OpenHistoriaPresentationPatch {
  const affectedActors = new Set(Object.keys(diff.polityCapacityDelta ?? {}));
  for (const entry of diff.ledgerEntries ?? []) affectedActors.add(entry.actor);

  const polityStats: Record<string, Record<string, number>> = {};
  for (const actor of affectedActors) {
    const polity = state.polities[actor];
    if (!polity) continue;
    polityStats[actor] = numericCapacitySnapshot(polity.capacities);
    if (polity.economy) {
      polityStats[actor].gdp = polity.economy.gdp;
      polityStats[actor].debt = polity.economy.debt;
    }
    if (polity.military) {
      polityStats[actor].activePersonnel = polity.military.activePersonnel;
      polityStats[actor].mobilizedPersonnel = polity.military.mobilizedPersonnel;
      polityStats[actor].equipmentPoints = polity.military.equipmentPoints;
      polityStats[actor].readiness = polity.military.readiness;
      polityStats[actor].supplyStock = polity.military.supplyStock;
    }
  }

  return {
    date: state.date,
    notifications: [...(diff.events ?? [])],
    polityStats,
    projectEvents: (diff.projectUpserts ?? []).map((project) => ({
      id: project.id,
      status: project.status,
      progress: project.progress,
    })),
  };
}
