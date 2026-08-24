import type { CapacityPool, PolityId } from "../core/types";

export type ActionKind =
  | "industrial_expansion"
  | "infrastructure_expansion"
  | "research_program"
  | "fiscal_policy"
  | "generic_project";

export interface ActionRequest {
  actor: PolityId;
  kind: ActionKind;
  requestedScale: number;
  durationMonths?: number;
  target?: string;
  requiredTechnologies?: string[];
  minimumCapacities?: Partial<CapacityPool>;
  /** Throughput/capacity reserved for the lifetime of the project, per unit of scale. */
  capacityCost?: Partial<CapacityPool>;
  /** Stock resources permanently consumed when the project is created, per unit of scale. */
  upfrontCost?: Partial<CapacityPool>;
  metadata?: Record<string, unknown>;
}

export interface ConstraintFailure {
  code: string;
  message: string;
  field?: keyof CapacityPool | "technology" | "actor";
}

export interface ValidationResult {
  status: "accepted" | "partial" | "rejected";
  feasibleScale: number;
  failures: ConstraintFailure[];
}
