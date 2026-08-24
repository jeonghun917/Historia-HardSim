import { makeLedgerEntry } from "../core/ledger";
import type { LedgerEntry, SimulationState } from "../core/types";
import { getAvailableCapacities } from "../projects/capacityAccounting";

export interface ResearchTickResult {
  state: SimulationState;
  ledgerEntries: LedgerEntry[];
}

export function tickResearch(state: SimulationState): ResearchTickResult {
  let nextState = state;
  const ledgerEntries: LedgerEntry[] = [];

  for (const [polityId, polity] of Object.entries(state.polities)) {
    if (!polity.researchState) continue;
    const available = getAvailableCapacities(nextState, polityId);
    if (!available) continue;

    const utilization = Math.min(1, available.research / Math.max(1, polity.capacities.research));
    const gain = polity.researchState.monthlyKnowledgeGain * utilization;
    const knowledge = polity.researchState.knowledge + gain;
    const nextPolity = {
      ...polity,
      researchState: { ...polity.researchState, knowledge },
    };
    nextState = {
      ...nextState,
      polities: { ...nextState.polities, [polityId]: nextPolity },
    };

    ledgerEntries.push(makeLedgerEntry(
      { ...nextState, ledger: [...(nextState.ledger ?? []), ...ledgerEntries] },
      {
        type: "research_tick",
        actor: polityId,
        reason: "Monthly research knowledge accumulated.",
        data: { gain, knowledge, utilization },
      },
    ));
  }

  return { state: nextState, ledgerEntries };
}
