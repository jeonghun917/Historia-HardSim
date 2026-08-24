# Historia HardSim

A deterministic hard-cap simulation layer for LLM-driven historical/geopolitical games, with an Open Historia integration path and zero-paid-API Android modes.

## Core rule

The LLM may interpret intent, rank candidate choices and narrate outcomes. It does **not** decide authoritative simulation results.

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
- deterministic diplomacy and campaign-state layers;
- NPC utility-ranked economic, diplomatic and campaign priorities using the same validation rules;
- causal ledger;
- constrained LLM intent/narration boundary;
- actor-identity enforcement and metadata whitelist;
- era-aware calibration profiles with region-scale bootstrap and per-scenario `hardSimSeed` overrides;
- Open Historia bootstrap + one-way presentation adapter;
- automated Open Historia integration installer;
- OpenAI-compatible localhost LLM client;
- Capacitor native LLM client;
- embedded Android `llama.cpp` integration path with in-app GGUF download/load UI;
- GitHub Actions library, normal Android and native-LLM Android builds.

## Open Historia integration

```sh
npm install
node scripts/integrate-open-historia.mjs /path/to/open-historia
```

The installer builds HardSim, copies it under Open Historia `src/vendor/hardsim`, installs the runtime/timeline adapter and switches the timeline UI to the HardSim authoritative path. It refuses to patch if the known Open Historia import seam changed upstream.

## Android modes

### Compatibility mode

Keeps Open Historia's normal Android minimum version and talks to a localhost OpenAI-compatible endpoint. This is useful with Termux or another local runtime.

### Embedded native mode

```sh
node scripts/integrate-native-llm.mjs /path/to/open-historia
```

This builds the current upstream `llama.cpp` Android library, injects it into the Capacitor app and registers a `LocalLlm` native plugin. The app can then download an HTTPS GGUF file into app-private storage, load it and run inference without Termux or a paid API.

Because the current upstream Android library requires API 33 and compile SDK 36, this native build intentionally targets Android 13+ rather than raising the minimum version of the compatibility build.

Model weights are not distributed by this repository. Users choose a compatible model and are responsible for its license and device requirements.

See [`docs/ANDROID.md`](docs/ANDROID.md).

## Design rules

- Impossible actions are rejected by code, not prompt wording.
- Large actions consume resources and time.
- Money cannot substitute for missing capacity or prerequisites.
- Player and NPC actions pass through the same authoritative validation path.
- The LLM cannot directly mutate authoritative state.
- Open Historia receives presentation state; it does not author HardSim state.
- Local inference is viable because the model only performs constrained language tasks.

## Verification

`npm run check` performs strict TypeScript checking, all Vitest tests and a distributable ESM build. CI uploads the resulting `dist` artifact.

Android CI checks out the current Open Historia source, applies the integration and builds its Capacitor APK. A separate native-LLM workflow additionally builds the upstream Android `llama.cpp` AAR, injects the native plugin and verifies the embedded-runtime APK.

## Development

Current bootstrap branch: `feat/sim-core`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/OPEN_HISTORIA_INTEGRATION.md`](docs/OPEN_HISTORIA_INTEGRATION.md).
