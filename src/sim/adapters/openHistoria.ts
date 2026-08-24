import {
  applyCivilCalibration,
  type CivilCalibrationDatum,
} from "../calibration/civilData";
import {
  calibratedPolity,
  inferEraProfile,
  scalePolityForRegions,
  type EraProfileId,
} from "../calibration/profiles";
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
    profile?: EraProfileId;
    rngSeed?: number;
    civilCalibration?: Record<string, CivilCalibrationDatum>;
    polities?: Record<string, Partial<PolityState>>;
  };
}

function numericCapacitySnapshot(capacities: CapacityPool): Record<string, number> {
  return { ...capacities };
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
    diplomacy: seed.diplomacy ? { ...(base.diplomacy ?? {}), ...seed.diplomacy } : base.diplomacy,
  };
}

export function bootstrapFromOpenHistoriaWorld(
  world: OpenHistoriaWorldLike,
  date: string,
  rulesetVersion = "0.0.1",
): SimulationState {
  const ownerCodes = new Set(world.ownerCodes ?? []);
  for (const owner of Object.values(world.regionOwnershipOverrides ?? {})) ownerCodes.add(owner);

  const regionCounts: Record<string, number> = {};
  for (const owner of Object.values(world.regionOwnershipOverrides ?? {})) {
    regionCounts[owner] = (regionCounts[owner] ?? 0) + 1;
  }

  const profileId = world.hardSimSeed?.profile ?? inferEraProfile(date);
  let polities: SimulationState["polities"] = {};
  for (const owner of ownerCodes) {
    polities[owner] = scalePolityForRegions(
      calibratedPolity(owner, profileId),
      regionCounts[owner] ?? 1,
    );
  }

  polities = applyCivilCalibration(polities, world.hardSimSeed?.civilCalibration);
  for (const owner of ownerCodes) {
    polities[owner] = mergeSeed(polities[owner], world.hardSimSeed?.polities?.[owner]);
  }

  const regions: Record<string, RegionState> = {};
  for (const [regionId, controller] of Object.entries(world.regionOwnershipOverrides ?? {})) {
    regions[regionId] = { id: regionId, controller };
    const polity = polities[controller];
    if (!polity) continue;
    if (!polity.controlledRegions.includes(regionId)) polity.controlledRegions.push(regionId);
  }

  return {
    date,
    rngSeed: world.hardSimSeed?.rngSeed ?? 1,
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
