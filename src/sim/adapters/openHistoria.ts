import type {
  CapacityPool,
  PolityState,
  RegionState,
  SimulationState,
  WorldDiff,
} from "../core/types";

export interface OpenHistoriaPresentationPatch {
  date?: string;
  notifications: string[];
  polityStats: Record<string, Record<string, number>>;
  projectEvents: Array<{ id: string; status: string; progress: number }>;
  regionControllers: Record<string, string>;
}

export interface OpenHistoriaWorldLike {
  ownerCodes?: string[];
  regionOwnershipOverrides?: Record<string, string>;
  hardSimSeed?: {
    polities?: Record<string, Partial<PolityState>>;
  };
}

function numericCapacitySnapshot(capacities: CapacityPool): Record<string, number> {
  return { ...capacities };
}

function defaultPolity(id: string): PolityState {
  return {
    id,
    capacities: {
      treasury: 100,
      labor: 100,
      industry: 50,
      energy: 50,
      materials: 100,
      logistics: 50,
      administration: 50,
      research: 25,
      politicalCapital: 50,
    },
    technologies: [],
    controlledRegions: [],
    economy: {
      gdp: 100,
      taxRate: 0.2,
      governmentSpendingAnnual: 20,
      debt: 20,
      annualInterestRate: 0.04,
      baseAnnualGrowthRate: 0.02,
    },
    industryState: { capitalStock: 50, utilization: 0.7 },
    logisticsState: { networkCapacity: 50, utilization: 0.6 },
    resources: {
      energyProductionMonthly: 50,
      energyDemandMonthly: 45,
      materialProductionMonthly: 10,
      materialDemandMonthly: 8,
      materialStock: 100,
    },
    demography: {
      population: 1_000_000,
      workingAgeShare: 0.65,
      laborParticipationRate: 0.65,
      annualPopulationGrowthRate: 0,
    },
    researchState: { knowledge: 0, monthlyKnowledgeGain: 1 },
    military: {
      activePersonnel: 10,
      reservePersonnel: 20,
      mobilizedPersonnel: 0,
      equipmentPoints: 10,
      readiness: 0.5,
      training: 0.5,
      supplyStock: 30,
      monthlySupplyDemand: 5,
      mobilizationLimit: 20,
    },
  };
}

function mergeSeed(base: PolityState, seed?: Partial<PolityState>): PolityState {
  if (!seed) return base;
  return {
    ...base,
    ...seed,
    id: base.id,
    capacities: { ...base.capacities, ...(seed.capacities ?? {}) },
    technologies: seed.technologies ? [...seed.technologies] : base.technologies,
    controlledRegions: base.controlledRegions,
    economy: seed.economy ? { ...base.economy!, ...seed.economy } : base.economy,
    industryState: seed.industryState ? { ...base.industryState!, ...seed.industryState } : base.industryState,
    logisticsState: seed.logisticsState ? { ...base.logisticsState!, ...seed.logisticsState } : base.logisticsState,
    resources: seed.resources ? { ...base.resources!, ...seed.resources } : base.resources,
    demography: seed.demography ? { ...base.demography!, ...seed.demography } : base.demography,
    researchState: seed.researchState ? { ...base.researchState!, ...seed.researchState } : base.researchState,
    military: seed.military ? { ...base.military!, ...seed.military } : base.military,
  };
}

export function bootstrapFromOpenHistoriaWorld(
  world: OpenHistoriaWorldLike,
  date: string,
  rulesetVersion = "0.0.1",
): SimulationState {
  const ownerCodes = new Set(world.ownerCodes ?? []);
  for (const owner of Object.values(world.regionOwnershipOverrides ?? {})) ownerCodes.add(owner);

  const polities: SimulationState["polities"] = {};
  for (const owner of ownerCodes) {
    polities[owner] = mergeSeed(defaultPolity(owner), world.hardSimSeed?.polities?.[owner]);
  }

  const regions: Record<string, RegionState> = {};
  for (const [regionId, controller] of Object.entries(world.regionOwnershipOverrides ?? {})) {
    regions[regionId] = { id: regionId, controller };
    const polity = polities[controller] ?? mergeSeed(defaultPolity(controller), world.hardSimSeed?.polities?.[controller]);
    if (!polity.controlledRegions.includes(regionId)) polity.controlledRegions.push(regionId);
    polities[controller] = polity;
  }

  return {
    date,
    rngSeed: 1,
    rulesetVersion,
    polities,
    projects: {},
    regions,
    fronts: {},
    ledger: [],
  };
}

/** Converts authoritative HardSim output into presentation data only. */
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

  const regionControllers: Record<string, string> = {};
  for (const [regionId, region] of Object.entries(state.regions ?? {})) {
    regionControllers[regionId] = region.controller;
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
    regionControllers,
  };
}
