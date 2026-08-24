import { describe, expect, it } from "vitest";
import { tickMonth } from "../src/sim/core/tick";
import type { SimulationState } from "../src/sim/core/types";
import { tickEconomy } from "../src/sim/systems/economy";

function baseState(): SimulationState {
  return {
    date: "2026-01-01",
    rngSeed: 42,
    rulesetVersion: "0.0.1",
    polities: {
      KOR: {
        id: "KOR",
        capacities: {
          treasury: 100,
          labor: 100,
          industry: 100,
          energy: 100,
          materials: 100,
          logistics: 100,
          administration: 100,
          research: 100,
          politicalCapital: 100,
        },
        technologies: [],
        controlledRegions: [],
        economy: {
          gdp: 1200,
          taxRate: 0.2,
          governmentSpendingAnnual: 120,
          debt: 0,
          annualInterestRate: 0.05,
          baseAnnualGrowthRate: 0,
        },
        industryState: { capitalStock: 100, utilization: 0 },
        logisticsState: { networkCapacity: 100, utilization: 0 },
      },
    },
    projects: {},
    ledger: [],
  };
}

describe("monthly economy", () => {
  it("turns fiscal surplus into treasury stock deterministically", () => {
    const result = tickEconomy(baseState());
    expect(result.state.polities.KOR.capacities.treasury).toBeCloseTo(110);
    expect(result.state.polities.KOR.economy?.debt).toBe(0);
    expect(result.ledgerEntries).toHaveLength(1);
  });

  it("uses active project reservations as economic bottlenecks", () => {
    const state = baseState();
    state.polities.KOR.economy!.baseAnnualGrowthRate = 0.12;
    state.projects.busy = {
      id: "busy",
      owner: "KOR",
      kind: "generic_project",
      scale: 1,
      startedAt: state.date,
      durationMonths: 12,
      elapsedMonths: 0,
      progress: 0,
      reservedCapacities: { industry: 50 },
      consumedUpfront: {},
      status: "active",
    };

    const constrained = tickEconomy(state);
    const unconstrainedState = baseState();
    unconstrainedState.polities.KOR.economy!.baseAnnualGrowthRate = 0.12;
    const unconstrained = tickEconomy(unconstrainedState);

    expect(constrained.state.polities.KOR.economy!.gdp)
      .toBeLessThan(unconstrained.state.polities.KOR.economy!.gdp);
  });
});

describe("rules-driven completion effects", () => {
  it("industrial expansion increases actual industrial capacity only on completion", () => {
    const state = baseState();
    state.projects.factory = {
      id: "factory",
      owner: "KOR",
      kind: "industrial_expansion",
      scale: 5,
      startedAt: state.date,
      durationMonths: 1,
      elapsedMonths: 0,
      progress: 0,
      reservedCapacities: { industry: 10 },
      consumedUpfront: {},
      status: "active",
    };

    const result = tickMonth(state);
    expect(result.state.projects.factory.status).toBe("completed");
    expect(result.state.polities.KOR.capacities.industry).toBe(105);
    expect(result.state.polities.KOR.industryState?.capitalStock).toBe(105);
    expect(result.state.ledger?.some((entry) => entry.type === "system_effect")).toBe(true);
    expect(new Set(result.state.ledger?.map((entry) => entry.id)).size)
      .toBe(result.state.ledger?.length);
  });

  it("infrastructure expansion increases logistics capacity", () => {
    const state = baseState();
    state.projects.rail = {
      id: "rail",
      owner: "KOR",
      kind: "infrastructure_expansion",
      scale: 7,
      startedAt: state.date,
      durationMonths: 1,
      elapsedMonths: 0,
      progress: 0,
      reservedCapacities: { logistics: 10 },
      consumedUpfront: {},
      status: "active",
    };

    const result = tickMonth(state);
    expect(result.state.polities.KOR.capacities.logistics).toBe(107);
    expect(result.state.polities.KOR.logisticsState?.networkCapacity).toBe(107);
  });
});
