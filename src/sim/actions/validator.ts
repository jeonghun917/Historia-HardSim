import type { SimulationState } from "../core/types";
import type { ActionRequest, ConstraintFailure, ValidationResult } from "./types";

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
    const capacity = key as keyof typeof polity.capacities;
    const required = minimum ?? 0;
    if (polity.capacities[capacity] < required) {
      failures.push({
        code: "MINIMUM_CAPACITY_NOT_MET",
        message: `${capacity} requires at least ${required}; available ${polity.capacities[capacity]}`,
        field: capacity,
      });
    }
  }

  if (failures.length > 0) {
    return { status: "rejected", feasibleScale: 0, failures };
  }

  let feasibleScale = request.requestedScale;

  for (const [key, unitCost] of Object.entries(request.capacityCost ?? {})) {
    const capacity = key as keyof typeof polity.capacities;
    const costPerScale = unitCost ?? 0;
    if (costPerScale <= 0) continue;

    const maxByCapacity = polity.capacities[capacity] / costPerScale;
    feasibleScale = Math.min(feasibleScale, maxByCapacity);
  }

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
        message: `Requested scale ${request.requestedScale} exceeds current capacity; maximum feasible scale is ${feasibleScale}.`,
      }],
    };
  }

  return { status: "accepted", feasibleScale, failures: [] };
}
