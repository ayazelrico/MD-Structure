import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DOC_CATALOG, planArchitecture } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readExample(filename) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "examples", filename), "utf8"));
}

test("planArchitecture keeps T0 micro CLI ultra-lean with explicit exclusions", () => {
  const blueprint = planArchitecture(readExample("micro-cli-idea.json"));

  assert.equal(blueprint.project.tier.id, "T0");
  assert.ok(
    blueprint.summary.totalDocuments >= 2 && blueprint.summary.totalDocuments <= 4,
    `Expected 2-4 docs for T0, got ${blueprint.summary.totalDocuments}`
  );
  assert.equal(blueprint.summary.totalDocuments + blueprint.summary.excludedDocuments, DOC_CATALOG.length);
  assert.equal(blueprint.summary.byLoadPolicy.always, 1);
  assert.equal(blueprint.summary.tokenLedger.alwaysOnWithinLimit, true);
  assert.ok(blueprint.documents.some((d) => d.id === "agents-entry"));
  assert.ok(blueprint.documents.some((d) => d.id === "prd"));
  assert.ok(blueprint.documents.some((d) => d.id === "cli-ux-spec"));
  assert.ok(blueprint.excludedDocuments.some((d) => d.id === "compliance-privacy"));
});

test("planArchitecture selects right-sized production docs in strict topological DAG order", () => {
  const blueprint = planArchitecture(readExample("saas-platform-idea.json"));
  const ids = blueprint.documents.map((d) => d.id);

  assert.ok(ids.includes("agents-entry"));
  assert.ok(ids.includes("context-map"));
  assert.ok(ids.includes("prd"));
  assert.ok(ids.includes("architecture"));
  assert.ok(ids.includes("data-model"));
  assert.ok(ids.includes("api-contract"));
  assert.ok(ids.includes("ai-agent-spec"));
  assert.ok(ids.includes("auth-permissions"));
  assert.ok(ids.includes("security-model"));
  assert.ok(ids.includes("integrations"));

  // Verify strict topological ordering: every dependency appears BEFORE its dependent
  const indexById = new Map(ids.map((id, i) => [id, i]));
  for (const doc of blueprint.documents) {
    for (const dep of doc.dependsOn) {
      assert.ok(
        indexById.get(dep) < indexById.get(doc.id),
        `Dependency '${dep}' must precede '${doc.id}' in DAG order`
      );
    }
  }
});

test("planArchitecture scales to T3 enterprise platform with governance and migration docs", () => {
  const blueprint = planArchitecture(readExample("enterprise-ai-idea.json"));
  const ids = new Set(blueprint.documents.map((d) => d.id));

  assert.equal(blueprint.project.tier.id, "T3");
  assert.ok(ids.has("compliance-privacy"));
  assert.ok(ids.has("migration-plan"));
  assert.ok(ids.has("monorepo-topology"));
  assert.ok(ids.has("observability"));
  assert.ok(ids.has("ai-agent-spec"));
  assert.ok(ids.has("domain-glossary"));
  assert.equal(blueprint.summary.byLoadPolicy.always, 1);
});

test("planArchitecture honors includeDocs and excludeDocs overrides", () => {
  const blueprint = planArchitecture("Simple local CLI tool", {
    includeDocs: ["adr-log"],
    excludeDocs: ["cli-ux-spec"],
  });
  const ids = new Set(blueprint.documents.map((d) => d.id));

  assert.ok(ids.has("adr-log"));
  assert.ok(ids.has("architecture"), "Upstream dependency 'architecture' should be auto-pulled for adr-log");
  assert.ok(!ids.has("cli-ux-spec"));
});
