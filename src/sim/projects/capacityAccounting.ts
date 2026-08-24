import type { CapacityPool, PolityId, SimulationState } from "../core/types";

const CAPACITY_KEYS: (keyof CapacityPool)[] = [
  "treasury",
  "labor",
  "industry",
  "energy",
  "materials",
  "logistics",
  "administration",
  "research",
  "politicalCapital",
];

export function emptyCapacityPool(): CapacityPool {
  return {
    treasury: 0,
    labor: 0,
    industry: 0,
    energy: 0,
    materials: 0,
    logistics: 0,
    administration: 0,
    research: 0,
    politicalCapital: 0,
  };
}

export function scaleCapacityPool(
  source: Partial<CapacityPool> | undefined,
  scale: number,
): Partial<CapacityPool> {
  const result: Partial<CapacityPool> = {};
  if (!source) return result;

  for (const key of CAPACITY_KEYS) {
    const value = source[key];
    if (value !== undefined && value !== 0) result[key] = value * scale;
  }

  return result;
}

export function getReservedCapacities(
  state: SimulationState,
  actor: PolityId,
): CapacityPool {
  const reserved = emptyCapacityPool();

  for (const project of Object.values(state.projects)) {
    if (project.owner !== actor || project.status !== "active") continue;
    for (const key of CAPACITY_KEYS) {
      reserved[key] += project.reservedCapacities[key] ?? 0;
    }
  }

  return reserved;
}

export function getAvailableCapacities(
  state: SimulationState,
  actor: PolityId,
): CapacityPool | undefined {
  const polity = state.polities[actor];
  if (!polity) return undefined;

  const reserved = getReservedCapacities(state, actor);
  const available = emptyCapacityPool();

  for (const key of CAPACITY_KEYS) {
    available[key] = Math.max(0, polity.capacities[key] - reserved[key]);
  }

  return available;
}

export function subtractCapacityPool(
  target: CapacityPool,
  cost: Partial<CapacityPool>,
): CapacityPool {
  const result = { ...target };
  for (const key of CAPACITY_KEYS) {
    const amount = cost[key] ?? 0;
    result[key] -= amount;
  }
  return result;
}
