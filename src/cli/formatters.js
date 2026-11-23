/**
 * Clean, deterministic terminal output formatters for MD-Structure CLI.
 * Zero external dependencies; works cleanly in plain terminals and CI logs.
 */

function padRight(str, width) {
  const s = String(str ?? "");
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function renderTable(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length))
  );
  const sep = widths.map((w) => "-".repeat(w)).join("  ");
  const lines = [
    headers.map((h, i) => padRight(h, widths[i])).join("  "),
    sep,
    ...rows.map((r) => r.map((cell, i) => padRight(cell, widths[i])).join("  ")),
  ];
  return lines.join("\n");
}

export function formatBlueprint(blueprint, { showExcluded = false } = {}) {
  const { project, summary, whyThisStructure, documents, excludedDocuments, ambiguities } = blueprint;
  const lines = [];

  lines.push(`MD-STRUCTURE ARCHITECTURE BLUEPRINT — ${project.name}`);
  lines.push("=".repeat(72));
  lines.push(`Archetype      : ${project.archetype.id} (${project.archetype.label}) [confidence: ${project.archetype.confidence}]`);
  lines.push(`Complexity Tier: ${project.tier.id} (${project.tier.name}) [score: ${project.tier.complexityScore}]`);
  lines.push(`Risk Level     : ${project.riskLevel}`);
  lines.push(
    `Capabilities   : ${project.capabilities.map((c) => c.id).join(", ") || "none"}`
  );
  lines.push("");
  lines.push("1. HOW MANY MARKDOWN FILES?");
  lines.push(`   ${whyThisStructure.headline}`);
  lines.push(
    `   Breakdown     : ${summary.byLoadPolicy.always} always-on | ${summary.byLoadPolicy["on-demand"]} on-demand | ${summary.byLoadPolicy["task-scoped"]} task-scoped | ${summary.byLoadPolicy.reference} reference`
  );
  lines.push(
    `   Token Budget  : ~${summary.tokenLedger.alwaysOnTargetTokens} always-on tokens (limit ${summary.tokenLedger.alwaysOnTierLimit}) | ~${summary.tokenLedger.totalTargetTokens} total target tokens (max ${summary.tokenLedger.totalMaxTokens})`
  );
  lines.push(`   Anti-Bloat    : ${whyThisStructure.antiBloatGuard}`);
  lines.push("");
  lines.push("2. WHICH MARKDOWN FILES (IN DEPENDENCY DAG ORDER) & WHY?");

  const rows = documents.map((d) => [
    String(d.order),
    d.id,
    d.path,
    d.loadPolicy,
    `${d.tokenBudget.target}/${d.tokenBudget.max}`,
    d.dependsOn.join(",") || "-",
  ]);
  lines.push(renderTable(["#", "ID", "PATH", "LOAD POLICY", "TOKENS", "DEPENDS ON"], rows));
  lines.push("");
  lines.push("3. RATIONALE PER DOCUMENT (FAILURE MODE PREVENTED)");
  for (const d of documents) {
    lines.push(`   [${d.order}] ${d.path} (${d.priority})`);
    lines.push(`       Why included : ${d.selectionReasons.join(" ")}`);
    lines.push(`       Prevents     : ${d.failureModePrevented}`);
  }

  if (showExcluded) {
    lines.push("");
    lines.push(`4. INTENTIONALLY EXCLUDED DOCUMENTS (${excludedDocuments.length})`);
    for (const ex of excludedDocuments) {
      lines.push(`   - ${ex.id} (${ex.path}): ${ex.skipReason}`);
    }
  } else {
    lines.push("");
    lines.push(
      `Excluded: ${excludedDocuments.length} catalog archetypes skipped (pass --show-excluded or --json to inspect every skip reason).`
    );
  }

  if (ambiguities.length > 0) {
    lines.push("");
    lines.push(`OPEN AMBIGUITIES (${ambiguities.length}) — run \`md-structure discover\` for clarifying questions:`);
    for (const a of ambiguities) {
      lines.push(`   - [${a.severity}] ${a.dimension}: ${a.reason}`);
    }
  }

  return lines.join("\n");
}

export function formatDiscovery(discovery) {
  const lines = [];
  lines.push(`MD-STRUCTURE DISCOVERY QUESTIONS — ${discovery.projectName}`);
  lines.push("=".repeat(72));
  lines.push(
    `Current Guess  : archetype=${discovery.currentAssessment.archetype} (${discovery.currentAssessment.archetypeConfidence}), tier=${discovery.currentAssessment.projectedTier}`
  );
  lines.push(`Action         : ${discovery.recommendedAction}`);
  lines.push("");

  if (discovery.questions.length === 0) {
    lines.push("No clarifying questions required.");
    return lines.join("\n");
  }

  for (const q of discovery.questions) {
    lines.push(`[Q${q.priority}] ${q.dimension}: ${q.question}`);
    for (const opt of q.options) {
      lines.push(`     - ${opt}`);
    }
    lines.push(`     Impacts MDs: ${q.impactedDocs.join(", ")}`);
    lines.push(`     Why        : ${q.whyItMatters}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatScaffold(result) {
  const lines = [];
  lines.push(
    result.dryRun
      ? `MD-STRUCTURE DRY RUN — ${result.blueprint.project.name}`
      : `MD-STRUCTURE SCAFFOLD COMPLETE — ${result.blueprint.project.name}`
  );
  lines.push("=".repeat(72));
  lines.push(`Target Dir     : ${result.outDir}`);
  lines.push(
    `Blueprint      : ${result.blueprint.project.archetype.id} / ${result.blueprint.project.tier.id} (${result.blueprint.summary.totalDocuments} MDs)`
  );
  lines.push(`Written        : ${result.written.length} file(s)`);
  lines.push(`Skipped        : ${result.skipped.length} file(s)`);
  lines.push("");

  if (result.written.length > 0) {
    const rows = result.written.map((f) => [
      f.kind,
      f.relativePath,
      f.estimatedTokens ? `${f.estimatedTokens}t` : "-",
      f.overwritten ? "overwritten" : "created",
    ]);
    lines.push(renderTable(["KIND", "PATH", "EST. TOKENS", "STATUS"], rows));
  }

  if (result.skipped.length > 0) {
    lines.push("");
    lines.push("Skipped existing files:");
    for (const s of result.skipped) {
      lines.push(`  - ${s.relativePath}: ${s.reason}`);
    }
  }

  lines.push("");
  lines.push(`Next Step: ${result.nextAction}`);
  return lines.join("\n");
}

export function formatAudit(report) {
  const lines = [];
  lines.push(`MD-STRUCTURE WORKSPACE AUDIT — ${report.workspaceDir}`);
  lines.push("=".repeat(72));
  lines.push(
    `Readiness Score: ${report.readinessScore}/100 | Status: ${report.status.toUpperCase()} | Ready for Implementation: ${report.readyForImplementation ? "YES" : "NO"}`
  );
  lines.push(
    `Documents      : ${report.summary.approved}/${report.summary.totalDeclared} approved | ${report.summary.draft} draft | ${report.summary.missing} missing`
  );
  lines.push(
    `Context Load   : ${report.summary.alwaysOnTokens} always-on tokens | ${report.summary.totalTokens} total tokens | ${report.summary.totalOpenDirectives} open AGENT:FILL directives`
  );
  lines.push(
    `Findings       : ${report.summary.errorCount} error(s), ${report.summary.warningCount} warning(s)`
  );
  lines.push("");

  if (report.documents.length > 0) {
    const rows = report.documents.map((d) => [
      d.id,
      d.path,
      d.status,
      `${d.tokens}/${d.tokenBudget?.max ?? "-"}`,
      d.budgetStatus,
      String(d.openDirectives),
    ]);
    lines.push(renderTable(["ID", "PATH", "STATUS", "TOKENS/MAX", "BUDGET", "OPEN FILLS"], rows));
  }

  if (report.issues.length > 0) {
    lines.push("");
    lines.push("ISSUES:");
    for (const issue of report.issues) {
      lines.push(`  [${issue.severity.toUpperCase()}] ${issue.code} (${issue.path}): ${issue.message}`);
    }
  }

  lines.push("");
  lines.push("REMEDIATION PLAN:");
  for (const step of report.remediationPlan) {
    lines.push(`  - ${step}`);
  }

  return lines.join("\n");
}

export function formatNextDoc(nextInfo) {
  const lines = [];
  lines.push(`MD-STRUCTURE DAG AUTHORING NAVIGATOR — ${nextInfo.workspaceDir}`);
  lines.push("=".repeat(72));
  lines.push(
    `Progress: ${nextInfo.progress.completed}/${nextInfo.progress.total} documents finalized (${nextInfo.progress.percent}%)`
  );

  if (nextInfo.completed) {
    lines.push("");
    lines.push(nextInfo.message);
    return lines.join("\n");
  }

  const n = nextInfo.next;
  lines.push("");
  lines.push(`NEXT DOCUMENT : [${n.order}] ${n.path} (${n.id})`);
  lines.push(`Title         : ${n.title}`);
  lines.push(`Status        : ${n.status} | Open Directives: ${n.openDirectivesCount}`);
  lines.push(`Token Budget  : ${n.currentTokens} current / ${n.tokenBudget.target} target / ${n.tokenBudget.max} max`);
  lines.push(`Authority     : ${n.authority}`);
  lines.push("");
  lines.push("UPSTREAM DOCS TO READ FIRST:");
  if (n.upstreamToReadFirst.length === 0) {
    lines.push("  (none)");
  } else {
    for (const up of n.upstreamToReadFirst) {
      lines.push(`  - ${up.path} (${up.authority})`);
    }
  }
  lines.push("");
  lines.push("AGENT INSTRUCTIONS:");
  for (const instr of n.agentInstructions) {
    lines.push(`  - ${instr}`);
  }

  return lines.join("\n");
}

export function formatExplain(doc) {
  const lines = [];
  lines.push(`MD-STRUCTURE CATALOG ENTRY — ${doc.id} (${doc.title})`);
  lines.push("=".repeat(72));
  lines.push(`Path             : ${doc.path}`);
  lines.push(`Layer            : ${doc.layer} (${doc.layerMeta.label})`);
  lines.push(`Load Policy      : ${doc.loadPolicy} — ${doc.loadPolicyMeta.description}`);
  lines.push(`Minimum Tier     : ${doc.minTier}`);
  lines.push(`Token Budget     : min ${doc.tokenBudget.min} | target ${doc.tokenBudget.target} | max ${doc.tokenBudget.max}`);
  lines.push(`Depends On       : ${doc.dependsOn.join(", ") || "none"}`);
  lines.push(`Trigger Caps     : ${doc.triggerCapabilities.join(", ") || "baseline/tier"}`);
  lines.push(`Trigger Archetype: ${doc.triggerArchetypes.join(", ") || "any"}`);
  lines.push("");
  lines.push(`Authority        : ${doc.authority}`);
  lines.push(`Why Required     : ${doc.whyRequired}`);
  lines.push(`Prevents Failure : ${doc.failureModePrevented}`);
  lines.push(`When Skipped     : ${doc.skipRationale}`);
  lines.push("");
  lines.push("READ TRIGGERS:");
  for (const r of doc.readTriggers) lines.push(`  - ${r}`);
  lines.push("");
  lines.push("REQUIRED SECTIONS:");
  for (const s of doc.sections) lines.push(`  - ${s.heading}: ${s.purpose}`);
  return lines.join("\n");
}

export function formatCatalog(docs) {
  const rows = docs.map((d) => [
    d.id,
    d.path,
    d.layer,
    d.loadPolicy,
    d.minTier,
    `${d.tokenBudget.target}/${d.tokenBudget.max}`,
  ]);
  return [
    `MD-STRUCTURE CANONICAL CATALOG (${docs.length} archetypes)`,
    "=".repeat(72),
    renderTable(["ID", "PATH", "LAYER", "LOAD POLICY", "MIN TIER", "TOKENS"], rows),
  ].join("\n");
}

export function formatScan(scan) {
  const lines = [];
  lines.push(`MD-STRUCTURE REPOSITORY SCAN — ${scan.repoDir}`);
  lines.push("=".repeat(72));
  lines.push(
    `Inferred Project : ${scan.inferredProfile.name} | archetype=${scan.inferredProfile.archetype} | tier=${scan.recommendedBlueprint.project.tier.id}`
  );
  lines.push(
    `Detected Stack   : ${scan.inferredProfile.stack.join(", ") || "none"}`
  );
  lines.push(
    `Capabilities     : ${scan.inferredProfile.capabilities.join(", ") || "none"}`
  );
  lines.push(
    `Scanned Files    : ${scan.scannedFileCount} | Existing MDs: ${scan.existingMarkdownFiles.length} | Manifest: ${scan.hasMdStructureManifest ? "YES" : "NO"}`
  );
  lines.push("");
  lines.push(
    `DOCUMENTATION GAP: ${scan.gapAnalysis.alreadyPresentCount}/${scan.gapAnalysis.recommendedCount} recommended MDs present (${scan.gapAnalysis.missingCount} missing)`
  );

  if (scan.gapAnalysis.missingRecommended.length > 0) {
    lines.push("");
    const rows = scan.gapAnalysis.missingRecommended.map((m) => [
      m.docId,
      m.path,
      m.priority,
      m.whyRequired.slice(0, 72) + (m.whyRequired.length > 72 ? "..." : ""),
    ]);
    lines.push(renderTable(["MISSING ID", "PATH", "PRIORITY", "WHY REQUIRED"], rows));
  }

  lines.push("");
  lines.push(`Next Action: ${scan.nextAction}`);
  return lines.join("\n");
}

export function formatRoute(route) {
  const lines = [];
  lines.push(`MD-STRUCTURE CONTEXT ROUTER — ${route.workspaceDir}`);
  lines.push("=".repeat(72));
  lines.push(`Task             : ${route.task}`);
  lines.push(
    `Context Savings  : Load ${route.summary.mustReadCount}/${route.summary.totalWorkspaceDocs} MDs (~${route.summary.mustReadTokens}t vs ${route.summary.fullCorpusTokens}t full corpus -> ${route.summary.contextSavingsPercent}% tokens saved)`
  );
  lines.push("");
  lines.push("MUST READ NOW:");
  for (const d of route.mustRead) {
    lines.push(`  [${d.order}] ${d.path} (~${d.estimatedTokens}t) — ${d.reasons.join("; ")}`);
  }

  if (route.optionalRead.length > 0) {
    lines.push("");
    lines.push("OPTIONAL / UPSTREAM CONTEXT:");
    for (const d of route.optionalRead) {
      lines.push(`  [${d.order}] ${d.path} (~${d.estimatedTokens}t) — ${d.reasons.join("; ")}`);
    }
  }

  if (route.skipped.length > 0) {
    lines.push("");
    lines.push(
      `SKIPPED (${route.skipped.length} docs unloaded): ${route.skipped.map((s) => s.id).join(", ")}`
    );
  }
  return lines.join("\n");
}

export function formatAddDoc(res) {
  const lines = [];
  lines.push(`MD-STRUCTURE ADD DOCUMENT — ${res.docId}`);
  lines.push("=".repeat(72));
  if (!res.added) {
    lines.push(res.message);
    return lines.join("\n");
  }
  lines.push(`Workspace        : ${res.workspaceDir}`);
  lines.push(`Total Active MDs : ${res.totalDocuments}`);
  lines.push(`AGENTS.md Synced : ${res.agentsRoutingPatched ? "YES" : "NO"}`);
  lines.push(`Context Map Sync : ${res.contextMapRefreshed ? "YES" : "NO"}`);
  lines.push("");
  for (const f of res.writtenFiles) {
    lines.push(`  - [${f.action}] ${f.path} (~${f.estimatedTokens}t)`);
  }
  lines.push("");
  lines.push(`Next Action: ${res.nextAction}`);
  return lines.join("\n");
}

export function formatSync(res) {
  const lines = [];
  lines.push(`MD-STRUCTURE WORKSPACE SYNC — ${res.workspaceDir}`);
  lines.push("=".repeat(72));
  lines.push(res.message);
  for (const c of res.changes) {
    lines.push(`  - ${c.path}: ${c.action}`);
  }
  return lines.join("\n");
}
