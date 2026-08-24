import { makeLedgerEntry } from "../core/ledger";
import type { LedgerEntry, SimulationState } from "../core/types";
import { getAvailableCapacities } from "../projects/capacityAccounting";

export interface EconomyTickResult {
  state: SimulationState;
  ledgerEntries: LedgerEntry[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function monthlyRateFromAnnual(annualRate: number): number {
  if (annualRate <= -1) return -1;
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

export function tickEconomy(state: SimulationState): EconomyTickResult {
  let nextState = state;
  const ledgerEntries: LedgerEntry[] = [];

  for (const [polityId, polity] of Object.entries(state.polities)) {
    if (!polity.economy) continue;

    const available = getAvailableCapacities(nextState, polityId);
    if (!available) continue;

    const industryFactor = polity.industryState
      ? clamp(available.industry / Math.max(1, polity.industryState.capitalStock), 0, 1)
      : 1;
    const logisticsFactor = polity.logisticsState
      ? clamp(available.logistics / Math.max(1, polity.logisticsState.networkCapacity), 0, 1)
      : 1;
    const bottleneckFactor = Math.min(industryFactor, logisticsFactor);

    const effectiveAnnualGrowthRate = polity.economy.baseAnnualGrowthRate * bottleneckFactor;
    const monthlyGrowthRate = monthlyRateFromAnnual(effectiveAnnualGrowthRate);
    const nextGdp = Math.max(0, polity.economy.gdp * (1 + monthlyGrowthRate));

    const taxRevenue = polity.economy.gdp * polity.economy.taxRate / 12;
    const programSpending = polity.economy.governmentSpendingAnnual / 12;
    const interestCost = polity.economy.debt * polity.economy.annualInterestRate / 12;
    const fiscalBalance = taxRevenue - programSpending - interestCost;

    let nextTreasury = polity.capacities.treasury + fiscalBalance;
    let nextDebt = polity.economy.debt;
    let debtIssued = 0;
    if (nextTreasury < 0) {
      debtIssued = -nextTreasury;
      nextDebt += debtIssued;
      nextTreasury = 0;
    }

    const nextPolity = {
      ...polity,
      capacities: { ...polity.capacities, treasury: nextTreasury },
      economy: {
        ...polity.economy,
        gdp: nextGdp,
        debt: nextDebt,
      },
    };

    nextState = {
      ...nextState,
      polities: { ...nextState.polities, [polityId]: nextPolity },
    };

    ledgerEntries.push(makeLedgerEntry(
      { ...nextState, ledger: [...(nextState.ledger ?? []), ...ledgerEntries] },
      {
        type: "economy_tick",
        actor: polityId,
        reason: `Monthly economy updated with bottleneck factor ${bottleneckFactor.toFixed(3)}.`,
        data: {
          gdpBefore: polity.economy.gdp,
          gdpAfter: nextGdp,
          effectiveAnnualGrowthRate,
          taxRevenue,
          programSpending,
          interestCost,
          fiscalBalance,
          debtIssued,
          treasuryAfter: nextTreasury,
          debtAfter: nextDebt,
          industryFactor,
          logisticsFactor,
        },
      },
    ));
  }

  return { state: nextState, ledgerEntries };
}
