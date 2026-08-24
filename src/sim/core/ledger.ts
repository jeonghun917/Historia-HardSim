import type { LedgerEntry, PolityId, ProjectId, SimulationState } from "./types";

export function makeLedgerEntry(
  state: SimulationState,
  input: {
    type: LedgerEntry["type"];
    actor: PolityId;
    projectId?: ProjectId;
    reason: string;
    data?: Record<string, unknown>;
  },
): LedgerEntry {
  const sequence = (state.ledger?.length ?? 0) + 1;
  return {
    id: `ledger:${state.date}:${sequence}`,
    at: state.date,
    ...input,
  };
}

export function appendLedgerEntries(
  state: SimulationState,
  entries: LedgerEntry[],
): SimulationState {
  if (entries.length === 0) return state;
  return { ...state, ledger: [...(state.ledger ?? []), ...entries] };
}
