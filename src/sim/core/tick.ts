import { appendLedgerEntries, makeLedgerEntry } from "./ledger";
import type { LedgerEntry, ProjectState, SimulationState, WorldDiff } from "./types";

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

export function tickMonth(state: SimulationState): TickResult {
  const nextDate = addOneMonth(state.date);
  const projectUpserts: ProjectState[] = [];
  const ledgerEntries: LedgerEntry[] = [];
  let workingState: SimulationState = { ...state, date: nextDate };
  const projects = { ...state.projects };

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
    projectUpserts.push(updated);

    const progressEntry = makeLedgerEntry(
      { ...workingState, ledger: [...(workingState.ledger ?? []), ...ledgerEntries] },
      {
        type: "project_progress",
        actor: project.owner,
        projectId: project.id,
        reason: `Project advanced to ${(progress * 100).toFixed(2)}%.`,
        data: { elapsedMonths, durationMonths: project.durationMonths, progress },
      },
    );
    ledgerEntries.push(progressEntry);

    if (completed) {
      ledgerEntries.push(makeLedgerEntry(
        { ...workingState, ledger: [...(workingState.ledger ?? []), ...ledgerEntries] },
        {
          type: "project_completed",
          actor: project.owner,
          projectId: project.id,
          reason: `Project ${project.id} completed. Reserved capacities are released.`,
          data: { scale: project.scale, kind: project.kind },
        },
      ));
    }
  }

  workingState = { ...workingState, projects };
  workingState = appendLedgerEntries(workingState, ledgerEntries);

  return {
    state: workingState,
    diff: {
      reason: `Simulation advanced one month to ${nextDate}.`,
      projectUpserts,
      ledgerEntries,
      events: ledgerEntries
        .filter((entry) => entry.type === "project_completed")
        .map((entry) => entry.reason),
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

  for (let index = 0; index < months; index += 1) {
    const result = tickMonth(current);
    current = result.state;
    for (const project of result.diff.projectUpserts ?? []) projectUpserts.set(project.id, project);
    ledgerEntries.push(...(result.diff.ledgerEntries ?? []));
    events.push(...(result.diff.events ?? []));
  }

  return {
    state: current,
    diff: {
      reason: `Simulation advanced ${months} month(s) to ${current.date}.`,
      projectUpserts: [...projectUpserts.values()],
      ledgerEntries,
      events,
    },
  };
}
