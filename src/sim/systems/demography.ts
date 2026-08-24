import { makeLedgerEntry } from "../core/ledger";
import type { LedgerEntry, PolityId, SimulationState } from "../core/types";

export interface DemographyTickResult {
  state: SimulationState;
  ledgerEntries: LedgerEntry[];
  polityCapacityDelta: Record<PolityId, { labor?: number }>;
}

function monthlyRateFromAnnual(annualRate: number): number {
  if (annualRate <= -1) return -1;
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

export function tickDemography(state: SimulationState): DemographyTickResult {
  let nextState = state;
  const ledgerEntries: LedgerEntry[] = [];
  const polityCapacityDelta: Record<PolityId, { labor?: number }> = {};

  for (const [polityId, polity] of Object.entries(state.polities)) {
    if (!polity.demography) continue;

    const monthlyGrowth = monthlyRateFromAnnual(polity.demography.annualPopulationGrowthRate);
    const population = Math.max(0, polity.demography.population * (1 + monthlyGrowth));
    const labor = population * polity.demography.workingAgeShare * polity.demography.laborParticipationRate;
    const laborDelta = labor - polity.capacities.labor;

    const nextPolity = {
      ...polity,
      capacities: { ...polity.capacities, labor },
      demography: { ...polity.demography, population },
    };
    nextState = {
      ...nextState,
      polities: { ...nextState.polities, [polityId]: nextPolity },
    };
    polityCapacityDelta[polityId] = { labor: laborDelta };

    ledgerEntries.push(makeLedgerEntry(
      { ...nextState, ledger: [...(nextState.ledger ?? []), ...ledgerEntries] },
      {
        type: "demography_tick",
        actor: polityId,
        reason: "Monthly population and labor supply updated.",
        data: { population, labor, monthlyGrowth },
      },
    ));
  }

  return { state: nextState, ledgerEntries, polityCapacityDelta };
}
