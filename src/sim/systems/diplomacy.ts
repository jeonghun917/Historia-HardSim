import { appendLedgerEntries, makeLedgerEntry } from "../core/ledger";
import type { DiplomaticRelationState, PolityId, SimulationState } from "../core/types";

export type DiplomaticAction =
  | "improve_relations"
  | "formalize_cooperation"
  | "reduce_tension"
  | "expand_trade"
  | "downgrade_contact";

export interface DiplomacyResult {
  state: SimulationState;
  changed: boolean;
  error?: string;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function relationOrDefault(counterpart: PolityId): DiplomaticRelationState {
  return {
    counterpart,
    trust: 0.5,
    tension: 0.5,
    tradeDependence: 0,
    treatyCommitment: 0,
    contactLevel: 0.5,
  };
}

export function applyDiplomaticAction(
  state: SimulationState,
  actor: PolityId,
  counterpart: PolityId,
  action: DiplomaticAction,
  intensity = 0.1,
): DiplomacyResult {
  const polity = state.polities[actor];
  const other = state.polities[counterpart];
  if (!polity || !other || actor === counterpart) {
    return { state, changed: false, error: "Invalid diplomatic participants." };
  }

  const amount = clamp01(intensity);
  const current = polity.diplomacy?.[counterpart] ?? relationOrDefault(counterpart);
  let next = { ...current };

  switch (action) {
    case "improve_relations":
      next.trust = clamp01(next.trust + amount * 0.4);
      next.tension = clamp01(next.tension - amount * 0.2);
      next.contactLevel = clamp01(next.contactLevel + amount * 0.2);
      break;
    case "formalize_cooperation":
      if (next.trust < 0.6 || next.tension > 0.5) {
        return { state, changed: false, error: "Trust/tension thresholds do not support formal cooperation." };
      }
      next.treatyCommitment = clamp01(next.treatyCommitment + amount * 0.5);
      next.contactLevel = clamp01(next.contactLevel + amount * 0.2);
      break;
    case "reduce_tension":
      next.tension = clamp01(next.tension - amount * 0.5);
      next.contactLevel = clamp01(next.contactLevel + amount * 0.1);
      break;
    case "expand_trade":
      if (next.tension > 0.75) {
        return { state, changed: false, error: "Tension is too high for expanded trade." };
      }
      next.tradeDependence = clamp01(next.tradeDependence + amount * 0.5);
      next.trust = clamp01(next.trust + amount * 0.1);
      break;
    case "downgrade_contact":
      next.contactLevel = clamp01(next.contactLevel - amount * 0.5);
      next.trust = clamp01(next.trust - amount * 0.1);
      next.tension = clamp01(next.tension + amount * 0.1);
      break;
  }

  let nextState: SimulationState = {
    ...state,
    polities: {
      ...state.polities,
      [actor]: {
        ...polity,
        diplomacy: { ...(polity.diplomacy ?? {}), [counterpart]: next },
      },
    },
  };

  const entry = makeLedgerEntry(nextState, {
    type: "diplomacy_changed",
    actor,
    reason: `${actor} diplomatic relation with ${counterpart} changed by deterministic rules.`,
    data: { counterpart, action, intensity: amount, before: current, after: next },
  });
  nextState = appendLedgerEntries(nextState, [entry]);
  return { state: nextState, changed: true };
}
