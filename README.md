# Historia HardSim

A deterministic hard-cap simulation layer for LLM-driven historical/geopolitical games.

## Core rule

The LLM may interpret intent and narrate outcomes. It does **not** decide physical, economic, demographic, technological, or logistical results.

```text
Player command
  -> LLM intent compiler
  -> Action DSL
  -> deterministic validator/planner
  -> project + simulation ticks
  -> WorldDiff
  -> narrator/UI
```

## MVP systems

1. Demography
2. Economy / budget
3. Industrial capacity
4. Infrastructure / logistics
5. Technology
6. Territory / political control

Shared infrastructure: project engine, capacity accounting, event queue, seeded RNG, causal ledger.

## Design goals

- Free-form natural-language commands remain possible.
- Impossible actions are rejected by code, not by prompt wording.
- Large actions consume resources and time across multiple ticks.
- Player and NPCs obey the same rules.
- Simulation state is separate from presentation state.
- A future adapter can project validated state into Open Historia.
- Local/mobile LLM support remains possible because the model only performs constrained language tasks.

## Development

Current bootstrap branch: `feat/sim-core`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
