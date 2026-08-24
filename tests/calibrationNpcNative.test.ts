import { afterEach, describe, expect, it } from "vitest";
import { bootstrapFromOpenHistoriaWorld } from "../src/sim/adapters/openHistoria";
import { CapacitorLocalLlmClient } from "../src/sim/ai/capacitorLocalClient";
import { rankNpcActions } from "../src/sim/ai/npcPlanner";
import { inferEraProfile } from "../src/sim/calibration/profiles";
import type { SimulationState } from "../src/sim/core/types";

afterEach(() => {
  delete (globalThis as typeof globalThis & { Capacitor?: unknown }).Capacitor;
});

describe("scenario calibration", () => {
  it("selects broad era profiles from the start date", () => {
    expect(inferEraProfile("1600-01-01")).toBe("preindustrial");
    expect(inferEraProfile("1850-01-01")).toBe("industrial");
    expect(inferEraProfile("1939-09-01")).toBe("interwar");
    expect(inferEraProfile("2026-01-01")).toBe("modern");
  });

  it("scales larger polities while preserving explicit scenario overrides", () => {
    const state = bootstrapFromOpenHistoriaWorld({
      ownerCodes: ["A", "B"],
      regionOwnershipOverrides: {
        r1: "A",
        r2: "A",
        r3: "A",
        r4: "A",
        r5: "B",
      },
      hardSimSeed: {
        profile: "industrial",
        rngSeed: 42,
        polities: {
          B: { capacities: { treasury: 777 } as never },
        },
      },
    }, "1850-01-01");

    expect(state.rngSeed).toBe(42);
    expect(state.polities.A.capacities.industry).toBeGreaterThan(state.polities.B.capacities.industry);
    expect(state.polities.B.capacities.treasury).toBe(777);
    expect(state.polities.A.controlledRegions).toHaveLength(4);
  });
});

function npcState(): SimulationState {
  return {
    date: "2026-01-01",
    rngSeed: 1,
    rulesetVersion: "0.0.1",
    projects: {},
    polities: {
      A: {
        id: "A",
        controlledRegions: [],
        technologies: [],
        capacities: {
          treasury: 100,
          labor: 100,
          industry: 80,
          energy: 20,
          materials: 100,
          logistics: 80,
          administration: 80,
          research: 20,
          politicalCapital: 50,
        },
        economy: {
          gdp: 100,
          taxRate: 0.2,
          governmentSpendingAnnual: 20,
          debt: 10,
          annualInterestRate: 0.04,
          baseAnnualGrowthRate: 0.02,
        },
        industryState: { capitalStock: 50, utilization: 0.7 },
        logisticsState: { networkCapacity: 50, utilization: 0.6 },
        resources: {
          energyProductionMonthly: 20,
          energyDemandMonthly: 50,
          materialProductionMonthly: 12,
          materialDemandMonthly: 8,
          materialStock: 100,
        },
        researchState: { knowledge: 0, monthlyKnowledgeGain: 1 },
      },
    },
  };
}

describe("NPC utility ranking", () => {
  it("ranks a severe resource bottleneck above generic expansion", () => {
    const ranked = rankNpcActions(npcState(), "A");
    expect(ranked.length).toBeGreaterThan(1);
    expect(ranked[0].action.kind).toBe("energy_expansion");
    expect(ranked[0].score).toBeGreaterThan(ranked.at(-1)!.score);
  });
});

describe("Capacitor native local LLM client", () => {
  it("uses the native plugin for JSON and text generation", async () => {
    const calls: unknown[] = [];
    (globalThis as typeof globalThis & { Capacitor?: unknown }).Capacitor = {
      Plugins: {
        LocalLlm: {
          async loadModel() { return { ready: true }; },
          async unloadModel() { return { ready: false }; },
          async status() { return { ready: true, state: "ModelReady" }; },
          async generate(input: unknown) {
            calls.push(input);
            return { text: calls.length === 1 ? '{"ok":true}' : "hello" };
          },
        },
      },
    };

    const client = new CapacitorLocalLlmClient(256);
    expect(await client.isReady()).toBe(true);
    expect(await client.structured<{ ok: boolean }>({ system: "s", user: "u", schemaName: "x" })).toEqual({ ok: true });
    expect(await client.text({ system: "s2", user: "u2" })).toBe("hello");
    expect(calls).toHaveLength(2);
  });
});
