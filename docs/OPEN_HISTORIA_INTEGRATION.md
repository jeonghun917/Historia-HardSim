# Open Historia Integration Plan

## Goal
Use Open Historia for map/UI/provider plumbing while Historia HardSim remains the sole authority for physical, economic, demographic, technological and military state transitions.

## Existing Open Historia seam
Open Historia routes structured gameplay through `src/Game/AI/gameplay.js` using `runJsonTask()`, validates the returned payload, then applies it into world state through functions such as `applySimulationResult()` / event-impact application.

HardSim should replace the **authoritative mutation decision** in that path, not the UI or provider layer.

## Target flow
```text
Open Historia UI command
  -> existing callAI/openai-compatible transport
  -> Historia HardSim compileIntent()
  -> validateAction()/applyFiscalPolicy()
  -> planProject() or immediate policy result
  -> authoritative SimulationState + WorldDiff
  -> narrateComputedResult()
  -> toOpenHistoriaPresentationPatch()
  -> Open Historia UI/world presentation only
```

## Integration rules
1. Open Historia provider selection and local OpenAI-compatible endpoint settings may be reused.
2. Structured LLM output must enter HardSim through `validateIntentEnvelope()`.
3. `actor` is supplied by game authority and overwrites any actor proposed by the model.
4. Open Historia-generated payloads must never directly mutate HardSim state.
5. Project rewards/completion effects come only from `projectEffects.ts` or other deterministic systems.
6. Time jumps call `advanceMonths()`; they do not ask the LLM to invent elapsed-world outcomes.
7. Combat calls `resolveCombat()` and sends the resulting ledger/diff to narration; narration cannot change losses or winners.
8. The Open Historia adapter is one-way: `SimulationState + WorldDiff -> presentation patch`.

## Suggested Open Historia patch points
### Structured player actions
Before the current world-mutation stage in `gameplay.js`:
- call the HardSim player-turn bridge;
- persist returned HardSim state separately from Open Historia presentation state;
- convert the returned diff with the Open Historia adapter;
- apply only presentation-facing changes.

### Timeline jumps
Replace LLM-authored physical/economic state transitions with:
```text
advanceMonths(hardSimState, months)
```
The LLM may still generate narrative summaries from the resulting authoritative diff.

### Diplomacy/advisor chat
Keep existing free-form Open Historia chat paths. They are advisory and need no authoritative state write unless the user chooses a concrete action, at which point that action re-enters HardSim validation.

## Persistence
Recommended save split:
```text
save/
  open-historia-world.json   # map/UI/presentation state
  hardsim-state.json         # authoritative simulation state
```
HardSim state should carry `rulesetVersion` and RNG seed so replays remain deterministic.

## Local/mobile LLM
Open Historia already exposes an OpenAI-compatible provider path. HardSim also ships `OpenAiCompatibleLocalClient`, targeting `/v1/chat/completions`. Both can therefore be pointed at the same local inference endpoint when packaged for desktop/Android.

## Not yet implemented in this repository
- direct source-code patch against Open Historia itself;
- Android inference runtime embedding;
- territory/front/campaign layer;
- diplomacy AI/NPC planner.

Those are integration/application layers, not blockers for the deterministic core authority model.
