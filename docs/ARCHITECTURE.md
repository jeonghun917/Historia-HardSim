# Historia HardSim Architecture

## Purpose
Historia HardSim separates language generation from world-state authority. The simulation core is authoritative; LLM output is advisory until converted into a validated action.

## Authority boundary
LLM may parse player intent, propose NPC goals, narrate computed outcomes, and summarize causal history. It may not mint resources, override prerequisites, choose arbitrary completion times, directly mutate authoritative state, bypass validation, or define project rewards.

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

## Projects
Large actions have duration, executable scale, reserved capacities, consumed upfront resources, progress and status. A time jump advances projects rather than materializing requested outcomes instantly. Completion effects are ruleset-owned.

## Causal ledger
Every authoritative transition is attributable: project creation/progress/completion, resource consumption, economy/resource/demography/research ticks, policy changes, technology unlocks, and system effects all produce ledger entries.

## Determinism
Given identical initial state, action sequence, ruleset version and RNG seed, the simulation must produce identical authoritative results.

## Open Historia boundary
Initial integration remains one-way:
`SimulationState -> validated WorldDiff -> Open Historia presentation/world mutation`
Open Historia or an LLM must never directly write HardSim authoritative state.

## Current module layout
```text
src/sim/
  actions/
    types.ts
    validator.ts
    fiscalPolicy.ts
  core/
    types.ts
    ledger.ts
    tick.ts
  projects/
    capacityAccounting.ts
    planner.ts
  systems/
    economy.ts
    resources.ts
    demography.ts
    research.ts
    projectEffects.ts
  adapters/
  ai/
```

## Milestone status
Implemented: deterministic validation, partial execution, project reservations, upfront consumption, monthly project progression, economy/budget, fiscal policy, industrial/logistics expansion effects, energy/material supply, demography/labor, research/technology progression, causal ledger, tests and CI.

Next major subsystem: military production, force structure, mobilization, logistics/supply and combat. Open Historia/local-LLM adapters follow after the military rules stabilize.
