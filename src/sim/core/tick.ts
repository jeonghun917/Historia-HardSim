import { appendLedgerEntries, makeLedgerEntry } from "./ledger";
import type { CapacityPool, LedgerEntry, PolityId, ProjectState, SimulationState, WorldDiff } from "./types";
import { tickEconomy } from "../systems/economy";
import { applyProjectCompletionEffect } from "../systems/projectEffects";

function addOneMonth(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid simulation date: ${isoDate}`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

export interface TickResult {
  state: SimulationState;
  diff: WorldDiff;
}

function addCapacityDelta(
  aggregate: Record<PolityId, Partial<CapacityPool>>,
  actor: PolityId,
  delta: Partial<CapacityPool>,
): void {
  const target = aggregate[actor] ?? {};
  for (const [key, value] of Object.entries(delta)) {
    const capacity = key as keyof CapacityPool;
    target[capacity] = (target[capacity] ?? 0) + (value ?? 0);
  }
  aggregate[actor] = target;
}

export function tickMonth(state: SimulationState): TickResult {
  const nextDate = addOneMonth(state.date);
  const projectUpserts: ProjectState[] = [];
  const ledgerEntries: LedgerEntry[] = [];
  const events: string[] = [];
  const polityCapacityDelta: Record<PolityId, Partial<CapacityPool>> = {};
  const projects = { ...state.projects };
  let workingState: SimulationState = { ...state, date: nextDate, projects };

  for (const project of Object.values(state.projects)) {
    if (project.status !== "active") continue;

    const elapsedMonths = Math.min(project.durationMonths, project.elapsedMonths + 1);
    const progress = Math.min(1, elapsedMonths / project.durationMonths);
    const completed = progress >= 1;
    const updated: ProjectState = {
      ...project,
      elapsedMonths,
      progress,
      status: completed ? "completed" : "active",
    };

    projects[project.id] = updated;
    workingState = { ...workingState, projects: { ...projects } };
    projectUpserts.push(updated);

    const progressEntry = makeLedgerEntry(workingState, {
      type: "project_progress",
      actor: project.owner,
      projectId: project.id,
      reason: `Project advanced to ${(progress * 100).toFixed(2)}%.`,
      data: { elapsedMonths, durationMonths: project.durationMonths, progress },
    });
    workingState = appendLedgerEntries(workingState, [progressEntry]);
    ledgerEntries.push(progressEntry);

    if (!completed) continue;

    const completedEntry = makeLedgerEntry(workingState, {
      type: "project_completed",
      actor: project.owner,
      projectId: project.id,
      reason: `Project ${project.id} completed. Reserved capacities are released.`,
      data: { scale: project.scale, kind: project.kind },
    });
    workingState = appendLedgerEntries(workingState, [completedEntry]);
    ledgerEntries.push(completedEntry);
    events.push(completedEntry.reason);

    const effect = applyProjectCompletionEffect(workingState, updated);
    workingState = effect.state;
    if (effect.capacityDelta) addCapacityDelta(polityCapacityDelta, project.owner, effect.capacityDelta);
    if (effect.ledgerEntry) {
      workingState = appendLedgerEntries(workingState, [effect.ledgerEntry]);
      ledgerEntries.push(effect.ledgerEntry);
      events.push(effect.ledgerEntry.reason);
    }
  }

  const economyResult = tickEconomy(workingState);
  workingState = appendLedgerEntries(economyResult.state, economyResult.ledgerEntries);
  ledgerEntries.push(...economyResult.ledgerEntries);
  for (const [actor, delta] of Object.entries(economyResult.polityCapacityDelta)) {
    addCapacityDelta(polityCapacityDelta, actor, delta);
  }

  return {
    state: workingState,
    diff: {
      reason: `Simulation advanced one month to ${nextDate}.`,
      polityCapacityDelta: Object.keys(polityCapacityDelta).length > 0 ? polityCapacityDelta : undefined,
      projectUpserts,
      ledgerEntries,
      events,
    },
  };
}

export function advanceMonths(state: SimulationState, months: number): TickResult {
  if (!Number.isInteger(months) || months < 0) {
    throw new Error("months must be a non-negative integer");
  }

  let current = state;
  const projectUpserts = new Map<string, ProjectState>();
  const ledgerEntries: LedgerEntry[] = [];
  const events: string[] = [];
  const polityCapacityDelta: Record<PolityId, Partial<CapacityPool>> = {};

  for (let index = 0; index < months; index += 1) {
    const result = tickMonth(current);
    current = result.state;
    for (const project of result.diff.projectUpserts ?? []) projectUpserts.set(project.id, project);
    ledgerEntries.push(...(result.diff.ledgerEntries ?? []));
    events.push(...(result.diff.events ?? []));
    for (const [actor, delta] of Object.entries(result.diff.polityCapacityDelta ?? {})) {
      addCapacityDelta(polityCapacityDelta, actor, delta);
    }
  }

  return {
    state: current,
    diff: {
      reason: `Simulation advanced ${months} month(s) to ${current.date}.`,
      polityCapacityDelta: Object.keys(polityCapacityDelta).length > 0 ? polityCapacityDelta : undefined,
      projectUpserts: [...projectUpserts.values()],
      ledgerEntries,
      events,
    },
  };
}
