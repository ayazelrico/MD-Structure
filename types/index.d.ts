export type TierId = "T0" | "T1" | "T2" | "T3";
export type LayerId = "bootstrap" | "product" | "system" | "engineering" | "operations" | "governance";
export type LoadPolicyId = "always" | "on-demand" | "task-scoped" | "reference";
export type ShimId = "claude" | "cursor" | "copilot" | "windsurf";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface IntakeProfile {
  idea: string;
  name?: string;
  archetype?: string;
  tier?: TierId;
  lifecycle?: "prototype" | "mvp" | "production" | "enterprise";
  teamSize?: "solo" | "small" | "org";
  riskLevel?: RiskLevel;
  capabilities?: string[];
  excludeCapabilities?: string[];
  stack?: string[];
  constraints?: string[];
  includeDocs?: string[];
  excludeDocs?: string[];
}

export interface TokenBudget {
  min: number;
  target: number;
  max: number;
}

export interface CatalogDocument {
  id: string;
  title: string;
  path: string;
  layer: LayerId;
  loadPolicy: LoadPolicyId;
  tokenBudget: TokenBudget;
  alwaysInclude: boolean;
  minTier: TierId;
  triggerCapabilities: string[];
  triggerArchetypes: string[];
  dependsOn: string[];
  authority: string;
  whyRequired: string;
  failureModePrevented: string;
  skipRationale: string;
  readTriggers: string[];
  updateTriggers: string[];
  sections: Array<{ heading: string; purpose: string }>;
}

export interface BlueprintDocument {
  order: number;
  id: string;
  title: string;
  path: string;
  layer: LayerId;
  layerLabel: string;
  priority: "critical" | "recommended" | "conditional";
  loadPolicy: LoadPolicyId;
  tokenBudget: TokenBudget;
  dependsOn: string[];
  authority: string;
  whyRequired: string;
  failureModePrevented: string;
  selectionReasons: string[];
  matchedCapabilities: string[];
  readTriggers: string[];
  updateTriggers: string[];
  sections: Array<{ heading: string; purpose: string }>;
}

export interface ArchitectureBlueprint {
  schemaVersion: string;
  generatedAt: string;
  project: Record<string, unknown>;
  summary: {
    totalDocuments: number;
    excludedDocuments: number;
    recommendedRangeForTier: [number, number];
    byLoadPolicy: Record<LoadPolicyId, number>;
    byLayer: Record<string, number>;
    byPriority: Record<string, number>;
    tokenLedger: {
      alwaysOnTargetTokens: number;
      alwaysOnMaxTokens: number;
      alwaysOnTierLimit: number;
      totalTargetTokens: number;
      totalMaxTokens: number;
      tierTokenEnvelope: [number, number];
      alwaysOnWithinLimit: boolean;
    };
  };
  whyThisStructure: {
    headline: string;
    contextEngineeringPrinciple: string;
    antiBloatGuard: string;
  };
  authoringPhases: Array<{ phase: number; name: string; description: string; docIds: string[] }>;
  documents: BlueprintDocument[];
  excludedDocuments: Array<{ id: string; title: string; path: string; layer: LayerId; skipReason: string }>;
  ambiguities: Array<{ id: string; severity: string; dimension: string; reason: string }>;
  needsDiscovery: boolean;
}

export const VERSION: string;
export const SCHEMA_VERSION: string;
export const AUTHOR: string;
export const SIGNATURE: string;
export const MANIFEST_FILENAME: string;
export const DOC_CATALOG: readonly CatalogDocument[];
export function getCatalogDoc(id: string): CatalogDocument | null;
export function slugifyProjectName(input: string): string;
export function analyzeProject(input: string | IntakeProfile): Record<string, unknown>;
export function generateDiscoveryQuestions(
  input: string | IntakeProfile,
  options?: { maxQuestions?: number }
): Record<string, unknown>;
export function planArchitecture(
  input: string | IntakeProfile,
  options?: { includeDocs?: string[]; excludeDocs?: string[]; docsDir?: string }
): ArchitectureBlueprint;
export function scaffoldWorkspace(
  input: string | IntakeProfile | ArchitectureBlueprint,
  options: {
    outDir: string;
    dryRun?: boolean;
    force?: boolean;
    shims?: ShimId[];
    includeDocs?: string[];
    excludeDocs?: string[];
    docsDir?: string;
  }
): Record<string, unknown>;
export function parseFrontmatter(content: string): {
  hasFrontmatter: boolean;
  data: Record<string, unknown>;
  body: string;
};
export function auditWorkspace(workspaceDir: string): Record<string, unknown>;
export function getNextDocumentToAuthor(workspaceDir: string): Record<string, unknown>;
export function scanRepository(repoDir: string): Record<string, unknown>;
export function routeContextForTask(
  workspaceDir: string,
  taskDescription: string,
  options?: { includeUpstream?: boolean }
): Record<string, unknown>;
export function addDocumentToWorkspace(
  workspaceDir: string,
  docId: string,
  options?: { dryRun?: boolean; force?: boolean }
): Record<string, unknown>;
export function syncWorkspace(
  workspaceDir: string,
  options?: { dryRun?: boolean }
): Record<string, unknown>;
export function estimateTokens(text: string): number;
export function evaluateTokenBudget(
  actualTokens: number,
  budget: TokenBudget
): { status: "under" | "optimal" | "warning" | "over"; ratio: number; message: string };
