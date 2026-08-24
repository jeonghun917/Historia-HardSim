# Open Historia Integration

## Goal
Use Open Historia for map/UI/provider plumbing while Historia HardSim remains the sole authority for physical, economic, demographic, technological, diplomatic and military state transitions.

## Existing Open Historia seam
Open Historia routes structured gameplay through `src/Game/AI/gameplay.js`, then applies generated impacts into `world.json`. Historia HardSim replaces the authoritative timeline path rather than replacing the map or UI.

## Installed flow
```text
Open Historia timeline UI
  -> src/Game/HardSim/gameplayAdapter.js
  -> HardSim runPlayerTurn()/advanceMonths()
  -> deterministic SimulationState + WorldDiff
  -> constrained narrator
  -> Open Historia presentation state
```

The integration installer builds HardSim, copies the ESM library into Open Historia under `src/vendor/hardsim`, copies the HardSim runtime files, and changes the timeline UI import so `simulateTimelineJump` / `simulateAutoJump` come from the HardSim adapter.

## Install into an Open Historia checkout

```sh
npm install
node scripts/integrate-open-historia.mjs /path/to/open-historia
```

The installer is deliberately fail-closed: if Open Historia's `time.jsx` import changes upstream, it refuses to perform a blind string patch.

## Authority rules
1. Structured LLM output enters HardSim through `validateIntentEnvelope()`.
2. `actor` is supplied by game authority and overwrites model-proposed identity.
3. Arbitrary LLM metadata is stripped; only explicitly whitelisted policy fields survive.
4. Open Historia-generated impacts never write authoritative HardSim state.
5. Project rewards/completion effects come only from deterministic HardSim systems.
6. Slow-changing systems advance through HardSim ticks rather than LLM-authored outcomes.
7. Combat and territory transfer are separate deterministic calls; narration cannot choose winners or controllers.
8. NPCs use the same validator/project engine as the player.
9. Diplomacy and fronts are numeric state machines; an LLM may propose/rank choices but does not apply them.
10. The Open Historia adapter is one-way: `SimulationState + WorldDiff -> presentation patch`.

## Bootstrap
`bootstrapFromOpenHistoriaWorld()` reads Open Historia `ownerCodes` and `regionOwnershipOverrides` to create the initial HardSim polity/region graph. Scenario authors may optionally provide `world.hardSimSeed.polities` to replace conservative default numeric baselines.

Unknown fields survive Open Historia world normalization, so the adapter may expose presentation-only fields such as `hardSimStats` without making them authoritative inputs.

## Persistence
The drop-in runtime currently stores HardSim state separately in browser `localStorage`, keyed by player/start date. The runtime API also accepts custom `loadState` / `saveState` hooks, so a later server-side `hardsim-state.json` asset can replace localStorage without changing simulation code.

## Timeline granularity
Open Historia keeps its exact calendar date. HardSim's slow-changing economic/project systems currently tick once per complete 30-day block during the drop-in timeline adapter; sub-month jumps change the Open Historia clock but do not execute a full monthly HardSim tick. This is explicit rather than letting an LLM invent partial-month physical changes.

## Local/mobile LLM
HardSim ships `OpenAiCompatibleLocalClient`, targeting `/v1/chat/completions`. The Open Historia runtime facade reads the same OpenAI-compatible localStorage settings by default, so a localhost llama.cpp/Ollama/LM Studio-compatible endpoint can serve intent parsing and narration.

See `docs/ANDROID.md` for the all-local Android/Termux mode.

## Automated Android verification
`.github/workflows/android-apk.yml` checks out current Open Historia, runs the integration installer, verifies the integrated web build, builds the existing Capacitor Android thin client, and uploads the debug APK as a workflow artifact.

## Remaining optional extensions
- embed an inference engine directly into one APK instead of using a localhost process;
- scenario-specific calibrated HardSim seed datasets;
- richer LLM ranking of already-valid NPC candidates.

These are packaging/content improvements, not holes in the authority boundary.
