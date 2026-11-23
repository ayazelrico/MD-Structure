import test from "node:test";
import assert from "node:assert/strict";
import { analyzeProject, generateDiscoveryQuestions } from "../src/index.js";

test("analyzeProject detects T0/T1 micro CLI tool cleanly", () => {
  const analysis = analyzeProject({
    name: "EnvGuard",
    idea: "A tiny simple local CLI script that validates .env files",
    lifecycle: "prototype",
  });

  assert.equal(analysis.archetype.id, "cli-tool");
  assert.equal(analysis.tier.id, "T0");
  assert.equal(analysis.riskLevel, "low");
  assert.ok(analysis.capabilities.some((c) => c.id === "cli-interface"));
});

test("analyzeProject detects T2/T3 multi-tenant SaaS with AI & billing", () => {
  const analysis = analyzeProject(
    "Build a multi-tenant B2B SaaS invoicing platform with RBAC permissions, Stripe subscription billing, webhooks, PostgreSQL database, and an AI expense categorization agent"
  );

  const capIds = new Set(analysis.capabilities.map((c) => c.id));
  assert.ok(["T2", "T3"].includes(analysis.tier.id), `Expected T2 or T3, got ${analysis.tier.id}`);
  assert.ok(capIds.has("multi-tenant"));
  assert.ok(capIds.has("payments-billing"));
  assert.ok(capIds.has("auth-rbac"));
  assert.ok(capIds.has("ai-llm-agents"));
  assert.ok(capIds.has("database-persistence"));
  assert.equal(analysis.riskLevel, "critical");
});

test("analyzeProject detects sparse ambiguous ideas and generates targeted discovery questions", () => {
  const analysis = analyzeProject("Build an app");
  assert.equal(analysis.needsDiscovery, true);
  assert.ok(analysis.ambiguities.some((a) => a.id === "sparse-idea"));

  const discovery = generateDiscoveryQuestions("Build an app");
  assert.equal(discovery.needsClarification, true);
  assert.ok(discovery.questions.length >= 2 && discovery.questions.length <= 5);
  for (const q of discovery.questions) {
    assert.ok(Array.isArray(q.impactedDocs) && q.impactedDocs.length > 0);
    assert.ok(q.whyItMatters.length > 10);
  }
});

test("analyzeProject respects explicit archetype, tier, and capability exclusions", () => {
  const analysis = analyzeProject({
    idea: "Internal developer SDK for structured logging",
    archetype: "library-sdk",
    tier: "T1",
    excludeCapabilities: ["public-api"],
    capabilities: ["plugin-extensibility"],
  });

  assert.equal(analysis.archetype.id, "library-sdk");
  assert.equal(analysis.archetype.confidence, "explicit");
  assert.equal(analysis.tier.id, "T1");
  assert.ok(analysis.capabilities.some((c) => c.id === "plugin-extensibility"));
  assert.ok(!analysis.capabilities.some((c) => c.id === "public-api"));
});
