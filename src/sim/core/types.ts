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

export interface EconomyState {
  gdp: number;
  taxRate: number;
  governmentSpendingAnnual: number;
  debt: number;
  annualInterestRate: number;
  baseAnnualGrowthRate: number;
}

export interface IndustryState {
  capitalStock: number;
  utilization: number;
}

export interface LogisticsState {
  networkCapacity: number;
  utilization: number;
}

export interface PolityState {
  id: PolityId;
  capacities: CapacityPool;
  technologies: string[];
  controlledRegions: RegionId[];
  economy?: EconomyState;
  industryState?: IndustryState;
  logisticsState?: LogisticsState;
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
  type:
    | "project_created"
    | "project_progress"
    | "project_completed"
    | "resource_consumed"
    | "project_blocked"
    | "economy_tick"
    | "system_effect";
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
