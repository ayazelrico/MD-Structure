/**
 * Deterministic Markdown Architecture Planner.
 *
 * Answers the three core questions for any project idea:
 * 1. HOW MANY Markdown documents are required (and their context token budget)?
 * 2. WHICH Markdown documents are required (and in what dependency DAG order)?
 * 3. WHY is each document required (and why were the remaining catalog docs intentionally skipped)?
 */

import { analyzeProject } from "./analyzer.js";
import { DOC_CATALOG, DOC_BY_ID } from "./catalog.js";
import { LAYERS, TIERS, SCHEMA_VERSION } from "./constants.js";

const TIER_RANK = { T0: 0, T1: 1, T2: 2, T3: 3 };

/**
 * Evaluate whether a catalog document should be selected for the given analysis.
 * @param {typeof DOC_CATALOG[number]} doc
 * @param {ReturnType<typeof analyzeProject>} analysis
 * @param {Set<string>} capSet
 * @param {Set<string>} explicitInclude
 * @param {Set<string>} explicitExclude
 */
function evaluateDocSelection(doc, analysis, capSet, explicitInclude, explicitExclude) {
  const tierId = analysis.tier.id;
  const tierRank = TIER_RANK[tierId];
  const docMinRank = TIER_RANK[doc.minTier] ?? 3;
  const archetypeId = analysis.archetype.id;

  if (explicitExclude.has(doc.id) && !doc.alwaysInclude) {
    return {
      selected: false,
      priority: null,
      reasons: [],
      matchedCapabilities: [],
      skipReason: "Explicitly excluded via intake profile / CLI option.",
    };
  }

  const reasons = [];
  const matchedCapabilities = [];

  if (explicitInclude.has(doc.id)) {
    reasons.push("Explicitly requested via includeDocs override.");
  }

  if (doc.alwaysInclude) {
    reasons.push("Universal baseline document required for every agent-operated repository.");
  }

  // Tier baseline inclusion (for docs whose minTier is <= project tier and have no narrow capability gate,
  // OR docs that become standard at that tier).
  const isBaselineTierDoc =
    doc.triggerCapabilities.length === 0 && doc.triggerArchetypes.length === 0;
  if (!doc.alwaysInclude && isBaselineTierDoc && tierRank >= docMinRank) {
    reasons.push(`Baseline governance document for ${tierId} (${TIERS[tierId].name}) projects.`);
  }

  // Capability triggers (for T0 micro-utilities, only trigger critical surface specs, not heavy ops docs)
  const capHits = doc.triggerCapabilities.filter((c) => capSet.has(c));
  if (capHits.length > 0) {
    const isHeavyOpsOrGov = doc.layer === "operations" || doc.layer === "governance";
    const allowInT0 =
      doc.id === "cli-ux-spec" ||
      doc.id === "sdk-public-api" ||
      doc.id === "ai-agent-spec" ||
      doc.id === "data-model";

    if (tierRank === 0 && !allowInT0) {
      // Defer heavy docs in T0 unless explicitly included
    } else if (tierRank === 1 && isHeavyOpsOrGov && doc.id !== "infra-deploy" && doc.id !== "compliance-privacy" && doc.id !== "migration-plan") {
      // Keep T1 MVP lean: defer observability/runbook/monorepo unless T2+ or explicit
    } else if (tierRank === 1 && doc.id === "domain-glossary" && !capSet.has("complex-domain")) {
      // Keep T1 lean unless genuinely specialized domain jargon
    } else if (tierRank === 2 && doc.id === "domain-glossary" && !capSet.has("complex-domain")) {
      // Keep T2 lean unless genuinely specialized domain terminology is active
    } else if (tierRank === 2 && doc.id === "observability" && !capSet.has("high-throughput") && !capSet.has("background-jobs")) {
      // Defer full observability doc at T2 unless high-throughput or async worker fleet is active
    } else if (tierRank === 1 && doc.id === "conventions") {
      // Keep T1 lean; AGENTS.md holds conventions for small MVPs
    } else if (tierRank === 1 && doc.id === "adr-log" && !capSet.has("migration-legacy")) {
      // Defer ADR log to T2+ unless migrating legacy system
    } else {
      matchedCapabilities.push(...capHits);
      reasons.push(`Triggered by detected capabilities: ${capHits.join(", ")}.`);
    }
  }

  // Archetype triggers
  const archetypeHit = doc.triggerArchetypes.includes(archetypeId);
  if (archetypeHit) {
    const allowArchetypeInT0 = doc.id === "cli-ux-spec" || doc.id === "sdk-public-api";
    if (tierRank === 0 && !allowArchetypeInT0) {
      // Keep T0 ultra-minimal
    } else if (tierRank === 1 && doc.id === "infra-deploy") {
      // Defer heavy infra topology doc in T1 unless self-hosted-infra was explicitly detected
    } else if (tierRank === 1 && doc.id === "observability") {
      // Defer observability to T2+
    } else {
      reasons.push(`Core architectural contract for '${archetypeId}' archetype.`);
    }
  }

  // Tier baseline for high-value cross-cutting docs at T2+
  if (
    reasons.length === 0 &&
    tierRank >= docMinRank &&
    ["testing-strategy", "architecture", "adr-log", "security-model", "conventions", "infra-deploy"].includes(doc.id)
  ) {
    if (doc.id === "security-model" && analysis.riskLevel === "low" && tierRank < 3) {
      // Skip security model for low-risk T2 local tools
    } else if (doc.id === "infra-deploy" && ["cli-tool", "library-sdk", "browser-extension"].includes(archetypeId)) {
      // Local/package archetypes don't need cloud infra topology doc
    } else if (doc.id === "conventions" && tierRank < 2) {
      // Covered in AGENTS.md
    } else {
      reasons.push(`Recommended engineering guardrail for ${tierId} (${TIERS[tierId].name}) scale.`);
    }
  }

  if (reasons.length > 0) {
    let priority = "recommended";
    if (
      doc.alwaysInclude ||
      doc.id === "architecture" ||
      doc.id === "context-map" ||
      (doc.id === "data-model" && capSet.has("database-persistence")) ||
      (doc.id === "api-contract" && (capSet.has("public-api") || archetypeId === "api-backend")) ||
      (doc.id === "ai-agent-spec" && capSet.has("ai-llm-agents")) ||
      (doc.id === "auth-permissions" && (capSet.has("auth-rbac") || capSet.has("multi-tenant"))) ||
      (doc.id === "compliance-privacy" && capSet.has("compliance-pii")) ||
      (doc.id === "cli-ux-spec" && archetypeId === "cli-tool") ||
      (doc.id === "sdk-public-api" && archetypeId === "library-sdk")
    ) {
      priority = "critical";
    } else if (doc.loadPolicy === "task-scoped" || doc.loadPolicy === "reference") {
      priority = "conditional";
    }

    return {
      selected: true,
      priority,
      reasons,
      matchedCapabilities,
      skipReason: null,
    };
  }

  // Construct an explicit, transparent skip rationale
  let skipReason = doc.skipRationale;
  if (capHits.length > 0 && tierRank <= 1) {
    skipReason = `Deferred at ${tierId} (${TIERS[tierId].name}) to protect agent context budget; fold essential bullets into AGENTS.md or ARCHITECTURE.md until project scales to T2.`;
  } else if (doc.triggerCapabilities.length > 0) {
    skipReason = `${doc.skipRationale} (None of its trigger signals [${doc.triggerCapabilities.join(", ")}] were active for this tier.)`;
  }

  return {
    selected: false,
    priority: null,
    reasons: [],
    matchedCapabilities: [],
    skipReason,
  };
}

/**
 * Topologically sort selected documents by their dependency DAG and layer order.
 * @param {Map<string, any>} selectedMap
 * @returns {any[]}
 */
function topologicalSortDocs(selectedMap) {
  const visited = new Set();
  const visiting = new Set();
  const ordered = [];

  // Deterministic seed order: layer order -> catalog order
  const catalogOrder = new Map(DOC_CATALOG.map((d, idx) => [d.id, idx]));
  const ids = [...selectedMap.keys()].sort((a, b) => {
    const docA = DOC_BY_ID.get(a);
    const docB = DOC_BY_ID.get(b);
    const layerDiff = LAYERS[docA.layer].order - LAYERS[docB.layer].order;
    if (layerDiff !== 0) return layerDiff;
    return (catalogOrder.get(a) ?? 0) - (catalogOrder.get(b) ?? 0);
  });

  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Circular document dependency detected involving '${id}'`);
    }
    visiting.add(id);
    const entry = selectedMap.get(id);
    const deps = (entry.doc.dependsOn || []).filter((depId) => selectedMap.has(depId));
    for (const depId of deps) {
      visit(depId);
    }
    visiting.delete(id);
    visited.add(id);
    ordered.push(entry);
  }

  for (const id of ids) {
    visit(id);
  }

  return ordered;
}

/**
 * Build a complete, deterministic Markdown Architecture Blueprint from an idea or intake profile.
 *
 * @param {string | object} input Raw idea string, intake profile, or existing analysis object
 * @param {{
 *   includeDocs?: string[],
 *   excludeDocs?: string[],
 *   shims?: string[],
 *   docsDir?: string
 * }} [options]
 */
export function planArchitecture(input, options = {}) {
  const isAnalysis =
    Boolean(input) &&
    typeof input.archetype === "object" &&
    input.archetype !== null &&
    typeof input.tier === "object" &&
    input.tier !== null &&
    typeof input.archetype.id === "string" &&
    typeof input.tier.id === "string";
  const analysis = isAnalysis ? input : analyzeProject(input);
  const capSet = new Set(analysis.capabilities.map((c) => c.id));

  const explicitInclude = new Set([
    ...(Array.isArray(options.includeDocs) ? options.includeDocs : []),
    ...(Array.isArray(input?.includeDocs) ? input.includeDocs : []),
  ]);
  const explicitExclude = new Set([
    ...(Array.isArray(options.excludeDocs) ? options.excludeDocs : []),
    ...(Array.isArray(input?.excludeDocs) ? input.excludeDocs : []),
  ]);

  const docsDir = (options.docsDir || "docs").replace(/^\/+|\/+$/g, "");

  /** @type {Map<string, { doc: typeof DOC_CATALOG[number], priority: string, reasons: string[], matchedCapabilities: string[] }>} */
  const selectedMap = new Map();
  const excludedList = [];

  for (const doc of DOC_CATALOG) {
    const verdict = evaluateDocSelection(doc, analysis, capSet, explicitInclude, explicitExclude);
    if (verdict.selected) {
      selectedMap.set(doc.id, {
        doc,
        priority: verdict.priority,
        reasons: verdict.reasons,
        matchedCapabilities: verdict.matchedCapabilities,
      });
    } else {
      excludedList.push({
        id: doc.id,
        title: doc.title,
        path: doc.path,
        layer: doc.layer,
        skipReason: verdict.skipReason,
      });
    }
  }

  // Ensure transitive dependency closure: if a selected doc depends on `architecture` (or another doc),
  // ensure essential structural parents are present (while skipping optional domain parents like data-model if stateless).
  let addedDependency = true;
  while (addedDependency) {
    addedDependency = false;
    for (const [id, entry] of [...selectedMap.entries()]) {
      for (const depId of entry.doc.dependsOn) {
        if (!selectedMap.has(depId) && !explicitExclude.has(depId)) {
          // Only force-pull foundational structural dependencies (`agents-entry`, `prd`, `architecture`).
          if (["agents-entry", "prd", "architecture"].includes(depId)) {
            const depDoc = DOC_BY_ID.get(depId);
            if (depDoc) {
              selectedMap.set(depId, {
                doc: depDoc,
                priority: "critical",
                reasons: [`Required upstream architectural dependency for '${id}'.`],
                matchedCapabilities: [],
              });
              // Remove from excludedList
              const exIdx = excludedList.findIndex((e) => e.id === depId);
              if (exIdx !== -1) excludedList.splice(exIdx, 1);
              addedDependency = true;
            }
          }
        }
      }
    }
  }

  // Topological sort for deterministic authoring & reading order
  const sortedEntries = topologicalSortDocs(selectedMap);

  const documents = sortedEntries.map((entry, idx) => {
    const { doc, priority, reasons, matchedCapabilities } = entry;
    const resolvedPath =
      doc.path === "AGENTS.md"
        ? "AGENTS.md"
        : doc.path.replace(/^docs\//, `${docsDir}/`);

    const activeDependencies = (doc.dependsOn || []).filter((depId) => selectedMap.has(depId));

    return {
      order: idx + 1,
      id: doc.id,
      title: doc.title,
      path: resolvedPath,
      layer: doc.layer,
      layerLabel: LAYERS[doc.layer].label,
      priority,
      loadPolicy: doc.loadPolicy,
      tokenBudget: { ...doc.tokenBudget },
      dependsOn: activeDependencies,
      authority: doc.authority,
      whyRequired: doc.whyRequired,
      failureModePrevented: doc.failureModePrevented,
      selectionReasons: reasons,
      matchedCapabilities,
      readTriggers: [...doc.readTriggers],
      updateTriggers: [...doc.updateTriggers],
      sections: doc.sections.map((s) => ({ ...s })),
    };
  });

  // Compute summary metrics and token ledger
  const byLoadPolicy = { always: 0, "on-demand": 0, "task-scoped": 0, reference: 0 };
  const byLayer = {};
  const byPriority = { critical: 0, recommended: 0, conditional: 0 };

  let totalTargetTokens = 0;
  let totalMaxTokens = 0;
  let alwaysOnTargetTokens = 0;
  let alwaysOnMaxTokens = 0;

  for (const d of documents) {
    byLoadPolicy[d.loadPolicy] = (byLoadPolicy[d.loadPolicy] || 0) + 1;
    byLayer[d.layer] = (byLayer[d.layer] || 0) + 1;
    byPriority[d.priority] = (byPriority[d.priority] || 0) + 1;

    totalTargetTokens += d.tokenBudget.target;
    totalMaxTokens += d.tokenBudget.max;
    if (d.loadPolicy === "always") {
      alwaysOnTargetTokens += d.tokenBudget.target;
      alwaysOnMaxTokens += d.tokenBudget.max;
    }
  }

  const tierMeta = TIERS[analysis.tier.id];

  // Authoring phases for agent step-by-step execution
  const authoringPhases = [
    {
      phase: 1,
      name: "Bootstrap & Product Contract",
      description: "Lock project identity, scope, explicit Non-Goals, and context routing.",
      docIds: documents
        .filter((d) => d.layer === "bootstrap" || d.layer === "product")
        .map((d) => d.id),
    },
    {
      phase: 2,
      name: "System & Interface Contracts",
      description: "Lock module boundaries, schemas, API/CLI/SDK/UI/AI interfaces, and state workflows.",
      docIds: documents.filter((d) => d.layer === "system").map((d) => d.id),
    },
    {
      phase: 3,
      name: "Engineering Guardrails & Security",
      description: "Lock auth/RBAC matrices, threat mitigations, testing strategy, conventions, and ADRs.",
      docIds: documents.filter((d) => d.layer === "engineering").map((d) => d.id),
    },
    {
      phase: 4,
      name: "Operations & Compliance",
      description: "Lock local runbooks, CI/CD deployment topology, observability, migrations, and compliance.",
      docIds: documents
        .filter((d) => d.layer === "operations" || d.layer === "governance")
        .map((d) => d.id),
    },
  ].filter((p) => p.docIds.length > 0);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    project: {
      name: analysis.projectName,
      slug: analysis.projectSlug,
      idea: analysis.idea,
      archetype: analysis.archetype,
      tier: analysis.tier,
      riskLevel: analysis.riskLevel,
      capabilities: analysis.capabilities,
      stack: analysis.stack,
      constraints: analysis.constraints,
    },
    summary: {
      totalDocuments: documents.length,
      excludedDocuments: excludedList.length,
      recommendedRangeForTier: tierMeta.recommendedDocRange,
      byLoadPolicy,
      byLayer,
      byPriority,
      tokenLedger: {
        alwaysOnTargetTokens,
        alwaysOnMaxTokens,
        alwaysOnTierLimit: tierMeta.alwaysOnTokenLimit,
        totalTargetTokens,
        totalMaxTokens,
        tierTokenEnvelope: tierMeta.totalTokenEnvelope,
        alwaysOnWithinLimit: alwaysOnTargetTokens <= tierMeta.alwaysOnTokenLimit,
      },
    },
    whyThisStructure: {
      headline: `${documents.length} targeted Markdown documents (${byLoadPolicy.always} always-on, ${documents.length - byLoadPolicy.always} progressive-disclosure) tailored for a ${analysis.tier.id} ${analysis.archetype.label}.`,
      contextEngineeringPrinciple:
        "Only AGENTS.md is loaded every turn (~" +
        alwaysOnTargetTokens +
        " tokens). All remaining " +
        (documents.length - byLoadPolicy.always) +
        " documents use progressive disclosure via explicit read triggers, protecting the agent context window from bloat while preventing architectural hallucinations.",
      antiBloatGuard: `${excludedList.length} catalog archetypes were intentionally omitted because their failure modes do not apply to this project's current scope and tier.`,
    },
    authoringPhases,
    documents,
    excludedDocuments: excludedList,
    ambiguities: analysis.ambiguities,
    needsDiscovery: analysis.needsDiscovery,
  };
}
