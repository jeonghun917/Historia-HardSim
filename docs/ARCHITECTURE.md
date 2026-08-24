# Historia HardSim Architecture

## Purpose
Historia HardSim separates language generation from world-state authority. The simulation core is authoritative; LLM output is advisory until converted into a validated action.

## Authority boundary
LLM may parse player intent, propose NPC goals, narrate computed outcomes, and summarize causal history. It may not mint resources, override prerequisites, choose arbitrary completion times, directly mutate authoritative state, bypass validation, define project rewards, decide combat outcomes, or transfer territory.

## Turn pipeline
```text
Natural-language command
  -> Intent compiler (LLM)
  -> typed ActionRequest / immediate policy action
  -> deterministic validator
  -> project planner or policy executor
  -> monthly simulation ticks
  -> WorldDiff + causal ledger
  -> presentation adapter / narrator
```

## Capacity model
Polities expose constrained treasury, labor, industry, energy, materials, logistics, administration, research, and political-capital capacities. Active projects reserve throughput; upfront stock resources are permanently consumed. Validation uses currently unreserved capacity.

## Civil world model
### Economy
GDP, tax rate, government spending, debt, interest and base growth update monthly. Industrial, logistics, energy and material bottlenecks reduce effective growth. Deficits consume treasury and issue debt when necessary.

### Fiscal policy
Tax rate and annual government spending are immediate deterministic policy changes with validated ranges and ledger entries. They are not LLM-written state mutations.

### Resources
Energy is modeled as monthly production flow rather than an accumulating stock. Materials have monthly production/demand plus an explicit stock. Energy and materials expansion projects change production only on completion.

### Demography and labor
Population changes monthly from an annual growth rate. Working-age share and labor participation determine available labor capacity, so long-run population changes propagate into project limits.

### Research and technology
Research capacity creates monthly knowledge accumulation. Research projects reserve research throughput and only unlock their target technology after deterministic project completion. Prerequisite technologies are enforced by the action validator.

## Military world model
Military state is intentionally abstract: active personnel, reserves, mobilized personnel, equipment points, readiness, training, supply stock and monthly supply demand.

### Mobilization
Mobilization is capped by remaining reserves, configured mobilization ceiling, and civilian labor that can be removed without crossing the protected labor floor.

### Military production
Equipment, supply and training use the same project engine as civilian construction. They reserve throughput, consume configured stock resources and only produce effects on completion.

### Supply and readiness
Each monthly military tick consumes supply subject to logistics. Insufficient supply or logistics lowers readiness.

### Combat and campaigns
Combat reads only authoritative force state. Relative personnel, abstract equipment, readiness and training determine force power and deterministic attrition. Territory can transfer only through the campaign layer after authoritative combat awards the attacker the win.

## NPC rules
NPC actions use the same typed ActionRequest and `validateAction()` path as the player. The current deterministic baseline planner prioritizes supply/resource shortages and capacity expansion. A future LLM NPC may rank or propose candidates, but execution remains subject to the same validator.

## LLM and Open Historia boundary
The LLM is restricted to intent compilation and narration. `runPlayerTurn()` forces the actual actor identity, validates the intent and produces authoritative state/diff before narration. `toOpenHistoriaPresentationPatch()` is one-way; Open Historia receives presentation data and has no reverse-write path into HardSim state.

`OpenAiCompatibleLocalClient` targets a standard `/v1/chat/completions` endpoint so local/mobile inference can be swapped without changing simulation authority.

## Projects
Large actions have duration, executable scale, reserved capacities, consumed upfront resources, progress and status. Completion effects are ruleset-owned.

## Causal ledger
Every authoritative transition is attributable, including projects, civil-system ticks, military readiness, mobilization, combat, territory transfer, policy changes and technology unlocks.

## Determinism
Given identical initial state, action sequence, ruleset version and RNG seed, the simulation must produce identical authoritative results.

## Current module layout
```text
src/sim/
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
```

## Milestone status
Implemented: deterministic validation, capacity reservation, economy/resources/demography/research, abstract military production/mobilization/supply/readiness/combat, campaign territory transfer, NPC same-rules planner, constrained LLM bridge, one-way Open Historia adapter, local OpenAI-compatible client, causal ledger, tests and CI.

Remaining application work is primarily direct Open Historia source integration, richer fronts/diplomacy, and Android runtime packaging.
