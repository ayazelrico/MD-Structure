/**
 * MD-Structure Public Programmatic API.
 * Agent-native architecture decision engine, Markdown scaffolder, and context governance auditor.
 */

export {
  VERSION,
  SCHEMA_VERSION,
  AUTHOR,
  SIGNATURE,
  MANIFEST_FILENAME,
  TIERS,
  LAYERS,
  LOAD_POLICIES,
  ARCHETYPES,
  CAPABILITIES,
  SUPPORTED_SHIMS,
} from "./core/constants.js";

export { DOC_CATALOG, DOC_BY_ID, getCatalogDoc } from "./core/catalog.js";
export { analyzeProject, slugifyProjectName } from "./core/analyzer.js";
export { generateDiscoveryQuestions } from "./core/discovery.js";
export { planArchitecture } from "./core/planner.js";
export { renderFrontmatter, renderDocument, renderAgentShim } from "./core/templates.js";
export { scaffoldWorkspace } from "./core/scaffold.js";
export {
  parseFrontmatter,
  extractAgentFillDirectives,
  loadManifest,
  auditWorkspace,
  getNextDocumentToAuthor,
} from "./core/auditor.js";
export { scanRepository } from "./core/scanner.js";
export { routeContextForTask } from "./core/router.js";
export { addDocumentToWorkspace, syncWorkspace } from "./core/evolve.js";
export { estimateTokens, evaluateTokenBudget } from "./core/tokens.js";
