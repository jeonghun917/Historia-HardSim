import { describe, expect, it } from "vitest";
import { validateAction } from "../src/sim/actions/validator";
import type { SimulationState } from "../src/sim/core/types";

const state: SimulationState = {
  date: "2026-01-01",
  rngSeed: 42,
  rulesetVersion: "0.0.1",
  polities: {
    KOR: {
      id: "KOR",
      capacities: {
        treasury: 100,
        labor: 100,
        industry: 30,
        energy: 50,
        materials: 50,
        logistics: 40,
        administration: 25,
        research: 20,
        politicalCapital: 20
      },
      technologies: ["modern_industry"],
      controlledRegions: ["KR-SEOUL"]
    }
  },
  projects: {}
};

describe("validateAction", () => {
  it("rejects missing hard prerequisites", () => {
    const result = validateAction(state, {
      actor: "KOR",
      kind: "research_program",
      requestedScale: 1,
      requiredTechnologies: ["fusion_power"]
    });

    expect(result.status).toBe("rejected");
    expect(result.feasibleScale).toBe(0);
  });

  it("caps execution scale by physical capacity", () => {
    const result = validateAction(state, {
      actor: "KOR",
      kind: "industrial_expansion",
      requestedScale: 10,
      capacityCost: { industry: 5 }
    });

    expect(result.status).toBe("partial");
    expect(result.feasibleScale).toBe(6);
  });

  it("accepts actions fully inside all limits", () => {
    const result = validateAction(state, {
      actor: "KOR",
      kind: "infrastructure_expansion",
      requestedScale: 4,
      capacityCost: { industry: 5, logistics: 5 }
    });

    expect(result.status).toBe("accepted");
    expect(result.feasibleScale).toBe(4);
  });
});
