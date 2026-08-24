import type { CapacityPool, ProjectState, SimulationState, WorldDiff } from "../core/types";
import { appendLedgerEntries, makeLedgerEntry } from "../core/ledger";
import type { ActionRequest, ValidationResult } from "../actions/types";
import { validateAction } from "../actions/validator";
import { scaleCapacityPool, subtractCapacityPool } from "./capacityAccounting";

export interface PlanResult {
  state: SimulationState;
  validation: ValidationResult;
  project?: ProjectState;
  diff?: WorldDiff;
}

function makeProjectId(state: SimulationState, request: ActionRequest): string {
  const prefix = `${request.actor}:${request.kind}:${state.date}`;
  let sequence = 1;
  let id = `${prefix}:${sequence}`;
  while (state.projects[id]) {
    sequence += 1;
    id = `${prefix}:${sequence}`;
  }
  return id;
}

export function planProject(
  state: SimulationState,
  request: ActionRequest,
): PlanResult {
  const validation = validateAction(state, request);
  if (validation.status === "rejected") return { state, validation };

  const scale = validation.feasibleScale;
  const durationMonths = Math.max(1, Math.ceil(request.durationMonths ?? 12));
  const reservedCapacities = scaleCapacityPool(request.capacityCost, scale);
  const consumedUpfront = scaleCapacityPool(request.upfrontCost, scale);
  const project: ProjectState = {
    id: makeProjectId(state, request),
    owner: request.actor,
    kind: request.kind,
    target: request.target,
    scale,
    startedAt: state.date,
    durationMonths,
    elapsedMonths: 0,
    progress: 0,
    reservedCapacities,
    consumedUpfront,
    status: "active",
    metadata: request.metadata,
  };

  const polity = state.polities[request.actor];
  const capacities = subtractCapacityPool(polity.capacities, consumedUpfront);
  const capacityDelta: Partial<CapacityPool> = {};
  for (const [key, value] of Object.entries(consumedUpfront)) {
    capacityDelta[key as keyof CapacityPool] = -(value ?? 0);
  }

  let nextState: SimulationState = {
    ...state,
    polities: {
      ...state.polities,
      [request.actor]: { ...polity, capacities },
    },
    projects: { ...state.projects, [project.id]: project },
  };

  const created = makeLedgerEntry(nextState, {
    type: "project_created",
    actor: request.actor,
    projectId: project.id,
    reason: `${request.kind} project created at scale ${scale}.`,
    data: { durationMonths, reservedCapacities, consumedUpfront },
  });

  const entries = [created];
  if (Object.keys(consumedUpfront).length > 0) {
    entries.push(makeLedgerEntry({ ...nextState, ledger: [...(nextState.ledger ?? []), created] }, {
      type: "resource_consumed",
      actor: request.actor,
      projectId: project.id,
      reason: "Upfront project resources consumed.",
      data: { consumedUpfront },
    }));
  }
  nextState = appendLedgerEntries(nextState, entries);

  return {
    state: nextState,
    validation,
    project,
    diff: {
      reason: `Project ${project.id} created.`,
      polityCapacityDelta: Object.keys(capacityDelta).length > 0 ? { [request.actor]: capacityDelta } : undefined,
      projectUpserts: [project],
      ledgerEntries: entries,
    },
  };
}
