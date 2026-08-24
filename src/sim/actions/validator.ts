import type { CapacityPool, SimulationState } from "../core/types";
import { getAvailableCapacities } from "../projects/capacityAccounting";
import type { ActionRequest, ConstraintFailure, ValidationResult } from "./types";

function capScaleByCost(
  feasibleScale: number,
  available: CapacityPool,
  cost: Partial<CapacityPool> | undefined,
): number {
  for (const [key, unitCost] of Object.entries(cost ?? {})) {
    const capacity = key as keyof CapacityPool;
    const costPerScale = unitCost ?? 0;
    if (costPerScale <= 0) continue;
    feasibleScale = Math.min(feasibleScale, available[capacity] / costPerScale);
  }
  return feasibleScale;
}

export function validateAction(
  state: SimulationState,
  request: ActionRequest,
): ValidationResult {
  const polity = state.polities[request.actor];
  const failures: ConstraintFailure[] = [];

  if (!polity) {
    return {
      status: "rejected",
      feasibleScale: 0,
      failures: [{ code: "UNKNOWN_ACTOR", message: `Unknown polity: ${request.actor}`, field: "actor" }],
    };
  }

  if (!Number.isFinite(request.requestedScale) || request.requestedScale <= 0) {
    return {
      status: "rejected",
      feasibleScale: 0,
      failures: [{ code: "INVALID_SCALE", message: "requestedScale must be a positive finite number." }],
    };
  }

  for (const technology of request.requiredTechnologies ?? []) {
    if (!polity.technologies.includes(technology)) {
      failures.push({
        code: "MISSING_TECHNOLOGY",
        message: `Missing required technology: ${technology}`,
        field: "technology",
      });
    }
  }

  for (const [key, minimum] of Object.entries(request.minimumCapacities ?? {})) {
    const capacity = key as keyof CapacityPool;
    const required = minimum ?? 0;
    if (polity.capacities[capacity] < required) {
      failures.push({
        code: "MINIMUM_CAPACITY_NOT_MET",
        message: `${capacity} requires at least ${required}; total capacity ${polity.capacities[capacity]}`,
        field: capacity,
      });
    }
  }

  if (failures.length > 0) {
    return { status: "rejected", feasibleScale: 0, failures };
  }

  const available = getAvailableCapacities(state, request.actor);
  if (!available) {
    return { status: "rejected", feasibleScale: 0, failures: [{ code: "UNKNOWN_ACTOR", message: `Unknown polity: ${request.actor}` }] };
  }

  let feasibleScale = request.requestedScale;
  feasibleScale = capScaleByCost(feasibleScale, available, request.capacityCost);
  feasibleScale = capScaleByCost(feasibleScale, available, request.upfrontCost);

  if (feasibleScale <= 0) {
    return {
      status: "rejected",
      feasibleScale: 0,
      failures: [{ code: "NO_FEASIBLE_SCALE", message: "No executable scale remains after capacity checks." }],
    };
  }

  if (feasibleScale < request.requestedScale) {
    return {
      status: "partial",
      feasibleScale,
      failures: [{
        code: "CAPACITY_LIMIT",
        message: `Requested scale ${request.requestedScale} exceeds currently unreserved capacity; maximum feasible scale is ${feasibleScale}.`,
      }],
    };
  }

  return { status: "accepted", feasibleScale, failures: [] };
}
