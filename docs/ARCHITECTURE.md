# Historia HardSim Architecture

## 1. Purpose

Historia HardSim separates language generation from world-state authority. The simulation core is authoritative; LLM output is advisory until converted into a validated action.

## 2. Authority boundary

### LLM may
- parse player intent into the Action DSL;
- propose NPC goals or candidate actions;
- narrate already-computed outcomes;
- summarize causal history.

### LLM may not
- mint resources;
- override prerequisites;
- choose arbitrary completion times;
- directly mutate authoritative simulation state;
- bypass the validator;
- define project completion effects;
- give NPCs abilities unavailable to the player under the same rules.

## 3. State split

`SimulationState` is authoritative and contains resources, capacities, projects, technologies, territory, economy state and ledger entries.

Presentation/game-specific state is produced through adapters. Open Historia integration should therefore consume a validated `WorldDiff` rather than expose its world state directly to the LLM.

## 4. Turn pipeline

```text
Natural-language command
        |
        v
Intent compiler (LLM)
        |
        v
ActionRequest (typed DSL)
        |
        v
Validator
  | reject / partial / accept
        v
Planner
        |
        v
Project / immediate action
        |
        v
Simulation tick(s)
  | project progress/completion
  | rules-driven completion effects
  | monthly economy update
        v
WorldDiff + CausalLedger
        |
        +--> authoritative state
        +--> Open Historia adapter
        +--> LLM narrator
```

## 5. Stocks and capacities

The model distinguishes stocks from throughput constraints.

Examples of stock-like state:
- treasury;
- debt;
- GDP;
- industrial capital stock;
- logistics network capacity.

Hard-cap throughput includes:
- labor;
- industrial capacity;
- energy;
- materials;
- transport/logistics;
- administrative capacity;
- research capacity;
- political capital.

Actions must declare what they consume or reserve. More money must not automatically create missing physical capacity.

## 6. Constraint classes

### HardConstraint
Failure means the requested action cannot execute at the requested scale.
Examples: missing prerequisite technology, insufficient minimum industrial capability, nonexistent controlled territory.

### CapacityConstraint
The action can execute only up to a computable maximum scale. The validator may return `partial` with the maximum feasible allocation.

Validation uses **currently unreserved capacity**, not headline capacity. An active project therefore prevents another project from reusing the same industrial, logistical, administrative, research, or other reserved throughput.

### Upfront stock consumption
Projects may specify resources that are permanently consumed when the project starts. These are distinct from reserved throughput. Treasury/material stock can be spent while industrial capacity remains occupied only for the project's lifetime.

### Uncertainty
Only after an action is valid may seeded randomness alter efficiency, completion time, discovery, failure, or other explicitly modeled uncertain outcomes.

## 7. Projects

Large actions become projects with:
- start date;
- duration and elapsed months;
- executable scale;
- reserved capacities;
- consumed upfront resources;
- progress;
- status;
- causal ledger references.

A time jump advances progress; it does not instantly materialize requested outcomes. Completed or cancelled projects stop reserving throughput automatically.

Project completion effects are selected by the deterministic ruleset using `project.kind`. LLM metadata cannot award arbitrary capacity, GDP, technology, territory or resources.

Current completion rules:
- `industrial_expansion`: increases industrial throughput and industrial capital stock by validated project scale;
- `infrastructure_expansion`: increases logistics throughput and logistics network capacity by validated project scale.

## 8. Monthly economy model

A polity may carry an explicit economy state:
- GDP;
- tax rate;
- annual government program spending;
- debt;
- annual interest rate;
- base annual GDP growth rate.

Each monthly tick computes:
1. currently available industrial and logistics throughput after active-project reservations;
2. a bottleneck factor from those available capacities versus productive/network stock;
3. effective GDP growth from base growth multiplied by the bottleneck factor;
4. tax revenue, program spending and debt interest;
5. fiscal balance;
6. treasury change;
7. automatic debt issuance only when the treasury would otherwise fall below zero.

This deliberately couples large state projects to opportunity cost: reserving a large share of industrial or logistics throughput can suppress economic growth until the project completes.

## 9. Causal ledger

Every authoritative transition must be attributable. Ledger entries are appended in causal order during the tick rather than accumulated with ambiguous ordering.

Current ledger types cover:
- project creation;
- upfront resource consumption;
- project progress;
- project completion;
- rules-driven system effects;
- monthly economy updates.

## 10. Determinism

Given identical initial state, action sequence, ruleset version and RNG seed, the simulation must produce identical authoritative results.

## 11. Open Historia integration boundary

The integration adapter should be one-way at first:

`SimulationState -> validated WorldDiff -> Open Historia presentation/world mutation`

Open Historia or an LLM should never directly write authoritative HardSim state.

## 12. Current module layout

```text
src/sim/
  actions/
    types.ts
    validator.ts
  core/
    types.ts
    ledger.ts
    tick.ts
  projects/
    capacityAccounting.ts
    planner.ts
  systems/
    economy.ts
    projectEffects.ts
  state/
  ai/
  adapters/
```

## 13. Milestone status

Implemented:
- typed Action DSL;
- hard prerequisite validation;
- partial execution by feasible scale;
- active-project capacity reservation;
- upfront stock-resource consumption;
- deterministic project creation;
- monthly simulation ticks;
- automatic reservation release on completion;
- causal ledger;
- deterministic fiscal flow and debt issuance;
- industrial/logistics bottlenecks on growth;
- rules-driven industrial and infrastructure completion effects;
- tests and CI.

Next milestone:
- explicit policy actions that modify taxes/spending rather than raw metadata;
- energy/material supply systems;
- demography/labor;
- technology progression;
- richer industrial/logistics production functions;
- only then the Open Historia adapter.
