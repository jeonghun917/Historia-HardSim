# Historia HardSim

A deterministic hard-cap simulation layer for LLM-driven historical/geopolitical games, with an Open Historia integration path and zero-paid-API Android mode.

## Core rule

The LLM may interpret intent, rank candidate choices and narrate outcomes. It does **not** decide authoritative physical, economic, demographic, technological, diplomatic, logistical, military, territory or combat results.

```text
Player command
  -> constrained LLM intent compiler
  -> typed Action DSL
  -> deterministic validator/planner
  -> projects + simulation ticks
  -> authoritative WorldDiff
  -> narrator
  -> Open Historia presentation adapter
```

## Implemented

- demography and labor capacity;
- economy, budget, taxes, spending, debt and growth;
- industry and infrastructure/logistics;
- energy flow and material stock/production;
- research projects and technology unlocks;
- project capacity reservation and upfront resource consumption;
- abstract military production, mobilization, supply, readiness and combat;
- campaign territory transfer after authoritative combat;
- deterministic diplomacy relation state;
- abstract front pressure/supply/stability state;
- NPC economic, diplomatic and front priorities using the same rules;
- causal ledger;
- constrained LLM intent/narration boundary;
- actor-identity enforcement and metadata whitelist;
- Open Historia bootstrap + one-way presentation adapter;
- automated Open Historia integration installer;
- OpenAI-compatible local LLM client;
- Android/Termux all-local launcher;
- GitHub Actions library build and integrated Android APK build.

## Open Historia integration

```sh
npm install
node scripts/integrate-open-historia.mjs /path/to/open-historia
```

The installer builds HardSim, copies it under Open Historia `src/vendor/hardsim`, installs the runtime/timeline adapter, and switches the timeline UI to the HardSim authoritative path. It refuses to patch if the known Open Historia import seam changed upstream.

## Android / free local mode

The supported lightweight path uses the existing Open Historia Android thin client plus a same-phone Termux stack:

```text
Android app/browser -> local Open Historia -> HardSim -> localhost OpenAI-compatible LLM
```

No paid API is required. Model files are intentionally not distributed here.

See [`docs/ANDROID.md`](docs/ANDROID.md).

## Design rules

- Impossible actions are rejected by code, not prompt wording.
- Large actions consume resources and time.
- Money cannot substitute for missing industrial, logistical, labor, energy, material or research capacity.
- Player and NPCs obey the same simulation rules.
- The LLM cannot directly mutate authoritative state, choose combat results or transfer territory.
- Open Historia receives presentation state; it does not author HardSim state.
- Local inference is viable because the model only performs constrained language tasks.

## Verification

`npm run check` performs strict TypeScript checking, all Vitest tests, and a distributable ESM build. CI uploads the resulting `dist` artifact. The Android workflow also checks out Open Historia, installs the integration, verifies its web build and builds its Capacitor debug APK.

## Development

Current bootstrap branch: `feat/sim-core`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/OPEN_HISTORIA_INTEGRATION.md`](docs/OPEN_HISTORIA_INTEGRATION.md).
