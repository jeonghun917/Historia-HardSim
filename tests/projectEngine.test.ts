import { describe, expect, it } from "vitest";
import { validateAction } from "../src/sim/actions/validator";
import { advanceMonths } from "../src/sim/core/tick";
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
          labor: 100,
          industry: 30,
          energy: 50,
          materials: 50,
          logistics: 40,
          administration: 25,
          research: 20,
          politicalCapital: 20,
        },
        technologies: ["modern_industry"],
        controlledRegions: ["KR-SEOUL"],
      },
    },
    projects: {},
    ledger: [],
  };
}

describe("project engine", () => {
  it("consumes upfront stock resources and reserves throughput", () => {
    const result = planProject(makeState(), {
      actor: "KOR",
      kind: "industrial_expansion",
      requestedScale: 2,
      durationMonths: 4,
      capacityCost: { industry: 10 },
      upfrontCost: { treasury: 15, materials: 5 },
    });

    expect(result.validation.status).toBe("accepted");
    expect(result.state.polities.KOR.capacities.treasury).toBe(70);
    expect(result.state.polities.KOR.capacities.materials).toBe(40);
    expect(result.project?.reservedCapacities.industry).toBe(20);
  });

  it("prevents a second project from reusing already reserved capacity", () => {
    const first = planProject(makeState(), {
      actor: "KOR",
      kind: "industrial_expansion",
      requestedScale: 2,
      durationMonths: 4,
      capacityCost: { industry: 10 },
    });

    const second = validateAction(first.state, {
      actor: "KOR",
      kind: "industrial_expansion",
      requestedScale: 2,
      capacityCost: { industry: 10 },
    });

    expect(second.status).toBe("partial");
    expect(second.feasibleScale).toBe(1);
  });

  it("advances projects monthly and releases reservation on completion", () => {
    const planned = planProject(makeState(), {
      actor: "KOR",
      kind: "industrial_expansion",
      requestedScale: 2,
      durationMonths: 2,
      capacityCost: { industry: 10 },
    });

    const afterOne = advanceMonths(planned.state, 1);
    expect(afterOne.state.date).toBe("2026-02-01");
    expect(afterOne.state.projects[planned.project!.id].progress).toBe(0.5);

    const afterTwo = advanceMonths(afterOne.state, 1);
    expect(afterTwo.state.projects[planned.project!.id].status).toBe("completed");

    const next = validateAction(afterTwo.state, {
      actor: "KOR",
      kind: "industrial_expansion",
      requestedScale: 3,
      capacityCost: { industry: 10 },
    });
    expect(next.status).toBe("accepted");
  });

  it("writes causal ledger entries for creation, progress and completion", () => {
    const planned = planProject(makeState(), {
      actor: "KOR",
      kind: "generic_project",
      requestedScale: 1,
      durationMonths: 1,
      upfrontCost: { treasury: 10 },
    });
    const completed = advanceMonths(planned.state, 1);
    const types = completed.state.ledger?.map((entry) => entry.type) ?? [];

    expect(types).toContain("project_created");
    expect(types).toContain("resource_consumed");
    expect(types).toContain("project_progress");
    expect(types).toContain("project_completed");
  });
});
