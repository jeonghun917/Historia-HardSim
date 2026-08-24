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
  startedAt: string;
  progress: number;
  status: "planned" | "active" | "blocked" | "completed" | "cancelled";
}

export interface SimulationState {
  date: string;
  rngSeed: number;
  rulesetVersion: string;
  polities: Record<PolityId, PolityState>;
  projects: Record<ProjectId, ProjectState>;
}

export interface WorldDiff {
  reason: string;
  polityCapacityDelta?: Record<PolityId, Partial<CapacityPool>>;
  projectUpserts?: ProjectState[];
  events?: string[];
}
