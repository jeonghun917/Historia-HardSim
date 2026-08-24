import { appendLedgerEntries, makeLedgerEntry } from "../core/ledger";
import type { SimulationState, WorldDiff } from "../core/types";

export interface FiscalPolicyChange {
  actor: string;
  taxRate?: number;
  governmentSpendingAnnual?: number;
}

export interface FiscalPolicyResult {
  state: SimulationState;
  diff?: WorldDiff;
  error?: string;
}

export function applyFiscalPolicy(
  state: SimulationState,
  change: FiscalPolicyChange,
): FiscalPolicyResult {
  const polity = state.polities[change.actor];
  if (!polity?.economy) return { state, error: "Actor has no economy state." };

  const taxRate = change.taxRate ?? polity.economy.taxRate;
  const spending = change.governmentSpendingAnnual ?? polity.economy.governmentSpendingAnnual;
  if (taxRate < 0 || taxRate > 1) return { state, error: "taxRate must be between 0 and 1." };
  if (spending < 0) return { state, error: "governmentSpendingAnnual cannot be negative." };

  const nextPolity = {
    ...polity,
    economy: { ...polity.economy, taxRate, governmentSpendingAnnual: spending },
  };
  let nextState: SimulationState = {
    ...state,
    polities: { ...state.polities, [change.actor]: nextPolity },
  };
  const entry = makeLedgerEntry(nextState, {
    type: "policy_changed",
    actor: change.actor,
    reason: "Fiscal policy changed by deterministic policy action.",
    data: {
      previousTaxRate: polity.economy.taxRate,
      taxRate,
      previousGovernmentSpendingAnnual: polity.economy.governmentSpendingAnnual,
      governmentSpendingAnnual: spending,
    },
  });
  nextState = appendLedgerEntries(nextState, [entry]);

  return {
    state: nextState,
    diff: { reason: entry.reason, ledgerEntries: [entry], events: [entry.reason] },
  };
}
