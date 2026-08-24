import {
  normalizeActions,
  normalizeGameData,
  normalizeWorldState,
  readGameStateBundle,
  writeActionsState,
  writeEventsState,
  writeGameData,
  writeWorldState,
} from "../../runtime/gameState.js";
import { createHardSimRuntime } from "./runtime.js";

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return isoDate;
  date.setUTCDate(date.getUTCDate() + Math.max(0, Math.round(days)));
  return date.toISOString().slice(0, 10);
}

function eventId(index) {
  return `hardsim-${Date.now().toString(36)}-${index}`;
}

function makeEvent(date, title, description, playerRelated = true, index = 0) {
  return {
    id: eventId(index),
    date,
    title,
    description,
    importance: "minor",
    kind: playerRelated ? "player" : "world",
    notable: false,
    playerRelated,
    source: "hardsim",
    impacts: {
      createdChats: [],
      polityChanges: [],
      regionTransfers: [],
      unitOps: [],
      markerOps: [],
    },
  };
}

function runtimeKey(game) {
  const country = String(game?.country || "unknown");
  const start = String(game?.startDate || game?.gameDate || "unknown");
  return `historia-hardsim-state-v1:${country}:${start}`;
}

export const simulateTimelineJump = async ({ days, mode = "jump", signal } = {}) => {
  if (signal?.aborted) throw signal.reason ?? new DOMException("Cancelled", "AbortError");
  const safeDays = Number(days);
  if (!Number.isFinite(safeDays) || safeDays <= 0) throw new Error("Choose a time-skip amount greater than zero.");

  const bundle = await readGameStateBundle({ force: true });
  const baseGame = normalizeGameData(bundle.game);
  const baseWorld = normalizeWorldState(bundle.world);
  const actions = normalizeActions(bundle.actions);
  const targetDate = addDays(baseGame.gameDate, safeDays);
  const hardSim = createHardSimRuntime({ storageKey: runtimeKey(baseGame) });

  const generatedEvents = [];
  let eventIndex = 0;
  for (const action of actions.filter((entry) => entry.status === "planned" && entry.kind !== "chat")) {
    if (signal?.aborted) throw signal.reason ?? new DOMException("Cancelled", "AbortError");
    const command = action.rawInput || action.text || action.title;
    const turn = await hardSim.runCommand({
      world: baseWorld,
      date: baseGame.gameDate,
      actor: baseGame.country,
      command,
    });
    generatedEvents.push(makeEvent(
      baseGame.gameDate,
      action.title || "HardSim action",
      turn.narration || turn.diff.reason,
      true,
      eventIndex++,
    ));
  }

  const months = Math.floor(safeDays / 30);
  let jumpResult = null;
  if (months > 0) {
    jumpResult = hardSim.jump({ world: baseWorld, date: baseGame.gameDate, months });
    for (const notification of jumpResult.presentation.notifications) {
      generatedEvents.push(makeEvent(targetDate, "HardSim world update", notification, false, eventIndex++));
    }
  }

  const state = hardSim.loadState() || hardSim.ensureState(baseWorld, baseGame.gameDate);
  state.date = targetDate;
  hardSim.saveState(state);
  const presentation = jumpResult?.presentation || {
    date: targetDate,
    notifications: [],
    polityStats: {},
    projectEvents: [],
    regionControllers: Object.fromEntries(
      Object.entries(state.regions || {}).map(([id, region]) => [id, region.controller]),
    ),
  };

  const nextWorld = normalizeWorldState({
    ...baseWorld,
    regionOwnershipOverrides: {
      ...baseWorld.regionOwnershipOverrides,
      ...presentation.regionControllers,
    },
    hardSimStats: presentation.polityStats,
    hardSimProjectEvents: presentation.projectEvents,
    lastJumpMode: mode,
    lastJumpSummary: generatedEvents.map((event) => event.title).join("; ") || "HardSim time advanced.",
    lastJumpTargetDate: targetDate,
  });

  const nextGame = normalizeGameData({
    ...baseGame,
    gameDate: targetDate,
    round: (baseGame.round || 1) + 1,
  });
  const nextActions = actions.map((action) => ({
    ...action,
    status: action.status === "planned" ? "resolved" : action.status,
  }));
  const nextEvents = [...(Array.isArray(bundle.events) ? bundle.events : []), ...generatedEvents];

  await Promise.all([
    writeActionsState(nextActions),
    writeEventsState(nextEvents),
    writeGameData(nextGame),
    writeWorldState(nextWorld),
  ]);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("oh:turn-complete"));

  return {
    actions: nextActions,
    chats: bundle.chats,
    colors: {},
    events: nextEvents,
    game: nextGame,
    generation: { source: "hardsim", fallbackReason: "" },
    world: nextWorld,
  };
};

export const simulateAutoJump = async ({ days = 365, signal } = {}) =>
  simulateTimelineJump({ days, mode: "auto", signal });
