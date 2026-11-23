/**
 * Workspace Scaffold Engine.
 *
 * Materializes a Blueprint into a target directory:
 * - Writes AGENTS.md, docs/00-CONTEXT-MAP.md, and all selected domain MDs
 * - Optionally writes thin agent shims (CLAUDE.md, Cursor, Copilot, Windsurf)
 * - Writes md-structure.manifest.json as the machine-readable lockfile
 * - Supports safe dryRun mode and overwrite protection
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MANIFEST_FILENAME, SCHEMA_VERSION, SIGNATURE, SUPPORTED_SHIMS } from "./constants.js";
import { planArchitecture } from "./planner.js";
import { renderAgentShim, renderDocument } from "./templates.js";
import { estimateTokens } from "./tokens.js";

function sha256Short(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);
}

/**
 * Scaffold an MD-Structure workspace from an idea, intake profile, or existing blueprint.
 *
 * @param {string | object} input
 * @param {{
 *   outDir: string,
 *   dryRun?: boolean,
 *   force?: boolean,
 *   shims?: string[],
 *   includeDocs?: string[],
 *   excludeDocs?: string[],
 *   docsDir?: string
 * }} options
 */
export function scaffoldWorkspace(input, options) {
  if (!options || !options.outDir) {
    throw new Error("scaffoldWorkspace requires options.outDir");
  }

  const outDir = path.resolve(options.outDir);
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);
  const shims = Array.isArray(options.shims)
    ? [...new Set(options.shims.filter((s) => SUPPORTED_SHIMS.includes(s)))]
    : [];

  const blueprint =
    input && input.documents && input.summary && input.project
      ? input
      : planArchitecture(input, {
          includeDocs: options.includeDocs,
          excludeDocs: options.excludeDocs,
          docsDir: options.docsDir,
        });

  const plannedFiles = [];

  // 1. Render all blueprint Markdown documents
  for (const doc of blueprint.documents) {
    const content = renderDocument(blueprint, doc);
    const absPath = path.join(outDir, doc.path);
    plannedFiles.push({
      kind: "document",
      id: doc.id,
      relativePath: doc.path,
      absolutePath: absPath,
      content,
      estimatedTokens: estimateTokens(content),
      tokenBudget: doc.tokenBudget,
      checksum: sha256Short(content),
    });
  }

  // 2. Render requested thin shims
  for (const shim of shims) {
    const rendered = renderAgentShim(shim, blueprint);
    plannedFiles.push({
      kind: "shim",
      id: `shim:${shim}`,
      relativePath: rendered.path,
      absolutePath: path.join(outDir, rendered.path),
      content: rendered.content,
      estimatedTokens: estimateTokens(rendered.content),
      tokenBudget: { min: 20, target: 80, max: 200 },
      checksum: sha256Short(rendered.content),
    });
  }

  // 3. Build machine-readable manifest
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generator: "md-structure",
    createdBy: SIGNATURE,
    generatedAt: new Date().toISOString(),
    project: {
      name: blueprint.project.name,
      slug: blueprint.project.slug,
      idea: blueprint.project.idea,
      archetype: blueprint.project.archetype.id,
      tier: blueprint.project.tier.id,
      riskLevel: blueprint.project.riskLevel,
      capabilities: blueprint.project.capabilities.map((c) => c.id),
      stack: blueprint.project.stack,
    },
    docsDir: options.docsDir || "docs",
    shims,
    summary: blueprint.summary,
    documents: blueprint.documents.map((doc) => {
      const fileEntry = plannedFiles.find((f) => f.id === doc.id);
      return {
        order: doc.order,
        id: doc.id,
        title: doc.title,
        path: doc.path,
        layer: doc.layer,
        priority: doc.priority,
        loadPolicy: doc.loadPolicy,
        tokenBudget: doc.tokenBudget,
        dependsOn: doc.dependsOn,
        authority: doc.authority,
        selectionReasons: doc.selectionReasons,
        initialChecksum: fileEntry ? fileEntry.checksum : null,
      };
    }),
    excludedDocuments: blueprint.excludedDocuments,
  };

  const manifestContent = JSON.stringify(manifest, null, 2) + "\n";
  plannedFiles.push({
    kind: "manifest",
    id: "manifest",
    relativePath: MANIFEST_FILENAME,
    absolutePath: path.join(outDir, MANIFEST_FILENAME),
    content: manifestContent,
    estimatedTokens: 0,
    tokenBudget: null,
    checksum: sha256Short(manifestContent),
  });

  // 4. Write or simulate
  const written = [];
  const skipped = [];

  for (const file of plannedFiles) {
    const exists = fs.existsSync(file.absolutePath);
    if (exists && !force) {
      skipped.push({
        relativePath: file.relativePath,
        kind: file.kind,
        reason: "File already exists (use --force to overwrite)",
      });
      continue;
    }

    if (!dryRun) {
      fs.mkdirSync(path.dirname(file.absolutePath), { recursive: true });
      fs.writeFileSync(file.absolutePath, file.content, "utf8");
    }

    written.push({
      relativePath: file.relativePath,
      kind: file.kind,
      id: file.id,
      estimatedTokens: file.estimatedTokens,
      overwritten: exists,
    });
  }

  return {
    outDir,
    dryRun,
    manifestPath: path.join(outDir, MANIFEST_FILENAME),
    blueprint,
    written,
    skipped,
    nextAction:
      dryRun
        ? "Dry run completed. Re-run without --dry-run to materialize files."
        : "Workspace scaffolded. Run `md-structure next --dir <outDir> --json` to author each draft document in DAG order.",
  };
}
