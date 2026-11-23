/**
 * Progressive-Disclosure Task-to-Context Router.
 *
 * Given a concrete coding task description and an MD-Structure workspace,
 * determines WHICH exact Markdown documents an AI agent should load into its
 * context window right now, in reading order, and calculates exact token savings
 * compared to blindly loading the entire docs/ folder.
 */

import fs from "node:fs";
import path from "node:path";
import { loadManifest, parseFrontmatter } from "./auditor.js";
import { MANIFEST_FILENAME } from "./constants.js";
import { estimateTokens } from "./tokens.js";

const DOMAIN_SIGNAL_KEYWORDS = {
  "prd": ["feature", "requirement", "scope", "user journey", "acceptance", "persona", "mvp", "non-goal", "product"],
  "domain-glossary": ["naming", "terminology", "entity", "business rule", "glossary", "domain", "status enum", "calculation"],
  "architecture": ["architecture", "module", "directory", "folder", "refactor", "dependency", "package", "boundary", "service", "layer", "stack"],
  "data-model": ["database", "db", "schema", "table", "column", "sql", "migration", "prisma", "drizzle", "model", "query", "index", "entity", "postgres", "sqlite", "mongo", "seed"],
  "api-contract": ["api", "endpoint", "route", "http", "rest", "graphql", "rpc", "request", "response", "payload", "status code", "pagination", "error code", "webhook", "controller", "handler"],
  "ai-agent-spec": ["ai", "llm", "prompt", "agent", "tool", "mcp", "rag", "embedding", "eval", "guardrail", "model", "token", "streaming", "structured output"],
  "ui-design-system": ["ui", "component", "page", "screen", "layout", "css", "tailwind", "style", "theme", "button", "modal", "form", "responsive", "accessibility", "a11y", "aria", "frontend"],
  "cli-ux-spec": ["cli", "command", "flag", "subcommand", "exit code", "stdout", "stderr", "terminal", "arg", "help", "json output"],
  "sdk-public-api": ["sdk", "export", "public api", "semver", "breaking change", "package", "typescript types", "d.ts", "library"],
  "plugin-architecture": ["plugin", "extension", "hook", "sandbox", "manifest", "message bridge", "content script", "background script"],
  "state-workflows": ["workflow", "state machine", "transition", "status", "queue", "worker", "job", "cron", "retry", "backoff", "idempotency", "saga", "async", "webhook", "invoice", "billing", "payment", "stripe"],
  "offline-sync": ["offline", "sync", "local storage", "indexeddb", "sqlite", "conflict", "crdt", "outbox", "reconnect", "optimistic"],
  "integrations": ["integration", "third-party", "stripe", "webhook", "oauth", "slack", "github", "vendor", "external api", "twilio", "resend", "shopify"],
  "auth-permissions": ["auth", "login", "signup", "session", "jwt", "token", "oauth", "sso", "rbac", "role", "permission", "tenant", "multi-tenant", "idor", "access control", "api key"],
  "security-model": ["security", "threat", "secret", "encrypt", "xss", "csrf", "sqli", "ssrf", "sanitize", "validate", "csp", "vulnerability", "injection", "upload", "webhook"],
  "conventions": ["convention", "lint", "naming", "error handling", "logging", "style", "refactor", "cleanup", "pr"],
  "testing-strategy": ["test", "unit test", "integration test", "e2e", "mock", "fixture", "ci", "coverage", "regression", "assert", "vitest", "jest", "playwright"],
  "performance-budgets": ["performance", "latency", "slow", "cache", "redis", "n+1", "bundle", "memory", "oom", "benchmark", "slo", "scale", "throughput", "optimize"],
  "adr-log": ["adr", "decision", "trade-off", "replace", "migrate stack", "rewrite", "architecture decision"],
  "local-dev-runbook": ["env", ".env", "setup", "local", "docker", "boot", "port", "seed", "install", "troubleshoot", "runbook"],
  "infra-deploy": ["deploy", "docker", "kubernetes", "k8s", "ci/cd", "github actions", "terraform", "vercel", "cloudflare", "aws", "rollback", "production", "serverless"],
  "observability": ["log", "metric", "trace", "otel", "opentelemetry", "alert", "monitor", "health check", "incident", "sentry", "datadog", "telemetry"],
  "migration-plan": ["migrate", "migration", "legacy", "cutover", "backfill", "dual-write", "parity", "strangler"],
  "compliance-privacy": ["compliance", "gdpr", "hipaa", "soc2", "pci", "pii", "phi", "privacy", "retention", "erasure", "delete account", "audit log", "consent"],
  "monorepo-topology": ["monorepo", "workspace", "turborepo", "nx", "pnpm", "shared package", "cross-package", "apps/"],
  "context-map": ["docs", "documentation", "context map", "manifest", "add md", "structure", "onboard"],
};

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

/**
 * Route an agent task to the minimal required subset of Markdown documents in a workspace.
 *
 * @param {string} workspaceDir
 * @param {string} taskDescription
 * @param {{ includeUpstream?: boolean }} [options]
 */
export function routeContextForTask(workspaceDir, taskDescription, options = {}) {
  const absDir = path.resolve(workspaceDir);
  const manifest = loadManifest(absDir);
  if (!manifest) {
    throw new Error(`No ${MANIFEST_FILENAME} found in ${absDir}. Initialize the workspace first.`);
  }

  const task = String(taskDescription || "").trim();
  if (!task) {
    throw new Error("A task description is required to route agent context.");
  }

  const includeUpstream = options.includeUpstream !== false;
  const taskLower = task.toLowerCase();
  const taskTokens = new Set(tokenize(task));

  const declById = new Map();
  const scoredDocs = [];
  let fullCorpusTokens = 0;

  for (const decl of manifest.documents || []) {
    declById.set(decl.id, decl);
    const fullPath = path.join(absDir, decl.path);
    const exists = fs.existsSync(fullPath);
    const content = exists ? fs.readFileSync(fullPath, "utf8") : "";
    const actualTokens = exists ? estimateTokens(content) : decl.tokenBudget?.target || 500;
    fullCorpusTokens += actualTokens;

    const parsed = exists ? parseFrontmatter(content) : { data: {} };
    const readTriggers = Array.isArray(parsed.data.read_triggers) ? parsed.data.read_triggers : [];

    let score = 0;
    const matchedReasons = [];

    if (decl.loadPolicy === "always") {
      score += 100;
      matchedReasons.push("load_policy: always (root control plane)");
    } else {
      // 1. Direct keyword matches from canonical domain dictionary
      const domainKeywords = DOMAIN_SIGNAL_KEYWORDS[decl.id] || [];
      const kwHits = domainKeywords.filter((kw) => taskLower.includes(kw));
      if (kwHits.length > 0) {
        score += Math.min(30, kwHits.length * 10);
        matchedReasons.push(`matched task signals: ${kwHits.slice(0, 4).join(", ")}`);
      }

      // 2. Overlap with frontmatter read_triggers & authority
      const triggerCorpus = [decl.authority || "", ...readTriggers].join(" ");
      const triggerTokens = new Set(tokenize(triggerCorpus));
      const overlap = [...taskTokens].filter(
        (t) => triggerTokens.has(t) && !["the", "and", "for", "with", "that", "from", "new", "add", "update", "fix", "code"].includes(t)
      );
      if (overlap.length > 0) {
        score += Math.min(20, overlap.length * 4);
        matchedReasons.push(`matched doc authority/triggers: ${overlap.slice(0, 4).join(", ")}`);
      }

      // 3. Explicit doc ID or filename mention in the task
      if (taskLower.includes(decl.id) || taskLower.includes(path.basename(decl.path).toLowerCase())) {
        score += 40;
        matchedReasons.push("explicitly referenced in task");
      }
    }

    scoredDocs.push({
      decl,
      actualTokens,
      score,
      matchedReasons,
      exists,
    });
  }

  const mustReadIds = new Set();
  const optionalIds = new Set();
  const entryById = new Map(scoredDocs.map((s) => [s.decl.id, s]));

  for (const item of scoredDocs) {
    if (item.decl.loadPolicy === "always" || item.score >= 12) {
      mustReadIds.add(item.decl.id);
    } else if (item.score >= 4) {
      optionalIds.add(item.decl.id);
    }
  }

  // Pull direct upstream dependencies (e.g., data-model for api-contract) as optional/supporting context
  if (includeUpstream) {
    for (const id of [...mustReadIds]) {
      const decl = declById.get(id);
      for (const depId of decl?.dependsOn || []) {
        if (declById.has(depId) && !mustReadIds.has(depId)) {
          // Promote data-model / architecture if directly required by a high-scoring child
          if (depId === "architecture" || depId === "data-model") {
            optionalIds.add(depId);
            const entry = entryById.get(depId);
            if (entry) entry.matchedReasons.push(`upstream dependency of '${id}'`);
          }
        }
      }
    }
  }

  // Sort results in canonical DAG order
  const mustRead = [];
  const optionalRead = [];
  const skipped = [];

  for (const item of scoredDocs) {
    const base = {
      order: item.decl.order,
      id: item.decl.id,
      path: item.decl.path,
      loadPolicy: item.decl.loadPolicy,
      estimatedTokens: item.actualTokens,
      authority: item.decl.authority,
      reasons: item.matchedReasons,
    };
    if (mustReadIds.has(item.decl.id)) {
      mustRead.push(base);
    } else if (optionalIds.has(item.decl.id)) {
      optionalRead.push(base);
    } else {
      skipped.push({
        id: item.decl.id,
        path: item.decl.path,
        estimatedTokens: item.actualTokens,
        reason: "Not triggered by this task; keep unloaded to preserve context window.",
      });
    }
  }

  const mustReadTokens = mustRead.reduce((acc, d) => acc + d.estimatedTokens, 0);
  const optionalTokens = optionalRead.reduce((acc, d) => acc + d.estimatedTokens, 0);
  const savedTokens = Math.max(0, fullCorpusTokens - mustReadTokens);
  const savingsPercent =
    fullCorpusTokens > 0 ? Math.round((savedTokens / fullCorpusTokens) * 100) : 0;

  return {
    workspaceDir: absDir,
    task,
    summary: {
      totalWorkspaceDocs: scoredDocs.length,
      mustReadCount: mustRead.length,
      optionalReadCount: optionalRead.length,
      skippedCount: skipped.length,
      mustReadTokens,
      withOptionalTokens: mustReadTokens + optionalTokens,
      fullCorpusTokens,
      savedTokens,
      contextSavingsPercent: savingsPercent,
    },
    mustRead,
    optionalRead,
    skipped,
  };
}
