import { describe, expect, it } from "vitest";
import { applyFiscalPolicy } from "../src/sim/actions/fiscalPolicy";
import { advanceMonths, tickMonth } from "../src/sim/core/tick";
import type { SimulationState } from "../src/sim/core/types";
import { planProject } from "../src/sim/projects/planner";

function makeState(): SimulationState {
  return {
    date: "2026-01-01",
    rngSeed: 42,
    rulesetVersion: "0.0.1",
    polities: {
      KOR: {
        id: "KOR",
        capacities: {
          treasury: 100,
          labor: 50,
          industry: 100,
          energy: 80,
          materials: 30,
          logistics: 100,
          administration: 50,
          research: 20,
          politicalCapital: 20,
        },
        technologies: ["modern_industry"],
        controlledRegions: ["KR"],
        economy: {
          gdp: 1200,
          taxRate: 0.2,
          governmentSpendingAnnual: 240,
          debt: 100,
          annualInterestRate: 0.03,
          baseAnnualGrowthRate: 0.04,
        },
        industryState: { capitalStock: 100, utilization: 0 },
        logisticsState: { networkCapacity: 100, utilization: 0 },
        resources: {
          energyProductionMonthly: 80,
          energyDemandMonthly: 100,
          materialProductionMonthly: 10,
          materialDemandMonthly: 15,
          materialStock: 30,
        },
        demography: {
          population: 1000,
          workingAgeShare: 0.6,
          laborParticipationRate: 0.75,
          annualPopulationGrowthRate: 0.012,
        },
        researchState: { knowledge: 10, monthlyKnowledgeGain: 2 },
      },
    },
    projects: {},
  };
}

describe("civil systems", () => {
  it("applies fiscal policy immediately and records it", () => {
    const result = applyFiscalPolicy(makeState(), {
      actor: "KOR",
      taxRate: 0.25,
      governmentSpendingAnnual: 300,
    });
    expect(result.error).toBeUndefined();
    expect(result.state.polities.KOR.economy?.taxRate).toBe(0.25);
    expect(result.state.ledger?.at(-1)?.type).toBe("policy_changed");
  });

  it("updates energy flow, material stock, population, labor and research each month", () => {
    const result = tickMonth(makeState());
    const polity = result.state.polities.KOR;
    expect(polity.capacities.energy).toBe(80);
    expect(polity.resources?.materialStock).toBe(25);
    expect(polity.capacities.materials).toBe(25);
    expect(polity.demography?.population).toBeGreaterThan(1000);
    expect(polity.capacities.labor).toBeGreaterThan(450);
    expect(polity.researchState?.knowledge).toBe(12);
  });

  it("unlocks a technology only after a research project completes", () => {
    const planned = planProject(makeState(), {
      actor: "KOR",
      kind: "research_program",
      requestedScale: 1,
      durationMonths: 2,
      target: "advanced_reactors",
      requiredTechnologies: ["modern_industry"],
      capacityCost: { research: 5 },
    });
    expect(planned.project).toBeDefined();
    expect(planned.state.polities.KOR.technologies).not.toContain("advanced_reactors");

    const afterOne = advanceMonths(planned.state, 1).state;
    expect(afterOne.polities.KOR.technologies).not.toContain("advanced_reactors");

    const afterTwo = advanceMonths(afterOne, 1).state;
    expect(afterTwo.polities.KOR.technologies).toContain("advanced_reactors");
  });

  it("adds energy production only when an energy project completes", () => {
    const planned = planProject(makeState(), {
      actor: "KOR",
      kind: "energy_expansion",
      requestedScale: 10,
      durationMonths: 1,
      capacityCost: { industry: 1 },
    });
    const completed = advanceMonths(planned.state, 1).state;
    expect(completed.polities.KOR.resources?.energyProductionMonthly).toBe(90);
    expect(completed.polities.KOR.capacities.energy).toBe(90);
  });
});
