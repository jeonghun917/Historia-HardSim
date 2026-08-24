import type { PolityState } from "../core/types";

export interface CivilCalibrationDatum {
  year: number;
  population?: number;
  gdpCurrentUsd?: number;
  source?: string;
}

function finitePositive(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function applyCivilCalibration(
  polities: Record<string, PolityState>,
  calibration: Record<string, CivilCalibrationDatum> | undefined,
): Record<string, PolityState> {
  if (!calibration) return polities;

  const gdpMedian = median(
    Object.values(calibration).map((entry) => entry.gdpCurrentUsd).filter(finitePositive),
  );
  const populationMedian = median(
    Object.values(calibration).map((entry) => entry.population).filter(finitePositive),
  );

  const result: Record<string, PolityState> = { ...polities };
  for (const [id, polity] of Object.entries(polities)) {
    const datum = calibration[id];
    if (!datum) continue;

    const gdpFactor = finitePositive(datum.gdpCurrentUsd) && finitePositive(gdpMedian)
      ? Math.max(0.25, Math.min(8, Math.sqrt(datum.gdpCurrentUsd / gdpMedian)))
      : 1;
    const populationFactor = finitePositive(datum.population) && finitePositive(populationMedian)
      ? Math.max(0.25, Math.min(8, Math.sqrt(datum.population / populationMedian)))
      : 1;
    const productiveFactor = Math.sqrt(gdpFactor * populationFactor);

    result[id] = {
      ...polity,
      capacities: {
        ...polity.capacities,
        labor: polity.capacities.labor * populationFactor,
        industry: polity.capacities.industry * productiveFactor,
        energy: polity.capacities.energy * productiveFactor,
        materials: polity.capacities.materials * productiveFactor,
        logistics: polity.capacities.logistics * productiveFactor,
        administration: polity.capacities.administration * gdpFactor,
        research: polity.capacities.research * gdpFactor,
        treasury: polity.capacities.treasury * gdpFactor,
      },
      economy: polity.economy
        ? {
            ...polity.economy,
            gdp: finitePositive(datum.gdpCurrentUsd)
              ? 100 * gdpFactor * gdpFactor
              : polity.economy.gdp,
          }
        : polity.economy,
      demography: polity.demography
        ? {
            ...polity.demography,
            population: finitePositive(datum.population)
              ? datum.population
              : polity.demography.population,
          }
        : polity.demography,
      industryState: polity.industryState
        ? {
            ...polity.industryState,
            capitalStock: polity.industryState.capitalStock * productiveFactor,
          }
        : polity.industryState,
      logisticsState: polity.logisticsState
        ? {
            ...polity.logisticsState,
            networkCapacity: polity.logisticsState.networkCapacity * productiveFactor,
          }
        : polity.logisticsState,
    };
  }

  return result;
}
