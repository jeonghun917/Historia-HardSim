# Historia HardSim Architecture

## Purpose
Historia HardSim separates language generation from world-state authority. The simulation core is authoritative; LLM output is advisory until converted into a validated action.

## Authority boundary
The LLM may parse player intent, propose or rank NPC goals, narrate computed outcomes and summarize causal history. It may not directly mutate authoritative state, mint resources, override prerequisites, choose arbitrary completion times, bypass validation, define project rewards, alter controlled territory directly, alter diplomacy directly or impersonate another polity.

## Turn pipeline
```text
Natural-language command
  -> constrained intent compiler (LLM)
  -> typed ActionRequest / whitelisted immediate action
  -> deterministic validator
  -> project planner / system executor
  -> simulation ticks
  -> WorldDiff + causal ledger
  -> narrator
  -> one-way Open Historia presentation adapter
```

## Capacity model
Polities expose constrained treasury, labor, industry, energy, materials, logistics, administration, research and political-capital capacities. Active projects reserve throughput; upfront stock resources are consumed. Validation uses currently unreserved capacity.

## Civil world model
### Economy
GDP, tax rate, government spending, debt, interest and base growth update monthly. Industrial, logistics, energy and material bottlenecks reduce effective growth.

### Fiscal policy
Tax rate and annual government spending are immediate deterministic policy changes with validated ranges and ledger entries. Only explicitly whitelisted intent fields may cross the LLM boundary.

### Resources
Energy is monthly production flow rather than an accumulating stock. Materials have monthly production/demand plus explicit stock. Expansion projects change production only on completion.

### Demography and labor
Population changes from modeled growth. Working-age share and labor participation determine labor capacity, so long-run population changes propagate into project limits.

### Research and technology
Research capacity creates knowledge accumulation. Research projects reserve research throughput and unlock their target technology only after deterministic completion. Prerequisites are enforced by the validator.

## Strategic state
Strategic/campaign state is deliberately abstract and is derived from authoritative polity, region, capacity and readiness state. It is not a separate route around the validator or campaign authority layer.

## Diplomacy
Each directed relation contains bounded trust, tension, trade dependence, treaty commitment and contact level. Diplomatic actions modify those values through deterministic thresholded rules. An LLM can propose a diplomatic action but cannot directly set relation values.

## NPC rules
NPC choices are utility-ranked deterministic candidates rather than "first valid action" selection. Candidate scores account for current bottlenecks, fiscal pressure and the proportion of the requested action that the validator can actually execute. Diplomatic and campaign priorities are also ranked from authoritative state. The final action still passes the same system APIs as player actions.

## Scenario calibration
`src/sim/calibration/profiles.ts` defines broad era calibration profiles and `inferEraProfile()` selects a default from the scenario date. `bootstrapFromOpenHistoriaWorld()` then scales baseline capacity by controlled-region count before applying scenario-authored `hardSimSeed` overrides.

Authority order is:
```text
era profile
  -> deterministic scale from map state
  -> explicit hardSimSeed overrides
```

A scenario author can therefore replace any generic baseline without changing simulation code. `hardSimSeed.rngSeed` also makes scenario replay seeds explicit.

## Open Historia integration
`bootstrapFromOpenHistoriaWorld()` seeds HardSim from Open Historia owner/region state. `toOpenHistoriaPresentationPatch()` is one-way.

The integration installer:
1. builds HardSim as ESM;
2. copies `dist` under Open Historia `src/vendor/hardsim`;
3. copies the runtime/timeline adapter and native-model manager under `src/Game/HardSim`;
4. switches the timeline UI import to the HardSim adapter;
5. refuses the patch if the known upstream seam changed.

The timeline adapter preserves Open Historia's exact calendar date while slow-system ticks occur in complete simulation blocks. This explicit approximation is preferable to allowing generated prose to author state transitions.

## Local/mobile LLM
Two adapters implement the same `LocalLlmPort` contract.

### Localhost adapter
`OpenAiCompatibleLocalClient` targets `/v1/chat/completions`, allowing an external or same-device compatible inference service.

### Embedded Android adapter
`CapacitorLocalLlmClient` calls a `LocalLlm` Capacitor plugin. The native integration script builds the current upstream `llama.cpp` Android AAR and injects it into the Open Historia Capacitor application. The plugin stores GGUF files in app-private storage and exposes model status/load/generation methods to the WebView.

The normal Android build keeps Open Historia's wider compatibility range. The native-LLM build is separate because the upstream Android library currently requires API 33 and compile SDK 36.

## Projects
Large actions have duration, executable scale, reserved capacities, consumed upfront resources, progress and status. Completion effects are ruleset-owned.

## Causal ledger
Every authoritative transition is attributable through the causal ledger, making results inspectable and replay/debug friendly.

## Determinism
Given identical initial state, action sequence, ruleset version and RNG seed, deterministic APIs produce identical authoritative results.

## Current module layout
```text
src/
  index.ts
  sim/
    actions/
    calibration/
      profiles.ts
    core/
    projects/
    systems/
    adapters/
      openHistoria.ts
    ai/
      contracts.ts
      intentCompiler.ts
      narrator.ts
      bridge.ts
      npcPlanner.ts
      openAiCompatibleClient.ts
      capacitorLocalClient.ts
integrations/open-historia/
  src/Game/HardSim/
  mobile-native/
android/termux/
```

## Verification
- Core CI: TypeScript typecheck, Vitest suite and distributable ESM build.
- Android APK CI: current Open Historia checkout, integration installer, Vite build and normal Capacitor APK.
- Android Native LLM CI: Android 36/NDK toolchain, upstream llama.cpp Android AAR, native plugin injection, Vite build and embedded-runtime APK artifact.
