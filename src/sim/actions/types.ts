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
  capacityCost?: Partial<CapacityPool>;
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
