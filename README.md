# Historia HardSim

A deterministic hard-cap simulation layer for LLM-driven historical/geopolitical games.

## Core rule

The LLM may interpret intent and narrate outcomes. It does **not** decide physical, economic, demographic, technological, logistical, military, or combat results.

```text
Player command
  -> constrained LLM intent compiler
  -> typed Action DSL
  -> deterministic validator/planner
  -> projects + monthly simulation ticks
  -> authoritative WorldDiff
  -> narrator
  -> Open Historia presentation adapter
```

## Implemented systems

- demography and labor capacity;
- economy, budget, taxes, spending, debt and growth;
- industry and infrastructure/logistics;
- energy flow and material stock/production;
- research projects and technology unlocks;
- project capacity reservation and upfront resource consumption;
- abstract military production, mobilization, supply, readiness and combat;
- causal ledger;
- constrained LLM intent/narration boundary;
- one-way Open Historia presentation adapter;
- OpenAI-compatible local LLM client suitable for llama.cpp/Ollama/LM Studio-style endpoints.

## Design rules

- Impossible actions are rejected by code, not by prompt wording.
- Large actions consume resources and time across multiple ticks.
- Money cannot substitute for missing industrial, logistical, labor, energy, material or research capacity.
- Player and NPCs must obey the same simulation rules.
- The LLM cannot directly mutate authoritative state or decide combat.
- Open Historia receives presentation patches; it does not write back into HardSim state.
- Local/mobile inference remains viable because the model only performs constrained language tasks.

## Local model path

`OpenAiCompatibleLocalClient` targets a standard `/v1/chat/completions` endpoint. A future Android package can point this at an on-device or localhost-compatible inference runtime without changing the simulation authority boundary.

## Development

Current bootstrap branch: `feat/sim-core`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
