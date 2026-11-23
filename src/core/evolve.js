/**
 * Workspace Evolution & Anti-Drift Synchronization Engine.
 *
 * Allows AI agents to safely evolve an existing MD-Structure workspace as a project grows:
 * - `addDocumentToWorkspace`: Adds a canonical catalog MD, registers it in the manifest in DAG order,
 *   updates AGENTS.md's Document Routing Map without overwriting user-authored sections, and refreshes 00-CONTEXT-MAP.md.
 * - `syncWorkspace`: Synchronizes AGENTS.md routing table and 00-CONTEXT-MAP.md with md-structure.manifest.json.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadManifest } from "./auditor.js";
import { getCatalogDoc } from "./catalog.js";
import { MANIFEST_FILENAME } from "./constants.js";
import { planArchitecture } from "./planner.js";
import { renderDocument } from "./templates.js";
import { estimateTokens } from "./tokens.js";

function sha256Short(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}

/**
 * Build the Markdown Document Routing Map table for AGENTS.md.
 * @param {Array<object>} documents
 */
function buildRoutingTable(documents) {
  const header = [
    "| Document | Load Policy | Target Budget | Source-of-Truth Authority | Primary Read Trigger |",
    "| :--- | :--- | :--- | :--- | :--- |",
  ];
  const rows = documents
    .filter((d) => d.id !== "agents-entry")
    .map((d) => {
      const trigger = (d.readTriggers && d.readTriggers[0]) || "When touching this domain";
      return `| [${d.path}](./${d.path}) | \`${d.loadPolicy}\` | ${d.tokenBudget.target}t | ${d.authority} | ${trigger} |`;
    });
  return [...header, ...rows].join("\n");
}

/**
 * Surgically replace the Document Routing Map table inside AGENTS.md while preserving
 * all custom user/agent edits in every other section.
 * @param {string} agentsContent
 * @param {Array<object>} documents
 * @returns {{ updated: boolean, content: string }}
 */
function patchAgentsRoutingTable(agentsContent, documents) {
  const table = buildRoutingTable(documents);
  // Match from the table header through consecutive pipe-prefixed lines
  const rx = /\| Document \| Load Policy \| Target Budget \| Source-of-Truth Authority \| Primary Read Trigger \|\n\| :--- \| :--- \| :--- \| :--- \| :--- \|\n(?:\|.*\|\n?)*/m;
  if (rx.test(agentsContent)) {
    const nextContent = agentsContent.replace(rx, table + "\n");
    return { updated: nextContent !== agentsContent, content: nextContent };
  }

  // Fallback: insert under Section 2 if heading exists
  const sec2Rx = /(## 2\. Document Routing Map[^\n]*\n[\s\S]*?)(\n## 3\.)/;
  if (sec2Rx.test(agentsContent)) {
    const nextContent = agentsContent.replace(
      sec2Rx,
      `## 2. Document Routing Map (Progressive Disclosure)\n\nLoad **only** the documents whose read trigger matches your current task:\n\n${table}\n$2`
    );
    return { updated: nextContent !== agentsContent, content: nextContent };
  }

  return { updated: false, content: agentsContent };
}

/**
 * Add a canonical catalog document to an existing MD-Structure workspace.
 *
 * @param {string} workspaceDir
 * @param {string} docId
 * @param {{ dryRun?: boolean, force?: boolean }} [options]
 */
export function addDocumentToWorkspace(workspaceDir, docId, options = {}) {
  const absDir = path.resolve(workspaceDir);
  const manifest = loadManifest(absDir);
  if (!manifest) {
    throw new Error(`No ${MANIFEST_FILENAME} found in ${absDir}. Initialize the workspace first.`);
  }

  const catalogDoc = getCatalogDoc(docId);
  if (!catalogDoc) {
    throw new Error(`Unknown catalog document ID '${docId}'. Run 'md-structure catalog' for valid IDs.`);
  }

  const existingIds = (manifest.documents || []).map((d) => d.id);
  const alreadyIncluded = existingIds.includes(docId);
  if (alreadyIncluded && !options.force) {
    return {
      workspaceDir: absDir,
      added: false,
      docId,
      path: manifest.documents.find((d) => d.id === docId)?.path,
      message: `Document '${docId}' is already registered in ${MANIFEST_FILENAME}. Use --force to regenerate its template.`,
    };
  }

  const dryRun = Boolean(options.dryRun);
  const docsDir = manifest.docsDir || "docs";

  // Rebuild deterministic blueprint including all currently active docs + the new docId
  const targetIncludeIds = [...new Set([...existingIds, docId])];
  const blueprint = planArchitecture(
    {
      name: manifest.project.name,
      idea: manifest.project.idea,
      archetype: manifest.project.archetype,
      tier: manifest.project.tier,
      riskLevel: manifest.project.riskLevel,
      capabilities: manifest.project.capabilities || [],
      stack: manifest.project.stack || [],
    },
    {
      includeDocs: targetIncludeIds,
      docsDir,
    }
  );

  // Filter blueprint documents strictly to existing + newly added (+ required structural parents)
  const newDoc = blueprint.documents.find((d) => d.id === docId);
  if (!newDoc) {
    throw new Error(`Failed to resolve '${docId}' in rebuilt blueprint.`);
  }

  const addedDocs = blueprint.documents.filter(
    (d) => !existingIds.includes(d.id) || (d.id === docId && options.force)
  );

  const writtenFiles = [];
  for (const d of addedDocs) {
    const content = renderDocument(blueprint, d);
    const fullPath = path.join(absDir, d.path);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, "utf8");
    }
    writtenFiles.push({
      id: d.id,
      path: d.path,
      estimatedTokens: estimateTokens(content),
      action: alreadyIncluded ? "regenerated" : "created",
    });
  }

  // Update AGENTS.md routing table non-destructively
  let agentsPatched = false;
  const agentsPath = path.join(absDir, "AGENTS.md");
  if (fs.existsSync(agentsPath)) {
    const existingAgents = fs.readFileSync(agentsPath, "utf8");
    const patched = patchAgentsRoutingTable(existingAgents, blueprint.documents);
    if (patched.updated) {
      agentsPatched = true;
      if (!dryRun) {
        fs.writeFileSync(agentsPath, patched.content, "utf8");
      }
    }
  }

  // Refresh docs/00-CONTEXT-MAP.md if active
  let contextMapRefreshed = false;
  const ctxDoc = blueprint.documents.find((d) => d.id === "context-map");
  if (ctxDoc) {
    const ctxPath = path.join(absDir, ctxDoc.path);
    const ctxContent = renderDocument(blueprint, ctxDoc);
    contextMapRefreshed = true;
    if (!dryRun) {
      fs.mkdirSync(path.dirname(ctxPath), { recursive: true });
      fs.writeFileSync(ctxPath, ctxContent, "utf8");
    }
  }

  // Update manifest lockfile
  const updatedManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
    summary: blueprint.summary,
    documents: blueprint.documents.map((d) => {
      const existingDecl = (manifest.documents || []).find((x) => x.id === d.id);
      const fullPath = path.join(absDir, d.path);
      const checksum =
        !dryRun && fs.existsSync(fullPath)
          ? sha256Short(fs.readFileSync(fullPath, "utf8"))
          : existingDecl?.initialChecksum || null;

      return {
        order: d.order,
        id: d.id,
        title: d.title,
        path: d.path,
        layer: d.layer,
        priority: d.priority,
        loadPolicy: d.loadPolicy,
        tokenBudget: d.tokenBudget,
        dependsOn: d.dependsOn,
        authority: d.authority,
        selectionReasons: d.selectionReasons,
        initialChecksum: existingDecl?.initialChecksum || checksum,
      };
    }),
    excludedDocuments: blueprint.excludedDocuments,
  };

  if (!dryRun) {
    fs.writeFileSync(
      path.join(absDir, MANIFEST_FILENAME),
      JSON.stringify(updatedManifest, null, 2) + "\n",
      "utf8"
    );
  }

  return {
    workspaceDir: absDir,
    dryRun,
    added: true,
    docId,
    writtenFiles,
    agentsRoutingPatched: agentsPatched,
    contextMapRefreshed,
    totalDocuments: updatedManifest.documents.length,
    nextAction: dryRun
      ? "Dry run completed. Re-run without --dry-run to apply."
      : `Added '${docId}'. Run 'md-structure next --dir "${absDir}" --json' to fill and approve the new document.`,
  };
}

/**
 * Synchronize AGENTS.md routing table and docs/00-CONTEXT-MAP.md against md-structure.manifest.json
 * without overwriting authored domain documents.
 *
 * @param {string} workspaceDir
 * @param {{ dryRun?: boolean }} [options]
 */
export function syncWorkspace(workspaceDir, options = {}) {
  const absDir = path.resolve(workspaceDir);
  const manifest = loadManifest(absDir);
  if (!manifest) {
    throw new Error(`No ${MANIFEST_FILENAME} found in ${absDir}. Initialize the workspace first.`);
  }

  const dryRun = Boolean(options.dryRun);
  const enrichedDocs = (manifest.documents || []).map((decl) => {
    const cat = getCatalogDoc(decl.id);
    return {
      ...decl,
      readTriggers: cat ? cat.readTriggers : ["When touching this domain"],
      updateTriggers: cat ? cat.updateTriggers : [],
      whyRequired: cat ? cat.whyRequired : decl.authority,
      failureModePrevented: cat ? cat.failureModePrevented : "",
      sections: cat ? cat.sections : [],
    };
  });

  const changes = [];

  // 1. Sync AGENTS.md routing table
  const agentsPath = path.join(absDir, "AGENTS.md");
  if (fs.existsSync(agentsPath)) {
    const current = fs.readFileSync(agentsPath, "utf8");
    const patched = patchAgentsRoutingTable(current, enrichedDocs);
    if (patched.updated) {
      if (!dryRun) fs.writeFileSync(agentsPath, patched.content, "utf8");
      changes.push({ path: "AGENTS.md", action: "routing-table-synced" });
    }
  }

  // 2. Refresh 00-CONTEXT-MAP.md if declared
  const ctxDecl = enrichedDocs.find((d) => d.id === "context-map");
  if (ctxDecl) {
    const blueprint = planArchitecture(
      {
        name: manifest.project.name,
        idea: manifest.project.idea,
        archetype: manifest.project.archetype,
        tier: manifest.project.tier,
        riskLevel: manifest.project.riskLevel,
        capabilities: manifest.project.capabilities || [],
        stack: manifest.project.stack || [],
      },
      {
        includeDocs: enrichedDocs.map((d) => d.id),
        docsDir: manifest.docsDir || "docs",
      }
    );
    const ctxDoc = blueprint.documents.find((d) => d.id === "context-map");
    if (ctxDoc) {
      const ctxPath = path.join(absDir, ctxDoc.path);
      const nextCtx = renderDocument(blueprint, ctxDoc);
      const existingCtx = fs.existsSync(ctxPath) ? fs.readFileSync(ctxPath, "utf8") : "";
      if (nextCtx !== existingCtx) {
        if (!dryRun) {
          fs.mkdirSync(path.dirname(ctxPath), { recursive: true });
          fs.writeFileSync(ctxPath, nextCtx, "utf8");
        }
        changes.push({ path: ctxDoc.path, action: "context-map-refreshed" });
      }
    }
  }

  if (!dryRun && changes.length > 0) {
    const updatedManifest = { ...manifest, syncedAt: new Date().toISOString() };
    fs.writeFileSync(
      path.join(absDir, MANIFEST_FILENAME),
      JSON.stringify(updatedManifest, null, 2) + "\n",
      "utf8"
    );
  }

  return {
    workspaceDir: absDir,
    dryRun,
    synced: true,
    changeCount: changes.length,
    changes,
    message:
      changes.length === 0
        ? "Workspace routing table and context map are already synchronized with manifest."
        : `Synchronized ${changes.length} governance artifact(s) without modifying domain specs.`,
  };
}
