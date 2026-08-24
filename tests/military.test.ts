import { describe, expect, it } from "vitest";
import type { SimulationState } from "../src/sim/core/types";
import { mobilizePersonnel, tickMilitary } from "../src/sim/systems/military";
import { resolveCombat } from "../src/sim/systems/combat";
import { planProject } from "../src/sim/projects/planner";
import { advanceMonths } from "../src/sim/core/tick";

function makeState(): SimulationState {
  return {
    date: "2026-01-01",
    rngSeed: 42,
    rulesetVersion: "0.0.1",
    projects: {},
    polities: {
      A: {
        id: "A",
        capacities: {
          treasury: 1000,
          labor: 1000,
          industry: 100,
          energy: 100,
          materials: 100,
          logistics: 100,
          administration: 100,
          research: 50,
          politicalCapital: 50,
        },
        technologies: [],
        controlledRegions: [],
        military: {
          activePersonnel: 100,
          reservePersonnel: 500,
          mobilizedPersonnel: 0,
          equipmentPoints: 100,
          readiness: 0.8,
          training: 0.8,
          supplyStock: 100,
          monthlySupplyDemand: 10,
          mobilizationLimit: 200,
        },
      },
      B: {
        id: "B",
        capacities: {
          treasury: 500,
          labor: 500,
          industry: 30,
          energy: 30,
          materials: 30,
          logistics: 30,
          administration: 30,
          research: 20,
          politicalCapital: 20,
        },
        technologies: [],
        controlledRegions: [],
        military: {
          activePersonnel: 80,
          reservePersonnel: 100,
          mobilizedPersonnel: 0,
          equipmentPoints: 20,
          readiness: 0.5,
          training: 0.5,
          supplyStock: 20,
          monthlySupplyDemand: 10,
          mobilizationLimit: 50,
        },
      },
    },
  };
}

describe("military simulation", () => {
  it("caps mobilization by reserve, mobilization and civilian labor limits", () => {
    const result = mobilizePersonnel(makeState(), "A", 500);
    expect(result.accepted).toBe(200);
    expect(result.state.polities.A.military?.mobilizedPersonnel).toBe(200);
    expect(result.state.polities.A.capacities.labor).toBe(800);
  });

  it("degrades readiness when supply is insufficient", () => {
    const state = makeState();
    state.polities.B.military = {
      ...state.polities.B.military!,
      supplyStock: 0,
      readiness: 0.8,
      monthlySupplyDemand: 100,
    };
    const result = tickMilitary(state);
    expect(result.state.polities.B.military!.readiness).toBeLessThan(0.8);
  });

  it("requires time and capacity before equipment appears", () => {
    const planned = planProject(makeState(), {
      actor: "A",
      kind: "military_equipment_production",
      requestedScale: 20,
      durationMonths: 2,
      capacityCost: { industry: 1, logistics: 0.5 },
      upfrontCost: { materials: 1 },
    });
    expect(planned.project).toBeDefined();
    expect(planned.state.polities.A.military!.equipmentPoints).toBe(100);

    const oneMonth = advanceMonths(planned.state, 1);
    expect(oneMonth.state.polities.A.military!.equipmentPoints).toBe(100);

    const twoMonths = advanceMonths(oneMonth.state, 1);
    expect(twoMonths.state.polities.A.military!.equipmentPoints).toBe(120);
  });

  it("resolves combat from current force state instead of narrative input", () => {
    const result = resolveCombat(makeState(), "A", "B");
    expect(result.winner).toBe("A");
    expect(result.attackerLoss).toBeGreaterThan(0);
    expect(result.defenderLoss).toBeGreaterThan(0);
    expect(result.state.polities.A.military!.activePersonnel).toBeLessThan(100);
    expect(result.state.polities.B.military!.activePersonnel).toBeLessThan(80);
  });
});
