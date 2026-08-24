import { describe, expect, it } from "vitest";
import { bootstrapFromOpenHistoriaWorld } from "../src/sim/adapters/openHistoria";
import { chooseNpcDiplomaticAction, chooseNpcFrontPriority } from "../src/sim/ai/npcPlanner";
import type { CapacityPool, SimulationState } from "../src/sim/core/types";
import { applyDiplomaticAction } from "../src/sim/systems/diplomacy";
import { upsertFront } from "../src/sim/systems/fronts";

const capacities = (logistics = 50): CapacityPool => ({
  treasury: 100,
  labor: 100,
  industry: 50,
  energy: 50,
  materials: 100,
  logistics,
  administration: 50,
  research: 25,
  politicalCapital: 50,
});

function state(): SimulationState {
  return {
    date: "2026-01-01",
    rngSeed: 1,
    rulesetVersion: "test",
    projects: {},
    regions: {
      R1: { id: "R1", controller: "B", strategicValue: 5 },
    },
    polities: {
      A: {
        id: "A",
        capacities: capacities(60),
        technologies: [],
        controlledRegions: [],
        diplomacy: {
          B: { counterpart: "B", trust: 0.4, tension: 0.8, tradeDependence: 0.1, treatyCommitment: 0, contactLevel: 0.5 },
        },
        military: { activePersonnel: 10, reservePersonnel: 10, mobilizedPersonnel: 0, equipmentPoints: 10, readiness: 0.7, training: 0.6, supplyStock: 20, monthlySupplyDemand: 10, mobilizationLimit: 10 },
      },
      B: {
        id: "B",
        capacities: capacities(40),
        technologies: [],
        controlledRegions: ["R1"],
        military: { activePersonnel: 10, reservePersonnel: 10, mobilizedPersonnel: 0, equipmentPoints: 10, readiness: 0.5, training: 0.5, supplyStock: 10, monthlySupplyDemand: 10, mobilizationLimit: 10 },
      },
    },
  };
}

describe("diplomacy and fronts", () => {
  it("reduces tension deterministically and records the change", () => {
    const result = applyDiplomaticAction(state(), "A", "B", "reduce_tension", 0.2);
    expect(result.changed).toBe(true);
    expect(result.state.polities.A.diplomacy?.B.tension).toBeLessThan(0.8);
    expect(result.state.ledger?.at(-1)?.type).toBe("diplomacy_changed");
  });

  it("NPC diplomacy chooses de-escalation when tension is high", () => {
    expect(chooseNpcDiplomaticAction(state(), "A")?.action).toBe("reduce_tension");
  });

  it("derives front pressure from authoritative readiness and supply", () => {
    const result = upsertFront(state(), { id: "F1", attacker: "A", defender: "B", regionIds: ["R1"] });
    expect(result.front?.pressure).toBeGreaterThan(0.5);
    expect(result.front?.pressure).toBeLessThanOrEqual(1);
    expect(chooseNpcFrontPriority(result.state, "A")).toBe("F1");
  });
});

describe("Open Historia bootstrap", () => {
  it("creates polities and controlled regions from owner codes and overrides", () => {
    const result = bootstrapFromOpenHistoriaWorld(
      { ownerCodes: ["A", "B"], regionOwnershipOverrides: { R1: "A", R2: "B" } },
      "2026-01-01",
    );
    expect(Object.keys(result.polities).sort()).toEqual(["A", "B"]);
    expect(result.polities.A.controlledRegions).toContain("R1");
    expect(result.regions?.R2.controller).toBe("B");
  });
});
