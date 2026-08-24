# Historia HardSim Architecture

## Purpose
Historia HardSim separates language generation from world-state authority. The simulation core is authoritative; LLM output is advisory until converted into a validated action.

## Authority boundary
LLM may parse player intent, propose/rank NPC goals, narrate computed outcomes, and summarize causal history. It may not mint resources, override prerequisites, choose arbitrary completion times, directly mutate authoritative state, bypass validation, define project rewards, decide combat outcomes, transfer territory, alter diplomacy directly, or impersonate another polity.

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
Polities expose constrained treasury, labor, industry, energy, materials, logistics, administration, research, and political-capital capacities. Active projects reserve throughput; upfront stock resources are permanently consumed. Validation uses currently unreserved capacity.

## Civil world model
### Economy
GDP, tax rate, government spending, debt, interest and base growth update monthly. Industrial, logistics, energy and material bottlenecks reduce effective growth. Deficits consume treasury and issue debt when necessary.

### Fiscal policy
Tax rate and annual government spending are immediate deterministic policy changes with validated ranges and ledger entries. Only their explicitly whitelisted intent fields may cross the LLM boundary.

### Resources
Energy is monthly production flow rather than an accumulating stock. Materials have monthly production/demand plus explicit stock. Expansion projects change production only on completion.

### Demography and labor
Population changes from modeled growth. Working-age share and labor participation determine labor capacity, so long-run population changes propagate into project limits.

### Research and technology
Research capacity creates knowledge accumulation. Research projects reserve research throughput and unlock their target technology only after deterministic completion. Prerequisites are enforced by the validator.

## Military world model
Military state is abstract: active personnel, reserves, mobilized personnel, equipment points, readiness, training, supply stock and monthly supply demand.

### Mobilization
Mobilization is capped by remaining reserves, configured mobilization ceiling, and civilian labor that can be removed without crossing the protected labor floor.

### Military production
Equipment, supply and training use the same project engine as civilian construction. They reserve throughput, consume configured stock resources and only produce effects on completion.

### Supply and readiness
Monthly military ticks consume supply subject to logistics. Insufficient supply or logistics lowers readiness.

### Combat and campaigns
Combat reads only authoritative force state. Relative personnel, abstract equipment, readiness and training determine deterministic force power/attrition. Territory transfers only through the campaign layer after authoritative combat.

## Diplomacy
Each directed relation contains bounded trust, tension, trade dependence, treaty commitment and contact level. Diplomatic actions modify those values through deterministic thresholded rules. An LLM can propose a diplomatic action but cannot directly set relation values or create a treaty by prose.

## Fronts
Front state is abstract and contains participating polities, regions, pressure, supply factor and stability. `upsertFront()` derives pressure from authoritative readiness, supply and logistics. It is a strategic state summary, not a separate route around combat/campaign authority.

## NPC rules
NPC economic, diplomatic and front priorities are deterministic baselines. Economic candidates still pass `validateAction()`. A future LLM NPC may rank already-constructed candidates, but execution remains subject to the same system APIs as player actions.

## Open Historia integration
`bootstrapFromOpenHistoriaWorld()` seeds HardSim from Open Historia owner/region state. `toOpenHistoriaPresentationPatch()` is one-way.

The integration installer:
1. builds HardSim as ESM;
2. copies `dist` under Open Historia `src/vendor/hardsim`;
3. copies the runtime/timeline adapter under `src/Game/HardSim`;
4. switches the timeline UI import from Open Historia AI simulation to the HardSim adapter;
5. refuses the patch if the known upstream seam changed.

The timeline adapter preserves Open Historia's exact calendar date while full slow-system ticks occur per complete 30-day block. This explicit approximation is preferable to LLM-authored partial-month physics.

## Local/mobile LLM
`OpenAiCompatibleLocalClient` targets `/v1/chat/completions`. The Android/Termux mode runs a local compatible server on the same device. The model only parses intent and narrates computed diffs.

The Android CI workflow checks out current Open Historia, applies the integration, verifies its web build, then builds the existing Capacitor debug APK.

## Projects
Large actions have duration, executable scale, reserved capacities, consumed upfront resources, progress and status. Completion effects are ruleset-owned.

## Causal ledger
Every authoritative transition is attributable, including projects, civil-system ticks, military readiness, mobilization, combat, territory transfer, diplomacy, fronts, policy changes and technology unlocks.

## Determinism
Given identical initial state, action sequence, ruleset version and RNG seed, deterministic APIs produce identical authoritative results.

## Current module layout
```text
src/
  index.ts
  sim/
    actions/
    core/
    projects/
    systems/
      economy.ts
      resources.ts
      demography.ts
      research.ts
      military.ts
      combat.ts
      campaign.ts
      diplomacy.ts
      fronts.ts
      projectEffects.ts
    adapters/
      openHistoria.ts
    ai/
      contracts.ts
      intentCompiler.ts
      narrator.ts
      bridge.ts
      npcPlanner.ts
      openAiCompatibleClient.ts
integrations/open-historia/
android/termux/
```

## Milestone status
The deterministic authority model, civil systems, abstract military/campaign model, diplomacy/front state, NPC same-rules planners, constrained LLM bridge, Open Historia bootstrap/presentation adapter, automated integration installer, local-LLM client, Android local launcher, tests, ESM build and CI packaging are implemented.

Optional future work is calibration/content quality: richer scenario seed datasets, direct inference embedding inside a single APK, and better LLM ranking over valid NPC candidates.
