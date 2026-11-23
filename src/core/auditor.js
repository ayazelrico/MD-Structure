/**
 * Workspace Auditor & DAG Authoring Navigator.
 *
 * Audits an MD-Structure workspace for:
 * - Missing manifest or missing declared documents
 * - Frontmatter schema validity
 * - Unresolved `<!-- AGENT:FILL ... -->` directives and TBD/TODO stubs
 * - Context window token budget compliance (and AGENTS.md always-on bloat)
 * - AGENTS.md routing table synchronization
 * - Broken relative Markdown links
 * - Orphaned untracked Markdown files in docs/
 *
 * Also computes the exact next document an agent should author in strict DAG order.
 */

import fs from "node:fs";
import path from "node:path";
import { MANIFEST_FILENAME, TIERS } from "./constants.js";
import { estimateTokens, evaluateTokenBudget } from "./tokens.js";

/**
 * Strip surrounding YAML quotes if present.
 * @param {string} raw
 * @returns {string}
 */
function unquote(raw) {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    try {
      if (s.startsWith('"')) return JSON.parse(s);
      return s.slice(1, -1);
    } catch {
      return s.slice(1, -1);
    }
  }
  return s;
}

/**
 * Lightweight deterministic YAML frontmatter parser tailored for MD-Structure headers.
 * @param {string} content
 * @returns {{ hasFrontmatter: boolean, data: Record<string, any>, body: string }}
 */
export function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { hasFrontmatter: false, data: {}, body: normalized };
  }
  const endIdx = normalized.indexOf("\n---\n", 4);
  const altEndIdx = endIdx === -1 && normalized.endsWith("\n---") ? normalized.length - 4 : endIdx;
  if (altEndIdx === -1) {
    return { hasFrontmatter: false, data: {}, body: normalized };
  }

  const rawYaml = normalized.slice(4, altEndIdx);
  const body = normalized.slice(altEndIdx + 5);
  const lines = rawYaml.split("\n");

  const data = {};
  let currentKey = null;
  let currentMode = null; // "array" | "object"

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    // Nested list item: "  - value"
    const listMatch = line.match(/^\s+-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(unquote(listMatch[1]));
      currentMode = "array";
      continue;
    }

    // Nested object entry: "  key: value"
    const nestedObjMatch = line.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (nestedObjMatch && currentKey && currentMode !== "array") {
      if (typeof data[currentKey] !== "object" || Array.isArray(data[currentKey]) || data[currentKey] === null) {
        data[currentKey] = {};
      }
      const nKey = nestedObjMatch[1];
      const nValRaw = nestedObjMatch[2].trim();
      const num = Number(nValRaw);
      data[currentKey][nKey] = nValRaw !== "" && !Number.isNaN(num) ? num : unquote(nValRaw);
      currentMode = "object";
      continue;
    }

    // Top-level key: value
    const topMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (topMatch) {
      const key = topMatch[1];
      const valRaw = topMatch[2].trim();
      currentKey = key;
      if (valRaw === "") {
        data[key] = null;
        currentMode = null;
      } else if (valRaw === "[]") {
        data[key] = [];
        currentMode = "array";
      } else if (valRaw === "true" || valRaw === "false") {
        data[key] = valRaw === "true";
        currentMode = null;
      } else if (!Number.isNaN(Number(valRaw)) && valRaw !== "") {
        data[key] = Number(valRaw);
        currentMode = null;
      } else {
        data[key] = unquote(valRaw);
        currentMode = null;
      }
    }
  }

  return { hasFrontmatter: true, data, body };
}

/**
 * Find all `<!-- AGENT:FILL ... -->` directives in content.
 * @param {string} content
 * @returns {string[]}
 */
export function extractAgentFillDirectives(content) {
  const matches = [];
  const rx = /<!--\s*AGENT:FILL\s*([\s\S]*?)-->/gi;
  let m;
  while ((m = rx.exec(content)) !== null) {
    matches.push(m[1].trim().replace(/\s+/g, " ").slice(0, 120));
  }
  return matches;
}

/**
 * Find unresolved TBD/TODO/FIXME markers outside code blocks.
 * @param {string} body
 * @returns {string[]}
 */
function findPlaceholderMarkers(body) {
  // Strip fenced code blocks before scanning
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  const matches = stripped.match(/\b(TBD|TODO|FIXME|PLACEHOLDER|LOREM IPSUM)\b/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extract relative Markdown links `[label](target)` outside code fences.
 * @param {string} body
 * @returns {string[]}
 */
function extractRelativeMarkdownLinks(body) {
  const stripped = body.replace(/```[\s\S]*?```/g, "");
  const links = [];
  const rx = /\[[^\]]+\]\(([^)]+)\)/g;
  let m;
  while ((m = rx.exec(stripped)) !== null) {
    const rawTarget = m[1].trim().split("#")[0].trim();
    if (
      rawTarget &&
      !rawTarget.startsWith("http://") &&
      !rawTarget.startsWith("https://") &&
      !rawTarget.startsWith("mailto:") &&
      !rawTarget.startsWith("#")
    ) {
      links.push(rawTarget);
    }
  }
  return links;
}

/**
 * Recursively list `.md` files inside a directory.
 * @param {string} dir
 * @param {string} rootDir
 * @returns {string[]}
 */
function listMarkdownFiles(dir, rootDir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listMarkdownFiles(full, rootDir));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(path.relative(rootDir, full).replace(/\\/g, "/"));
    }
  }
  return results;
}

/**
 * Load and parse `md-structure.manifest.json` from a workspace directory.
 * @param {string} workspaceDir
 */
export function loadManifest(workspaceDir) {
  const absDir = path.resolve(workspaceDir);
  const manifestPath = path.join(absDir, MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  const raw = fs.readFileSync(manifestPath, "utf8");
  return JSON.parse(raw);
}

/**
 * Audit a workspace managed by MD-Structure.
 * @param {string} workspaceDir
 */
export function auditWorkspace(workspaceDir) {
  const absDir = path.resolve(workspaceDir);
  const manifest = loadManifest(absDir);

  if (!manifest) {
    return {
      workspaceDir: absDir,
      hasManifest: false,
      readinessScore: 0,
      readyForImplementation: false,
      status: "uninitialized",
      summary: {
        totalDeclared: 0,
        existing: 0,
        approved: 0,
        draft: 0,
        missing: 0,
        totalOpenDirectives: 0,
        totalTokens: 0,
        alwaysOnTokens: 0,
        errorCount: 1,
        warningCount: 0,
      },
      documents: [],
      issues: [
        {
          severity: "error",
          code: "MISSING_MANIFEST",
          path: MANIFEST_FILENAME,
          message: `No ${MANIFEST_FILENAME} found in ${absDir}. Run 'md-structure init "<idea>" --out .' first.`,
        },
      ],
      remediationPlan: [
        "Initialize the architectural structure using `md-structure init \"<project idea>\" --out .`.",
      ],
    };
  }

  const issues = [];
  const docReports = [];
  const declaredPaths = new Set();

  let existingCount = 0;
  let approvedCount = 0;
  let draftCount = 0;
  let missingCount = 0;
  let totalOpenDirectives = 0;
  let totalTokens = 0;
  let alwaysOnTokens = 0;
  let agentsContent = "";

  for (const decl of manifest.documents || []) {
    declaredPaths.add(decl.path);
    const fullPath = path.join(absDir, decl.path);
    const exists = fs.existsSync(fullPath);

    if (!exists) {
      missingCount++;
      issues.push({
        severity: "error",
        code: "MISSING_DOCUMENT",
        docId: decl.id,
        path: decl.path,
        message: `Declared document '${decl.path}' (${decl.id}) is missing from disk.`,
      });
      docReports.push({
        id: decl.id,
        path: decl.path,
        exists: false,
        status: "missing",
        tokens: 0,
        tokenBudget: decl.tokenBudget,
        budgetStatus: "missing",
        openDirectives: 0,
        openDirectiveSamples: [],
      });
      continue;
    }

    existingCount++;
    const content = fs.readFileSync(fullPath, "utf8");
    if (decl.id === "agents-entry") {
      agentsContent = content;
    }

    const parsed = parseFrontmatter(content);
    const tokens = estimateTokens(content);
    totalTokens += tokens;
    if (decl.loadPolicy === "always") {
      alwaysOnTokens += tokens;
    }

    const directives = extractAgentFillDirectives(content);
    totalOpenDirectives += directives.length;
    const placeholders = findPlaceholderMarkers(parsed.body);
    const budgetEval = evaluateTokenBudget(tokens, decl.tokenBudget);
    const docStatus = parsed.data.status || "unknown";

    if (docStatus === "approved") approvedCount++;
    else draftCount++;

    // Frontmatter validation
    if (!parsed.hasFrontmatter) {
      issues.push({
        severity: "error",
        code: "MISSING_FRONTMATTER",
        docId: decl.id,
        path: decl.path,
        message: `Document '${decl.path}' is missing YAML frontmatter metadata.`,
      });
    } else {
      const requiredFields = ["id", "title", "status", "load_policy", "authority"];
      for (const field of requiredFields) {
        if (!parsed.data[field]) {
          issues.push({
            severity: "warning",
            code: "MISSING_FRONTMATTER_FIELD",
            docId: decl.id,
            path: decl.path,
            message: `Frontmatter in '${decl.path}' is missing required field '${field}'.`,
          });
        }
      }
      if (parsed.data.id && parsed.data.id !== decl.id) {
        issues.push({
          severity: "warning",
          code: "FRONTMATTER_ID_MISMATCH",
          docId: decl.id,
          path: decl.path,
          message: `Frontmatter id '${parsed.data.id}' does not match manifest id '${decl.id}'.`,
        });
      }
    }

    // Directives & placeholders
    if (directives.length > 0) {
      issues.push({
        severity: docStatus === "approved" ? "error" : "warning",
        code: "UNRESOLVED_AGENT_DIRECTIVES",
        docId: decl.id,
        path: decl.path,
        message: `'${decl.path}' still contains ${directives.length} unresolved <!-- AGENT:FILL --> directive(s).`,
      });
    }

    if (placeholders.length > 0) {
      issues.push({
        severity: docStatus === "approved" ? "error" : "warning",
        code: "UNRESOLVED_PLACEHOLDERS",
        docId: decl.id,
        path: decl.path,
        message: `'${decl.path}' contains placeholder marker(s): ${placeholders.join(", ")}.`,
      });
    }

    // Budget checks
    if (budgetEval.status === "over") {
      issues.push({
        severity: decl.loadPolicy === "always" ? "error" : "warning",
        code: "TOKEN_BUDGET_EXCEEDED",
        docId: decl.id,
        path: decl.path,
        message: `'${decl.path}': ${budgetEval.message}`,
      });
    } else if (budgetEval.status === "under" && docStatus === "approved") {
      issues.push({
        severity: "warning",
        code: "UNDER_SPECIFIED_DOC",
        docId: decl.id,
        path: decl.path,
        message: `'${decl.path}': ${budgetEval.message}`,
      });
    }

    // Check internal relative Markdown links
    const relLinks = extractRelativeMarkdownLinks(parsed.body);
    const docDir = path.dirname(fullPath);
    for (const target of relLinks) {
      const resolvedLink = path.resolve(docDir, target);
      if (!fs.existsSync(resolvedLink)) {
        issues.push({
          severity: "error",
          code: "BROKEN_LINK",
          docId: decl.id,
          path: decl.path,
          message: `Broken relative link '${target}' inside '${decl.path}'.`,
        });
      }
    }

    docReports.push({
      id: decl.id,
      path: decl.path,
      exists: true,
      status: docStatus,
      tokens,
      tokenBudget: decl.tokenBudget,
      budgetStatus: budgetEval.status,
      openDirectives: directives.length,
      openDirectiveSamples: directives.slice(0, 3),
    });
  }

  // Verify AGENTS.md routing table covers every active non-root doc
  if (agentsContent) {
    for (const decl of manifest.documents || []) {
      if (decl.id === "agents-entry") continue;
      if (!agentsContent.includes(decl.path)) {
        issues.push({
          severity: "warning",
          code: "MISSING_AGENTS_ROUTE",
          docId: decl.id,
          path: "AGENTS.md",
          message: `AGENTS.md routing table does not reference active document '${decl.path}'.`,
        });
      }
    }

    const tierId = manifest.project?.tier || "T2";
    const tierLimit = TIERS[tierId]?.alwaysOnTokenLimit || 1400;
    if (alwaysOnTokens > tierLimit) {
      issues.push({
        severity: "error",
        code: "ALWAYS_ON_BLOAT",
        docId: "agents-entry",
        path: "AGENTS.md",
        message: `Always-on context footprint (${alwaysOnTokens} tokens) exceeds ${tierId} ceiling (${tierLimit} tokens). Move deep detail into on-demand docs/.`,
      });
    }
  }

  // Detect orphaned `.md` files inside docsDir
  const docsDirName = manifest.docsDir || "docs";
  const docsAbs = path.join(absDir, docsDirName);
  const diskDocs = listMarkdownFiles(docsAbs, absDir);
  for (const relDoc of diskDocs) {
    if (!declaredPaths.has(relDoc)) {
      issues.push({
        severity: "warning",
        code: "ORPHANED_DOCUMENT",
        path: relDoc,
        message: `Markdown file '${relDoc}' exists in ${docsDirName}/ but is not registered in ${MANIFEST_FILENAME} or AGENTS.md.`,
      });
    }
  }

  // Compute deterministic readiness score (0 - 100)
  const totalDeclared = (manifest.documents || []).length;
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  let score = 100;
  // Penalize missing docs heavily
  score -= missingCount * 20;
  // Penalize unapproved drafts
  if (totalDeclared > 0) {
    const draftRatio = draftCount / totalDeclared;
    score -= Math.round(draftRatio * 35);
  }
  // Penalize errors and warnings
  score -= errorCount * 10;
  score -= Math.min(25, warningCount * 3);
  score = Math.max(0, Math.min(100, score));

  const readyForImplementation =
    errorCount === 0 &&
    missingCount === 0 &&
    totalOpenDirectives === 0 &&
    approvedCount === totalDeclared &&
    totalDeclared > 0;

  let status = "ready";
  if (missingCount > 0 || errorCount > 0) status = "failing";
  else if (!readyForImplementation) status = "in-progress";

  // Build concise, prioritized remediation steps for the agent
  const remediationPlan = [];
  if (missingCount > 0) {
    remediationPlan.push(
      `Restore ${missingCount} missing document(s) or remove them from ${MANIFEST_FILENAME}.`
    );
  }
  if (draftCount > 0 || totalOpenDirectives > 0) {
    remediationPlan.push(
      `Run 'md-structure next --dir . --json' and complete all ${totalOpenDirectives} remaining <!-- AGENT:FILL --> directive(s) across ${draftCount} draft document(s), then mark each 'status: approved'.`
    );
  }
  if (issues.some((i) => i.code === "TOKEN_BUDGET_EXCEEDED" || i.code === "ALWAYS_ON_BLOAT")) {
    remediationPlan.push(
      "Compress verbose prose into concise Markdown tables to bring over-budget files back within their token_budget.max ceiling."
    );
  }
  if (issues.some((i) => i.code === "BROKEN_LINK")) {
    remediationPlan.push("Fix all broken relative Markdown links reported in issues.");
  }
  if (issues.some((i) => i.code === "MISSING_AGENTS_ROUTE")) {
    remediationPlan.push("Add missing active documents to the Document Routing Map in AGENTS.md.");
  }
  if (issues.some((i) => i.code === "ORPHANED_DOCUMENT")) {
    remediationPlan.push("Register orphaned docs/ files in the manifest & AGENTS.md, or delete redundant duplicates.");
  }
  if (remediationPlan.length === 0) {
    remediationPlan.push("Architecture documentation passes all governance gates. Proceed to implementation.");
  }

  return {
    workspaceDir: absDir,
    hasManifest: true,
    project: manifest.project,
    readinessScore: score,
    readyForImplementation,
    status,
    summary: {
      totalDeclared,
      existing: existingCount,
      approved: approvedCount,
      draft: draftCount,
      missing: missingCount,
      totalOpenDirectives,
      totalTokens,
      alwaysOnTokens,
      errorCount,
      warningCount,
    },
    documents: docReports,
    issues,
    remediationPlan,
  };
}

/**
 * Return the next single document an agent should author/finalize in strict DAG order.
 * @param {string} workspaceDir
 */
export function getNextDocumentToAuthor(workspaceDir) {
  const absDir = path.resolve(workspaceDir);
  const manifest = loadManifest(absDir);
  if (!manifest) {
    throw new Error(`No ${MANIFEST_FILENAME} found in ${absDir}. Initialize the workspace first.`);
  }

  const audit = auditWorkspace(absDir);
  const reportById = new Map(audit.documents.map((d) => [d.id, d]));
  const declById = new Map((manifest.documents || []).map((d) => [d.id, d]));

  const pending = [];
  let completedCount = 0;

  for (const decl of manifest.documents || []) {
    const rep = reportById.get(decl.id);
    const isDone = rep && rep.exists && rep.status === "approved" && rep.openDirectives === 0;
    if (isDone) {
      completedCount++;
    } else {
      pending.push({ decl, rep });
    }
  }

  const total = (manifest.documents || []).length;
  const percent = total === 0 ? 100 : Math.round((completedCount / total) * 100);

  if (pending.length === 0) {
    return {
      workspaceDir: absDir,
      completed: true,
      progress: { completed: completedCount, total, percent },
      next: null,
      remainingQueue: [],
      message: "All Markdown architectural documents are finalized and approved. Run 'md-structure audit --json' before coding.",
    };
  }

  // Pick the first pending document whose upstream dependencies are already done (or first in DAG order)
  let chosen = pending[0];
  for (const candidate of pending) {
    const depsDone = (candidate.decl.dependsOn || []).every((depId) => {
      const depRep = reportById.get(depId);
      return depRep && depRep.exists && depRep.status === "approved" && depRep.openDirectives === 0;
    });
    if (depsDone) {
      chosen = candidate;
      break;
    }
  }

  const upstreamToReadFirst = (chosen.decl.dependsOn || [])
    .map((depId) => declById.get(depId))
    .filter(Boolean)
    .map((d) => ({ id: d.id, path: d.path, authority: d.authority }));

  const openDirectives = chosen.rep ? chosen.rep.openDirectiveSamples : [];

  return {
    workspaceDir: absDir,
    completed: false,
    progress: { completed: completedCount, total, percent },
    next: {
      order: chosen.decl.order,
      id: chosen.decl.id,
      title: chosen.decl.title,
      path: chosen.decl.path,
      layer: chosen.decl.layer,
      status: chosen.rep ? chosen.rep.status : "missing",
      authority: chosen.decl.authority,
      tokenBudget: chosen.decl.tokenBudget,
      currentTokens: chosen.rep ? chosen.rep.tokens : 0,
      openDirectivesCount: chosen.rep ? chosen.rep.openDirectives : 0,
      openDirectiveSamples: openDirectives,
      upstreamToReadFirst,
      agentInstructions: [
        upstreamToReadFirst.length > 0
          ? `Read upstream dependency file(s) first: ${upstreamToReadFirst.map((u) => u.path).join(", ")}.`
          : "No upstream documents required; begin directly with this document.",
        `Open '${chosen.decl.path}' and replace all <!-- AGENT:FILL ... --> directives with concrete, table-driven decisions.`,
        `Keep total size within ${chosen.decl.tokenBudget.target} target / ${chosen.decl.tokenBudget.max} max tokens.`,
        `Update YAML frontmatter 'status: draft' -> 'status: approved' when complete, then call 'md-structure next --json' again.`,
      ],
    },
    remainingQueue: pending.map((p) => ({
      id: p.decl.id,
      path: p.decl.path,
      openDirectives: p.rep ? p.rep.openDirectives : 0,
    })),
  };
}
