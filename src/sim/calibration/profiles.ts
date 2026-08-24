import type { PolityState } from "../core/types";

export type EraProfileId = "preindustrial" | "industrial" | "interwar" | "modern";

export interface CalibrationProfile {
  id: EraProfileId;
  polity: Omit<PolityState, "id" | "controlledRegions">;
}

const profile = (
  id: EraProfileId,
  polity: Omit<PolityState, "id" | "controlledRegions">,
): CalibrationProfile => ({ id, polity });

export const CALIBRATION_PROFILES: Record<EraProfileId, CalibrationProfile> = {
  preindustrial: profile("preindustrial", {
    capacities: {
      treasury: 40,
      labor: 70,
      industry: 12,
      energy: 8,
      materials: 35,
      logistics: 12,
      administration: 20,
      research: 5,
      politicalCapital: 40,
    },
    technologies: [],
    economy: {
      gdp: 35,
      taxRate: 0.12,
      governmentSpendingAnnual: 5,
      debt: 4,
      annualInterestRate: 0.06,
      baseAnnualGrowthRate: 0.004,
    },
    industryState: { capitalStock: 12, utilization: 0.55 },
    logisticsState: { networkCapacity: 12, utilization: 0.55 },
    resources: {
      energyProductionMonthly: 8,
      energyDemandMonthly: 7,
      materialProductionMonthly: 5,
      materialDemandMonthly: 4.5,
      materialStock: 35,
    },
    demography: {
      population: 1_000_000,
      workingAgeShare: 0.56,
      laborParticipationRate: 0.58,
      annualPopulationGrowthRate: 0.004,
    },
    researchState: { knowledge: 0, monthlyKnowledgeGain: 0.2 },
    military: {
      activePersonnel: 6,
      reservePersonnel: 10,
      mobilizedPersonnel: 0,
      equipmentPoints: 4,
      readiness: 0.35,
      training: 0.35,
      supplyStock: 10,
      monthlySupplyDemand: 2,
      mobilizationLimit: 10,
    },
  }),
  industrial: profile("industrial", {
    capacities: {
      treasury: 70,
      labor: 85,
      industry: 30,
      energy: 28,
      materials: 65,
      logistics: 30,
      administration: 35,
      research: 12,
      politicalCapital: 45,
    },
    technologies: [],
    economy: {
      gdp: 65,
      taxRate: 0.16,
      governmentSpendingAnnual: 11,
      debt: 10,
      annualInterestRate: 0.05,
      baseAnnualGrowthRate: 0.012,
    },
    industryState: { capitalStock: 30, utilization: 0.65 },
    logisticsState: { networkCapacity: 30, utilization: 0.65 },
    resources: {
      energyProductionMonthly: 28,
      energyDemandMonthly: 25,
      materialProductionMonthly: 7,
      materialDemandMonthly: 6.5,
      materialStock: 65,
    },
    demography: {
      population: 1_000_000,
      workingAgeShare: 0.6,
      laborParticipationRate: 0.62,
      annualPopulationGrowthRate: 0.006,
    },
    researchState: { knowledge: 0, monthlyKnowledgeGain: 0.5 },
    military: {
      activePersonnel: 8,
      reservePersonnel: 16,
      mobilizedPersonnel: 0,
      equipmentPoints: 7,
      readiness: 0.42,
      training: 0.42,
      supplyStock: 18,
      monthlySupplyDemand: 3,
      mobilizationLimit: 16,
    },
  }),
  interwar: profile("interwar", {
    capacities: {
      treasury: 90,
      labor: 95,
      industry: 45,
      energy: 42,
      materials: 85,
      logistics: 45,
      administration: 45,
      research: 20,
      politicalCapital: 50,
    },
    technologies: [],
    economy: {
      gdp: 85,
      taxRate: 0.19,
      governmentSpendingAnnual: 17,
      debt: 16,
      annualInterestRate: 0.045,
      baseAnnualGrowthRate: 0.016,
    },
    industryState: { capitalStock: 45, utilization: 0.7 },
    logisticsState: { networkCapacity: 45, utilization: 0.68 },
    resources: {
      energyProductionMonthly: 42,
      energyDemandMonthly: 38,
      materialProductionMonthly: 9,
      materialDemandMonthly: 8,
      materialStock: 85,
    },
    demography: {
      population: 1_000_000,
      workingAgeShare: 0.63,
      laborParticipationRate: 0.64,
      annualPopulationGrowthRate: 0.007,
    },
    researchState: { knowledge: 0, monthlyKnowledgeGain: 0.8 },
    military: {
      activePersonnel: 10,
      reservePersonnel: 20,
      mobilizedPersonnel: 0,
      equipmentPoints: 10,
      readiness: 0.48,
      training: 0.48,
      supplyStock: 25,
      monthlySupplyDemand: 4,
      mobilizationLimit: 20,
    },
  }),
  modern: profile("modern", {
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
      annualPopulationGrowthRate: 0.006,
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
  }),
};

export function inferEraProfile(date: string): EraProfileId {
  const year = Number(/^(-?\d{1,4})/.exec(date)?.[1]);
  if (!Number.isFinite(year)) return "modern";
  if (year < 1750) return "preindustrial";
  if (year < 1918) return "industrial";
  if (year < 1946) return "interwar";
  return "modern";
}

export function calibratedPolity(id: string, profileId: EraProfileId): PolityState {
  const source = CALIBRATION_PROFILES[profileId].polity;
  return {
    ...structuredClone(source),
    id,
    controlledRegions: [],
  };
}

export function scalePolityForRegions(polity: PolityState, regionCount: number): PolityState {
  const scale = Math.max(0.5, Math.sqrt(Math.max(1, regionCount)));
  const scaleLinear = (value: number) => value * scale;
  return {
    ...polity,
    capacities: {
      ...polity.capacities,
      treasury: scaleLinear(polity.capacities.treasury),
      labor: scaleLinear(polity.capacities.labor),
      industry: scaleLinear(polity.capacities.industry),
      energy: scaleLinear(polity.capacities.energy),
      materials: scaleLinear(polity.capacities.materials),
      logistics: scaleLinear(polity.capacities.logistics),
      administration: scaleLinear(polity.capacities.administration),
      research: scaleLinear(polity.capacities.research),
    },
    economy: polity.economy ? { ...polity.economy, gdp: scaleLinear(polity.economy.gdp) } : undefined,
    demography: polity.demography
      ? { ...polity.demography, population: scaleLinear(polity.demography.population) }
      : undefined,
    industryState: polity.industryState
      ? { ...polity.industryState, capitalStock: scaleLinear(polity.industryState.capitalStock) }
      : undefined,
    logisticsState: polity.logisticsState
      ? { ...polity.logisticsState, networkCapacity: scaleLinear(polity.logisticsState.networkCapacity) }
      : undefined,
  };
}
