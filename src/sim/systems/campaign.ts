import { makeLedgerEntry } from "../core/ledger";
import type { PolityId, RegionId, SimulationState } from "../core/types";
import { resolveCombat } from "./combat";

export interface CampaignResult {
  state: SimulationState;
  captured: boolean;
  winner?: PolityId;
  events: string[];
}

export function resolveCampaignBattle(
  state: SimulationState,
  attacker: PolityId,
  defender: PolityId,
  regionId: RegionId,
): CampaignResult {
  const region = state.regions?.[regionId];
  if (!region || region.controller !== defender) {
    return { state, captured: false, events: [`Region ${regionId} is not controlled by ${defender}.`] };
  }

  const combat = resolveCombat(state, attacker, defender);
  let nextState = combat.state;
  const events = combat.ledgerEntries.map((entry) => entry.reason);
  if (combat.winner !== attacker) return { state: nextState, captured: false, winner: combat.winner, events };

  const attackerPolity = nextState.polities[attacker];
  const defenderPolity = nextState.polities[defender];
  if (!attackerPolity || !defenderPolity) return { state: nextState, captured: false, winner: combat.winner, events };

  const nextRegion = { ...region, controller: attacker };
  nextState = {
    ...nextState,
    regions: { ...(nextState.regions ?? {}), [regionId]: nextRegion },
    polities: {
      ...nextState.polities,
      [attacker]: {
        ...attackerPolity,
        controlledRegions: attackerPolity.controlledRegions.includes(regionId)
          ? attackerPolity.controlledRegions
          : [...attackerPolity.controlledRegions, regionId],
      },
      [defender]: {
        ...defenderPolity,
        controlledRegions: defenderPolity.controlledRegions.filter((id) => id !== regionId),
      },
    },
  };

  const entry = makeLedgerEntry(nextState, {
    type: "territory_changed",
    actor: attacker,
    reason: `${attacker} captured region ${regionId} from ${defender} after authoritative combat resolution.`,
    data: { regionId, previousController: defender, controller: attacker },
  });
  nextState = { ...nextState, ledger: [...(nextState.ledger ?? []), entry] };
  events.push(entry.reason);

  return { state: nextState, captured: true, winner: attacker, events };
}
