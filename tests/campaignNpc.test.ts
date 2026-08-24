import { describe, expect, it } from "vitest";
import type { SimulationState } from "../src/sim/core/types";
import { resolveCampaignBattle } from "../src/sim/systems/campaign";
import { chooseNpcAction } from "../src/sim/ai/npcPlanner";

function makeState(): SimulationState {
  return {
    date: "2026-01-01",
    rngSeed: 2,
    rulesetVersion: "0.0.1",
    projects: {},
    regions: {
      R1: { id: "R1", controller: "B", strategicValue: 1 },
    },
    polities: {
      A: {
        id: "A",
        capacities: {
          treasury: 1000, labor: 1000, industry: 100, energy: 100, materials: 100,
          logistics: 100, administration: 100, research: 50, politicalCapital: 50,
        },
        technologies: [],
        controlledRegions: [],
        military: {
          activePersonnel: 200, reservePersonnel: 100, mobilizedPersonnel: 0,
          equipmentPoints: 200, readiness: 0.9, training: 0.9,
          supplyStock: 100, monthlySupplyDemand: 10, mobilizationLimit: 50,
        },
      },
      B: {
        id: "B",
        capacities: {
          treasury: 50, labor: 100, industry: 10, energy: 5, materials: 10,
          logistics: 10, administration: 10, research: 5, politicalCapital: 5,
        },
        technologies: [],
        controlledRegions: ["R1"],
        resources: {
          energyProductionMonthly: 5,
          energyDemandMonthly: 15,
          materialProductionMonthly: 10,
          materialDemandMonthly: 10,
          materialStock: 10,
        },
        military: {
          activePersonnel: 50, reservePersonnel: 50, mobilizedPersonnel: 0,
          equipmentPoints: 10, readiness: 0.4, training: 0.4,
          supplyStock: 1, monthlySupplyDemand: 10, mobilizationLimit: 20,
        },
      },
    },
  };
}

describe("campaign and NPC rules", () => {
  it("transfers territory only after authoritative combat gives the attacker the win", () => {
    const result = resolveCampaignBattle(makeState(), "A", "B", "R1");
    expect(result.captured).toBe(true);
    expect(result.state.regions?.R1.controller).toBe("A");
    expect(result.state.polities.A.controlledRegions).toContain("R1");
    expect(result.state.polities.B.controlledRegions).not.toContain("R1");
  });

  it("does not transfer a region that the defender does not control", () => {
    const result = resolveCampaignBattle(makeState(), "A", "B", "UNKNOWN");
    expect(result.captured).toBe(false);
  });

  it("makes NPC candidates pass the same capacity validator", () => {
    const action = chooseNpcAction(makeState(), "B");
    expect(action).toBeDefined();
    expect(action?.actor).toBe("B");
    expect(["military_supply_production", "energy_expansion", "materials_expansion", "infrastructure_expansion"])
      .toContain(action?.kind);
  });
});
