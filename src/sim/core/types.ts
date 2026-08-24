export type PolityId = string;
export type RegionId = string;
export type ProjectId = string;

export interface CapacityPool {
  treasury: number;
  labor: number;
  industry: number;
  energy: number;
  materials: number;
  logistics: number;
  administration: number;
  research: number;
  politicalCapital: number;
}

export interface PolityState {
  id: PolityId;
  capacities: CapacityPool;
  technologies: string[];
  controlledRegions: RegionId[];
}

export interface ProjectState {
  id: ProjectId;
  owner: PolityId;
  kind: string;
  target?: string;
  scale: number;
  startedAt: string;
  durationMonths: number;
  elapsedMonths: number;
  progress: number;
  reservedCapacities: Partial<CapacityPool>;
  consumedUpfront: Partial<CapacityPool>;
  status: "planned" | "active" | "blocked" | "completed" | "cancelled";
  metadata?: Record<string, unknown>;
}

export interface LedgerEntry {
  id: string;
  at: string;
  type: "project_created" | "project_progress" | "project_completed" | "resource_consumed" | "project_blocked";
  actor: PolityId;
  projectId?: ProjectId;
  reason: string;
  data?: Record<string, unknown>;
}

export interface SimulationState {
  date: string;
  rngSeed: number;
  rulesetVersion: string;
  polities: Record<PolityId, PolityState>;
  projects: Record<ProjectId, ProjectState>;
  ledger?: LedgerEntry[];
}

export interface WorldDiff {
  reason: string;
  polityCapacityDelta?: Record<PolityId, Partial<CapacityPool>>;
  projectUpserts?: ProjectState[];
  ledgerEntries?: LedgerEntry[];
  events?: string[];
}
