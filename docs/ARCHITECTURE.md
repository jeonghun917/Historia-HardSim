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
- give NPCs abilities unavailable to the player under the same rules.

## 3. State split

`SimulationState` is authoritative and contains resources, capacities, projects, technologies, territory and ledger entries.

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
        |
        v
WorldDiff + CausalLedger
        |
        +--> authoritative state
        +--> Open Historia adapter
        +--> LLM narrator
```

## 5. MVP capacities

Each polity has explicit constrained capacities:

- treasury / fiscal headroom;
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

### Uncertainty
Only after an action is valid may seeded randomness alter efficiency, completion time, discovery, failure, or other explicitly modeled uncertain outcomes.

## 7. Projects

Large actions become projects with:

- start date;
- target completion date;
- reserved/consumed capacities;
- progress;
- prerequisites;
- dependencies;
- status;
- causal ledger references.

A time jump advances progress; it does not instantly materialize requested outcomes.

## 8. Determinism

Given identical initial state, action sequence, ruleset version and RNG seed, the simulation must produce identical authoritative results.

## 9. Open Historia integration boundary

The integration adapter should be one-way at first:

`SimulationState -> validated WorldDiff -> Open Historia presentation/world mutation`

Open Historia or an LLM should never directly write authoritative HardSim state.

## 10. Initial module layout

```text
src/sim/
  core/
  state/
  actions/
  systems/
  projects/
  ai/
  adapters/
```

The first implementation milestone is not historical realism. It is enforcement: commands cannot create outcomes the modeled state cannot support.
