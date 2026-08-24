import { makeLedgerEntry } from "../core/ledger";
import type { LedgerEntry, PolityId, SimulationState } from "../core/types";

export interface CombatResult {
  state: SimulationState;
  winner?: PolityId;
  attackerLoss: number;
  defenderLoss: number;
  ledgerEntries: LedgerEntry[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function forcePower(state: SimulationState, actor: PolityId): number {
  const polity = state.polities[actor];
  if (!polity?.military) return 0;
  const m = polity.military;
  const personnel = m.activePersonnel + m.mobilizedPersonnel;
  const equipmentFactor = Math.sqrt(Math.max(0, m.equipmentPoints));
  return Math.max(0, personnel * (0.25 + m.readiness * 0.5 + m.training * 0.25) * (1 + equipmentFactor / 100));
}

export function resolveCombat(
  state: SimulationState,
  attacker: PolityId,
  defender: PolityId,
): CombatResult {
  const a = state.polities[attacker];
  const d = state.polities[defender];
  if (!a?.military || !d?.military) {
    return { state, attackerLoss: 0, defenderLoss: 0, ledgerEntries: [] };
  }

  const attackerPower = forcePower(state, attacker);
  const defenderPower = forcePower(state, defender);
  const totalPower = attackerPower + defenderPower;
  if (totalPower <= 0) return { state, attackerLoss: 0, defenderLoss: 0, ledgerEntries: [] };

  const attackerShare = attackerPower / totalPower;
  const defenderShare = defenderPower / totalPower;
  const intensity = 0.03;
  const attackerPersonnel = a.military.activePersonnel + a.military.mobilizedPersonnel;
  const defenderPersonnel = d.military.activePersonnel + d.military.mobilizedPersonnel;
  const attackerLoss = Math.floor(attackerPersonnel * intensity * clamp(defenderShare * 2, 0.5, 1.5));
  const defenderLoss = Math.floor(defenderPersonnel * intensity * clamp(attackerShare * 2, 0.5, 1.5));

  const reducePersonnel = (active: number, mobilized: number, loss: number) => {
    const mobLoss = Math.min(mobilized, loss);
    const activeLoss = Math.min(active, loss - mobLoss);
    return { active: active - activeLoss, mobilized: mobilized - mobLoss };
  };
  const aAfter = reducePersonnel(a.military.activePersonnel, a.military.mobilizedPersonnel, attackerLoss);
  const dAfter = reducePersonnel(d.military.activePersonnel, d.military.mobilizedPersonnel, defenderLoss);
  const winner = attackerShare > defenderShare ? attacker : defenderShare > attackerShare ? defender : undefined;

  let nextState: SimulationState = {
    ...state,
    polities: {
      ...state.polities,
      [attacker]: {
        ...a,
        military: { ...a.military, activePersonnel: aAfter.active, mobilizedPersonnel: aAfter.mobilized },
      },
      [defender]: {
        ...d,
        military: { ...d.military, activePersonnel: dAfter.active, mobilizedPersonnel: dAfter.mobilized },
      },
    },
  };

  const attackerEntry = makeLedgerEntry(nextState, {
    type: "combat_resolved",
    actor: attacker,
    reason: `Combat resolved against ${defender}; deterministic loss ${attackerLoss}.`,
    data: { opponent: defender, attackerPower, defenderPower, loss: attackerLoss, winner },
  });
  nextState = { ...nextState, ledger: [...(nextState.ledger ?? []), attackerEntry] };
  const defenderEntry = makeLedgerEntry(nextState, {
    type: "combat_resolved",
    actor: defender,
    reason: `Combat resolved against ${attacker}; deterministic loss ${defenderLoss}.`,
    data: { opponent: attacker, attackerPower, defenderPower, loss: defenderLoss, winner },
  });

  return { state: { ...nextState, ledger: [...(nextState.ledger ?? []), defenderEntry] }, winner, attackerLoss, defenderLoss, ledgerEntries: [attackerEntry, defenderEntry] };
}
