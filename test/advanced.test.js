import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOC_CATALOG,
  addDocumentToWorkspace,
  auditWorkspace,
  parseFrontmatter,
  planArchitecture,
  renderDocument,
  routeContextForTask,
  scaffoldWorkspace,
  scanRepository,
  syncWorkspace,
} from "../src/index.js";
import { handleMcpMessage } from "../src/mcp/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function makeTempDir(prefix = "md-structure-adv-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("all 27 canonical catalog archetypes render bespoke templates with valid YAML frontmatter", () => {
  const allIds = DOC_CATALOG.map((d) => d.id);
  const blueprint = planArchitecture(
    {
      name: "OmniPlatform",
      idea: "Enterprise multi-tenant AI SaaS monorepo with CLI, SDK, plugins, offline sync, Stripe billing, HIPAA compliance, and legacy migration",
      tier: "T3",
    },
    { includeDocs: allIds }
  );

  assert.equal(blueprint.documents.length, DOC_CATALOG.length);

  for (const doc of blueprint.documents) {
    const rendered = renderDocument(blueprint, doc);
    const parsed = parseFrontmatter(rendered);
    assert.equal(parsed.hasFrontmatter, true, `Missing frontmatter on ${doc.id}`);
    assert.equal(parsed.data.id, doc.id, `Frontmatter id mismatch on ${doc.id}`);
    assert.ok(parsed.data.authority, `Missing authority on ${doc.id}`);
    assert.ok(
      !rendered.includes("> **Section Contract:**"),
      `Expected bespoke specialized template (not generic fallback) for '${doc.id}'`
    );
  }
});

test("scanRepository detects stack, capabilities, and documentation gap on an existing repo", () => {
  const dir = makeTempDir("md-structure-scan-");
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "acme-billing-app",
        description: "Multi-tenant SaaS billing app",
        dependencies: {
          next: "15.0.0",
          react: "19.0.0",
          prisma: "6.0.0",
          stripe: "17.0.0",
          "@clerk/nextjs": "6.0.0",
          ai: "4.0.0",
        },
      }),
      "utf8"
    );
    fs.writeFileSync(path.join(dir, "Dockerfile"), "FROM node:22-alpine\n", "utf8");
    fs.writeFileSync(path.join(dir, "README.md"), "# Acme Billing\n", "utf8");

    const scan = scanRepository(dir);
    assert.equal(scan.inferredProfile.name, "acme-billing-app");
    assert.equal(scan.inferredProfile.archetype, "web-saas");
    const caps = new Set(scan.inferredProfile.capabilities);
    assert.ok(caps.has("complex-ui"));
    assert.ok(caps.has("database-persistence"));
    assert.ok(caps.has("payments-billing"));
    assert.ok(caps.has("auth-rbac"));
    assert.ok(caps.has("ai-llm-agents"));
    assert.ok(caps.has("self-hosted-infra"));
    assert.equal(scan.hasMdStructureManifest, false);
    assert.ok(scan.gapAnalysis.missingCount >= 8);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("routeContextForTask loads minimal task-relevant docs and saves >40% context tokens", () => {
  const dir = makeTempDir("md-structure-route-");
  try {
    const saasProfile = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "examples", "saas-platform-idea.json"), "utf8")
    );
    scaffoldWorkspace(saasProfile, { outDir: dir });

    const routed = routeContextForTask(
      dir,
      "Fix Stripe webhook signature verification and idempotent invoice retry handler"
    );

    const mustIds = new Set(routed.mustRead.map((d) => d.id));
    assert.ok(mustIds.has("agents-entry"), "AGENTS.md must always be included");
    assert.ok(
      mustIds.has("integrations") || mustIds.has("state-workflows") || mustIds.has("api-contract"),
      "Should route to webhook/workflow/api docs"
    );
    assert.ok(
      !mustIds.has("ui-design-system"),
      "Should NOT load unrelated UI design system doc for a backend webhook task"
    );
    assert.ok(
      routed.summary.contextSavingsPercent >= 40,
      `Expected >= 40% token savings, got ${routed.summary.contextSavingsPercent}%`
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("addDocumentToWorkspace & syncWorkspace evolve workspace non-destructively while keeping audit clean", () => {
  const dir = makeTempDir("md-structure-evolve-");
  try {
    scaffoldWorkspace(
      {
        name: "CoreAPI",
        idea: "Focused REST API backend with PostgreSQL",
        archetype: "api-backend",
        lifecycle: "mvp",
      },
      { outDir: dir }
    );

    // Customize AGENTS.md with a user invariant to prove add-doc preserves custom edits
    const agentsPath = path.join(dir, "AGENTS.md");
    const customInvariant = "99. **Custom User Rule:** Never drop production tables.";
    fs.appendFileSync(agentsPath, `\n${customInvariant}\n`, "utf8");

    // Evolve project: add `ai-agent-spec`
    const addRes = addDocumentToWorkspace(dir, "ai-agent-spec");
    assert.equal(addRes.added, true);
    assert.equal(addRes.agentsRoutingPatched, true);
    assert.equal(fs.existsSync(path.join(dir, "docs/05-AI-AGENT-SPEC.md")), true);

    const updatedAgents = fs.readFileSync(agentsPath, "utf8");
    assert.ok(updatedAgents.includes("docs/05-AI-AGENT-SPEC.md"), "AGENTS.md routing table should contain new doc");
    assert.ok(updatedAgents.includes(customInvariant), "Custom AGENTS.md edits must be preserved");

    // Simulate routing drift by removing the row, then run syncWorkspace to self-heal
    const driftedAgents = updatedAgents.replace(/.*05-AI-AGENT-SPEC\.md.*\n/, "");
    fs.writeFileSync(agentsPath, driftedAgents, "utf8");

    const preSyncAudit = auditWorkspace(dir);
    assert.ok(preSyncAudit.issues.some((i) => i.code === "MISSING_AGENTS_ROUTE"));

    const syncRes = syncWorkspace(dir);
    assert.equal(syncRes.synced, true);
    assert.ok(syncRes.changeCount >= 1);

    const postSyncAudit = auditWorkspace(dir);
    assert.ok(!postSyncAudit.issues.some((i) => i.code === "MISSING_AGENTS_ROUTE"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("MCP server exposes all 11 tools and executes md_scan_repo & md_route_context", () => {
  const listResp = handleMcpMessage({ jsonrpc: "2.0", id: 10, method: "tools/list" });
  const names = listResp.result.tools.map((t) => t.name);
  assert.equal(names.length, 11);
  assert.ok(names.includes("md_scan_repo"));
  assert.ok(names.includes("md_route_context"));
  assert.ok(names.includes("md_add_doc"));
  assert.ok(names.includes("md_sync_workspace"));

  const scanResp = handleMcpMessage({
    jsonrpc: "2.0",
    id: 11,
    method: "tools/call",
    params: { name: "md_scan_repo", arguments: { dir: REPO_ROOT } },
  });
  assert.equal(scanResp.result.isError, false);
  assert.equal(scanResp.result.structuredContent.inferredProfile.name, "md-structure");
  assert.equal(scanResp.result.structuredContent.hasAgentsMd, true);
});

test("all 4 JSON Schema files in schemas/ are valid JSON Draft 2020-12 documents", () => {
  const schemaFiles = [
    "intake-profile.schema.json",
    "blueprint.schema.json",
    "manifest.schema.json",
    "audit-report.schema.json",
  ];
  for (const file of schemaFiles) {
    const content = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "schemas", file), "utf8"));
    assert.equal(content.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.ok(content.title && content.type === "object");
  }
});
