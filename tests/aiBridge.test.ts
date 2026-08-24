import { describe, expect, it } from "vitest";
import type { SimulationState } from "../src/sim/core/types";
import type { LocalLlmPort } from "../src/sim/ai/contracts";
import { runPlayerTurn } from "../src/sim/ai/bridge";
import { validateIntentEnvelope } from "../src/sim/ai/intentCompiler";
import { toOpenHistoriaPresentationPatch } from "../src/sim/adapters/openHistoria";

function state(): SimulationState {
  return {
    date: "2026-01-01",
    rngSeed: 1,
    rulesetVersion: "0.0.1",
    projects: {},
    polities: {
      A: {
        id: "A",
        capacities: {
          treasury: 100,
          labor: 100,
          industry: 20,
          energy: 20,
          materials: 20,
          logistics: 20,
          administration: 20,
          research: 20,
          politicalCapital: 20,
        },
        technologies: [],
        controlledRegions: [],
        economy: {
          gdp: 1000,
          taxRate: 0.2,
          governmentSpendingAnnual: 200,
          debt: 100,
          annualInterestRate: 0.03,
          baseAnnualGrowthRate: 0.02,
        },
      },
      B: {
        id: "B",
        capacities: {
          treasury: 100,
          labor: 100,
          industry: 20,
          energy: 20,
          materials: 20,
          logistics: 20,
          administration: 20,
          research: 20,
          politicalCapital: 20,
        },
        technologies: [],
        controlledRegions: [],
      },
    },
  };
}

class FakeLlm implements LocalLlmPort {
  constructor(private output: unknown) {}
  async structured<T>(): Promise<T> { return this.output as T; }
  async text(): Promise<string> { return "computed result"; }
}

describe("LLM authority boundary", () => {
  it("overrides an LLM-selected actor with the actual player actor", async () => {
    const llm = new FakeLlm({
      action: {
        actor: "B",
        kind: "industrial_expansion",
        requestedScale: 2,
        durationMonths: 2,
        capacityCost: { industry: 1 },
      },
    });
    const result = await runPlayerTurn(state(), llm, "A", "expand industry");
    const project = Object.values(result.state.projects)[0];
    expect(project.owner).toBe("A");
  });

  it("does not preserve arbitrary LLM metadata on ordinary projects", () => {
    const result = validateIntentEnvelope({
      action: {
        actor: "A",
        kind: "industrial_expansion",
        requestedScale: 1,
        metadata: { instantVictory: true, treasuryGain: 999999 },
      },
    });
    expect(result.action.metadata).toBeUndefined();
  });

  it("rejects unsupported action kinds before they reach the simulation", () => {
    expect(() => validateIntentEnvelope({
      action: { actor: "A", kind: "rewrite_world", requestedScale: 1 },
    })).toThrow(/Unsupported action kind/);
  });

  it("creates an Open Historia patch from authoritative state without a reverse-write channel", async () => {
    const llm = new FakeLlm({
      action: {
        actor: "A",
        kind: "industrial_expansion",
        requestedScale: 1,
        durationMonths: 2,
        capacityCost: { industry: 1 },
      },
    });
    const result = await runPlayerTurn(state(), llm, "A", "expand industry");
    const patch = toOpenHistoriaPresentationPatch(result.state, result.diff);
    expect(patch.projectEvents).toHaveLength(1);
    expect(patch.polityStats.A.industry).toBe(20);
    expect("state" in patch).toBe(false);
  });
});
