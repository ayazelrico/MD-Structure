/**
 * Agent-Native Markdown Template & Frontmatter Renderer.
 *
 * Renders:
 * - Root AGENTS.md (always-on control plane + routing table + tailored invariants)
 * - docs/00-CONTEXT-MAP.md (rationale ledger + DAG + excluded docs matrix)
 * - All 22 domain/system/engineering/ops/governance Markdown specifications
 * - Thin agent shims (CLAUDE.md, Cursor rules, Copilot instructions, Windsurf rules)
 */

function yamlEscape(value) {
  const str = String(value ?? "");
  if (/[:#[\]{}&*!|>'"%@`\n]/.test(str) || str.trim() !== str) {
    return JSON.stringify(str);
  }
  return str;
}

/**
 * Render canonical YAML frontmatter for an agent-native Markdown document.
 * @param {object} doc Blueprint document entry
 * @param {{ status?: "draft" | "approved" }} [opts]
 */
export function renderFrontmatter(doc, opts = {}) {
  const status = opts.status || "draft";
  const lines = [
    "---",
    `id: ${doc.id}`,
    `title: ${yamlEscape(doc.title)}`,
    `status: ${status}`,
    `layer: ${doc.layer}`,
    `priority: ${doc.priority}`,
    `load_policy: ${doc.loadPolicy}`,
    "token_budget:",
    `  target: ${doc.tokenBudget.target}`,
    `  max: ${doc.tokenBudget.max}`,
    `authority: ${yamlEscape(doc.authority)}`,
  ];

  if (doc.dependsOn && doc.dependsOn.length > 0) {
    lines.push("depends_on:");
    for (const dep of doc.dependsOn) {
      lines.push(`  - ${dep}`);
    }
  } else {
    lines.push("depends_on: []");
  }

  lines.push("read_triggers:");
  for (const trigger of doc.readTriggers) {
    lines.push(`  - ${yamlEscape(trigger)}`);
  }

  lines.push("update_triggers:");
  for (const trigger of doc.updateTriggers) {
    lines.push(`  - ${yamlEscape(trigger)}`);
  }

  lines.push("---");
  return lines.join("\n");
}

/**
 * Generate capability-tailored non-negotiable invariants for AGENTS.md.
 * @param {object} blueprint
 * @returns {string[]}
 */
function buildTailoredInvariants(blueprint) {
  const capIds = new Set(blueprint.project.capabilities.map((c) => c.id));
  const invariants = [
    "**Spec-Before-Code:** Read every upstream document matching your task's `read_triggers` before writing or refactoring code.",
    "**Single Source of Truth:** Never duplicate schemas, API shapes, or rules across multiple `.md` files; link to the owning authority doc.",
    "**Progressive Disclosure:** Keep `AGENTS.md` under its token budget. Put deep detail in the owning domain document, not here.",
  ];

  if (capIds.has("multi-tenant")) {
    invariants.push(
      "**Strict Tenant Isolation:** Every database query, cache key, and file path touching tenant data MUST explicitly enforce `tenant_id` scoping."
    );
  }
  if (capIds.has("auth-rbac")) {
    invariants.push(
      "**Default-Deny Authorization:** Every non-public route or mutation MUST verify authentication and role/permission scope explicitly."
    );
  }
  if (capIds.has("payments-billing")) {
    invariants.push(
      "**Idempotent Financial Operations:** Every payment mutation and webhook handler MUST enforce idempotency keys and cryptographic signature verification."
    );
  }
  if (capIds.has("ai-llm-agents")) {
    invariants.push(
      "**Bounded AI Execution:** Every LLM/agent loop MUST enforce max steps, token/cost ceilings, schema validation, and explicit permission gates on write tools."
    );
  }
  if (capIds.has("compliance-pii")) {
    invariants.push(
      "**Zero PII in Logs or Unapproved Processors:** Never log raw PII/PHI/secrets; verify retention and audit-trail rules before touching user data."
    );
  }
  if (capIds.has("cli-interface")) {
    invariants.push(
      "**Machine-Readable CLI Discipline:** In `--json` mode, `stdout` MUST emit strictly valid JSON only; send diagnostics/errors to `stderr` with deterministic exit codes."
    );
  }
  if (capIds.has("offline-local-first")) {
    invariants.push(
      "**No Silent Data Loss Offline:** All local mutations MUST follow the defined outbox/conflict-resolution policy before syncing."
    );
  }

  return invariants;
}

/**
 * Render the root AGENTS.md entrypoint.
 * @param {object} blueprint
 * @param {object} doc
 */
function renderAgentsEntry(blueprint, doc) {
  const { project, summary, documents } = blueprint;
  const fm = renderFrontmatter(doc, { status: "approved" });
  const invariants = buildTailoredInvariants(blueprint);
  const capsList = project.capabilities.map((c) => `\`${c.id}\``).join(", ") || "none";
  const stackLine = project.stack.length > 0 ? project.stack.join(", ") : "<!-- AGENT:FILL stack -->";

  const routingRows = documents
    .filter((d) => d.id !== "agents-entry")
    .map((d) => {
      const trigger = d.readTriggers[0] || "When touching this domain";
      return `| [${d.path}](./${d.path}) | \`${d.loadPolicy}\` | ${d.tokenBudget.target}t | ${d.authority} | ${trigger} |`;
    })
    .join("\n");

  return `${fm}

# AGENTS.md — ${project.name}

> **Agent Control Plane** | Archetype: \`${project.archetype.id}\` | Tier: \`${project.tier.id} (${project.tier.name})\` | Risk: \`${project.riskLevel}\`

## 1. Project Identity & Mission

- **Project:** ${project.name} (\`${project.slug}\`)
- **Idea Summary:** ${project.idea || "<!-- AGENT:FILL one-paragraph mission statement -->"}
- **Active Capabilities:** ${capsList}
- **Tech Stack:** ${stackLine}
- **Documentation Footprint:** ${summary.totalDocuments} active MDs (${summary.byLoadPolicy.always} always-on, ${summary.totalDocuments - summary.byLoadPolicy.always} progressive-disclosure; ~${summary.tokenLedger.alwaysOnTargetTokens} always-on tokens).

## 2. Document Routing Map (Progressive Disclosure)

Load **only** the documents whose read trigger matches your current task:

| Document | Load Policy | Target Budget | Source-of-Truth Authority | Primary Read Trigger |
| :--- | :--- | :--- | :--- | :--- |
${routingRows}

## 3. Non-Negotiable Invariants

${invariants.map((inv, i) => `${i + 1}. ${inv}`).join("\n")}

## 4. Workspace Commands & Verification Gate

Run these exact commands before declaring any task complete:

\`\`\`bash
# Install dependencies
<!-- AGENT:FILL install-cmd (e.g., npm install) -->

# Run local development
<!-- AGENT:FILL dev-cmd (e.g., npm run dev) -->

# Run automated tests & verification gate
<!-- AGENT:FILL test-cmd (e.g., npm test) -->

# Lint / Typecheck / Build
<!-- AGENT:FILL build-cmd (e.g., npm run build) -->
\`\`\`

## 5. Agent Execution & Anti-Drift Protocol

1. **Authoring Phase:** Fill documents in strict dependency DAG order (run \`md-structure next --json\` to get the next doc). Flip \`status: draft\` to \`status: approved\` once finalized.
2. **Implementation Phase:** Before editing code, inspect the relevant authority MD in Section 2. Never invent schemas, routes, or error codes not recorded in the spec.
3. **Sync Rule:** If an implementation change alters an architectural boundary, schema, API, or invariant, update the owning MD in the same commit.
4. **Audit Gate:** Run \`md-structure audit --json\` to confirm zero unresolved directives, valid frontmatter, and compliance with token budgets.
`;
}

/**
 * Render docs/00-CONTEXT-MAP.md — the architectural rationale ledger.
 * @param {object} blueprint
 * @param {object} doc
 */
function renderContextMap(blueprint, doc) {
  const { project, summary, documents, excludedDocuments, authoringPhases, whyThisStructure } = blueprint;
  const fm = renderFrontmatter(doc, { status: "approved" });

  const activeRows = documents
    .map((d) => {
      const deps = d.dependsOn.length > 0 ? d.dependsOn.map((x) => `\`${x}\``).join(", ") : "—";
      const why = d.selectionReasons.join(" ");
      return `| ${d.order} | \`${d.id}\` | [${d.path}](../${d.path}) | \`${d.loadPolicy}\` | ${d.tokenBudget.target}/${d.tokenBudget.max} | ${deps} | ${why} |`;
    })
    .join("\n");

  const excludedRows = excludedDocuments
    .map((ex) => `| \`${ex.id}\` | ${ex.title} | \`${ex.layer}\` | ${ex.skipReason} |`)
    .join("\n");

  // Mermaid DAG edges
  const dagEdges = [];
  for (const d of documents) {
    for (const dep of d.dependsOn) {
      dagEdges.push(`  ${dep.replace(/-/g, "_")}["${dep}"] --> ${d.id.replace(/-/g, "_")}["${d.id}"]`);
    }
  }
  const mermaidBlock =
    dagEdges.length > 0
      ? `\`\`\`mermaid\nflowchart LR\n${dagEdges.join("\n")}\n\`\`\``
      : "_Single root document; no dependency edges._";

  const phaseList = authoringPhases
    .map((p) => `- **Phase ${p.phase} — ${p.name}:** ${p.docIds.map((id) => `\`${id}\``).join(" -> ")} _(${p.description})_`)
    .join("\n");

  return `${fm}

# Context Map & Architectural Rationale Ledger

> **Why this exact MD structure?** ${whyThisStructure.headline}

## 1. Architecture Blueprint Summary

| Metric | Value | Notes |
| :--- | :--- | :--- |
| **Project** | ${project.name} (\`${project.slug}\`) | ${project.archetype.label} |
| **Complexity Tier** | \`${project.tier.id}\` — ${project.tier.name} | Complexity score: ${project.tier.complexityScore} (Risk: \`${project.riskLevel}\`) |
| **Active MD Count** | **${summary.totalDocuments}** documents | Tier target range: ${summary.recommendedRangeForTier[0]}–${summary.recommendedRangeForTier[1]} |
| **Excluded MD Count** | **${summary.excludedDocuments}** catalog archetypes skipped | Prevents context bloat & premature abstraction |
| **Always-On Budget** | ~${summary.tokenLedger.alwaysOnTargetTokens} tokens (max ${summary.tokenLedger.alwaysOnMaxTokens}) | Tier limit: ${summary.tokenLedger.alwaysOnTierLimit} tokens |
| **Total Corpus Budget** | ~${summary.tokenLedger.totalTargetTokens} tokens (max ${summary.tokenLedger.totalMaxTokens}) | Loaded progressively on demand |

**Context Engineering Principle:** ${whyThisStructure.contextEngineeringPrinciple}

## 2. Active Document Matrix & Selection Rationale

| # | ID | Path | Load Policy | Target/Max Tokens | Depends On | Why Included |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${activeRows}

## 3. Document Dependency DAG & Authoring Order

${mermaidBlock}

### Recommended Agent Authoring Phases

${phaseList}

## 4. Intentionally Excluded Documents (Do Not Create Unless Scope Changes)

${whyThisStructure.antiBloatGuard}

| Excluded ID | Title | Layer | Why Intentionally Skipped |
| :--- | :--- | :--- | :--- |
${excludedRows}

## 5. Source-of-Truth Conflict Resolution Hierarchy

When two documents appear to conflict, the higher-precedence authority wins and the lower document MUST be updated:

1. \`AGENTS.md\` — Global invariants & routing
2. \`01-PRD.md\` & \`01B-DOMAIN-GLOSSARY.md\` — Scope, requirements & canonical terms
3. \`02-ARCHITECTURE.md\` — Structural topology & module boundaries
4. \`03-DATA-MODEL.md\` & \`04-API-CONTRACT.md\` — Exact persistence & wire contracts
5. Specialized system/engineering/ops docs — Deep contracts within their declared \`authority\`

---

_Architected with **MD-Structure** by **Ayazelrico**._
`;
}

/**
 * Specialized section scaffolding bodies tailored by doc ID so generated files
 * have crisp, machine-useful tables and checklists rather than generic blank lines.
 */
function renderSpecializedBody(blueprint, doc) {
  const { project } = blueprint;
  const caps = project.capabilities.map((c) => c.id);

  switch (doc.id) {
    case "prd":
      return `## 1. Problem Statement & Value Proposition

- **Core Problem:** <!-- AGENT:FILL Describe the exact pain point this project solves in 2-3 sentences based on: "${project.idea || project.name}" -->
- **Primary Outcome:** <!-- AGENT:FILL Measurable outcome that proves V1 succeeded -->
- **Success Metrics:**
  - <!-- AGENT:FILL Metric 1 (quantifiable) -->
  - <!-- AGENT:FILL Metric 2 (quantifiable) -->

## 2. Target Users & Personas

| Persona | Role / Context | Primary Goal | Key Constraint |
| :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL Primary Persona --> | <!-- AGENT:FILL Context --> | <!-- AGENT:FILL Goal --> | <!-- AGENT:FILL Constraint --> |

## 3. Core Functional Requirements (P0 / P1)

| Req ID | Priority | Requirement | Verifiable Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| REQ-001 | P0 | <!-- AGENT:FILL Core capability 1 --> | <!-- AGENT:FILL Pass/fail assertion --> |
| REQ-002 | P0 | <!-- AGENT:FILL Core capability 2 --> | <!-- AGENT:FILL Pass/fail assertion --> |
| REQ-003 | P1 | <!-- AGENT:FILL Secondary capability --> | <!-- AGENT:FILL Pass/fail assertion --> |

## 4. Explicit Non-Goals (Out of Scope for V1)

- <!-- AGENT:FILL Non-goal 1 (what the agent must NOT build yet) -->
- <!-- AGENT:FILL Non-goal 2 -->
- <!-- AGENT:FILL Non-goal 3 -->

## 5. Primary User Journeys & Edge Cases

1. **Happy Path:** <!-- AGENT:FILL Trigger -> Steps -> Expected visible outcome -->
2. **Failure / Recovery Path:** <!-- AGENT:FILL Invalid input, empty state, network/tool failure handling -->
3. **Edge Cases:** <!-- AGENT:FILL Concurrency, permissions, rate limits, or boundary conditions -->`;

    case "architecture":
      return `## 1. Tech Stack & Runtime Matrix

| Layer | Technology / Version | Responsibility | Rationale |
| :--- | :--- | :--- | :--- |
| Runtime / Language | <!-- AGENT:FILL e.g. Node 22 / TypeScript 5.x --> | Core execution | <!-- AGENT:FILL Why chosen --> |
| Framework / Transport | <!-- AGENT:FILL Framework --> | Routing / UI / CLI | <!-- AGENT:FILL Why chosen --> |
| Persistence / State | <!-- AGENT:FILL DB / Storage or N/A --> | Durable state | <!-- AGENT:FILL Why chosen --> |
| Testing | <!-- AGENT:FILL Test runner --> | Automated verification | <!-- AGENT:FILL Why chosen --> |

## 2. High-Level System Topology

\`\`\`mermaid
flowchart TD
  Client["Client / Caller"] --> Entry["Entry Layer"]
  Entry --> Core["Domain / Core Engine"]
  Core --> Storage["Persistence / External Boundary"]
\`\`\`

<!-- AGENT:FILL Replace the placeholder topology above with the exact runtime components for ${project.name} -->

## 3. Directory & Module Ownership Map

| Directory / Module | Single Responsibility | Allowed Imports | Forbidden Imports |
| :--- | :--- | :--- | :--- |
| \`src/core/\` | Pure domain logic & invariants | Standard library, \`src/types/\` | UI, HTTP, DB drivers |
| <!-- AGENT:FILL module-2 --> | <!-- AGENT:FILL responsibility --> | <!-- AGENT:FILL allowed --> | <!-- AGENT:FILL forbidden --> |

## 4. Key Data & Control Flows

1. **Primary Flow:** <!-- AGENT:FILL Step-by-step call chain from entrypoint to output -->
2. **Error Propagation Flow:** <!-- AGENT:FILL How domain errors map to caller-facing errors -->

## 5. Architectural Constraints & Anti-Patterns

- **DO NOT** create circular dependencies between domain modules and transport layers.
- <!-- AGENT:FILL Project-specific architectural constraint 1 -->
- <!-- AGENT:FILL Project-specific architectural constraint 2 -->`;

    case "data-model":
      return `## 1. Storage Engine & Modeling Strategy

- **Primary Store:** <!-- AGENT:FILL Database engine & version -->
- **Query / ORM Layer:** <!-- AGENT:FILL ORM or SQL query builder -->
- **Primary Key Strategy:** <!-- AGENT:FILL UUIDv7 / ULID / BigInt -->
- **Timestamps & Deletion:** <!-- AGENT:FILL UTC ISO-8601, created_at/updated_at, hard vs soft delete -->

## 2. Entity-Relationship Overview

\`\`\`mermaid
erDiagram
  ENTITY_A ||--o{ ENTITY_B : owns
\`\`\`

<!-- AGENT:FILL Replace with exact entities and cardinalities -->

## 3. Core Schema Definitions

### Entity: <!-- AGENT:FILL Primary Entity Name -->

| Column / Field | Type | Nullable | Constraints / Default | Index / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| \`id\` | <!-- AGENT:FILL type --> | No | PK | Primary lookup |
${caps.includes("multi-tenant") ? "| `tenant_id` | <!-- AGENT:FILL type --> | No | FK -> tenants.id | Mandatory tenant isolation index |\n" : ""}| \`created_at\` | timestamp | No | default now() | Ordering / audit |

## 4. Tenancy, Access & Integrity Rules

- <!-- AGENT:FILL Transaction boundaries, foreign key cascades, and tenant/ownership scoping rules -->

## 5. Schema Evolution & Migration Policy

- **Migration Tool:** <!-- AGENT:FILL Tool & command -->
- **Zero-Downtime Rule:** <!-- AGENT:FILL Expand-contract policy for breaking column changes -->`;

    case "api-contract":
      return `## 1. API Conventions & Envelope Standard

- **Protocol & Versioning:** <!-- AGENT:FILL REST /api/v1, GraphQL, tRPC, etc. -->
- **Naming Style:** <!-- AGENT:FILL snake_case or camelCase JSON fields -->
- **Pagination Standard:** <!-- AGENT:FILL cursor-based with limit & nextCursor -->
- **Standard Error Envelope:**

\`\`\`json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable explanation",
    "requestId": "req_01...",
    "retryable": false
  }
}
\`\`\`

## 2. Authentication & Rate-Limiting Headers

- **Auth Header:** <!-- AGENT:FILL Bearer JWT / Session Cookie / X-API-Key -->
- **Idempotency:** <!-- AGENT:FILL Idempotency-Key header rules for mutations -->
- **Rate Limiting:** <!-- AGENT:FILL Quotas & Retry-After behavior -->

## 3. Endpoint & Event Catalog

| Method & Path | Auth Scope | Request Schema | Success Response | Error Codes |
| :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL POST /api/v1/... --> | <!-- AGENT:FILL scope --> | <!-- AGENT:FILL payload --> | <!-- AGENT:FILL 201 payload --> | \`400\`, \`401\`, \`409\` |

## 4. Error Code Taxonomy

| Error Code | HTTP Status | Retryable | Meaning & Caller Action |
| :--- | :--- | :--- | :--- |
| \`VALIDATION_ERROR\` | 400 | No | Invalid input; inspect field details |
| \`UNAUTHORIZED\` | 401 | No | Missing or expired credentials |
| \`FORBIDDEN\` | 403 | No | Authenticated principal lacks required permission |
| \`CONFLICT\` | 409 | No | State or idempotency conflict |
| \`RATE_LIMITED\` | 429 | Yes | Back off using \`Retry-After\` |`;

    case "ai-agent-spec":
      return `## 1. Agent Topology & Model Routing

| Agent / Step | Role | Primary Model | Fallback Model | Max Steps / Token Cap |
| :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL orchestrator --> | <!-- AGENT:FILL role --> | <!-- AGENT:FILL model --> | <!-- AGENT:FILL fallback --> | <!-- AGENT:FILL cap --> |

## 2. Tool & MCP Interface Contracts

| Tool Name | Side Effect | Input Schema Summary | Output Contract | Permission Gate |
| :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL tool_name --> | \`read\` / \`write\` | <!-- AGENT:FILL params --> | <!-- AGENT:FILL return --> | <!-- AGENT:FILL auto / user-confirm --> |

## 3. Context, Memory & Retrieval (RAG) Design

- **Context Window Strategy:** <!-- AGENT:FILL Progressive disclosure, compaction, and token ceilings -->
- **Memory Persistence:** <!-- AGENT:FILL Ephemeral turn state vs. durable store -->
- **Retrieval / Indexing:** <!-- AGENT:FILL Chunking, hybrid search, citation requirements, or N/A -->

## 4. Guardrails, Safety & Failure Handling

- **Prompt Injection Defense:** <!-- AGENT:FILL Untrusted data isolation & schema validation -->
- **Loop & Cost Breakers:** <!-- AGENT:FILL Max tool calls, timeout, and max USD/tokens per run -->
- **Structured Output Validation:** <!-- AGENT:FILL JSON Schema validation & retry ceiling -->

## 5. Evaluation Strategy & Golden Benchmarks

| Eval Suite | Dataset Size | Pass Threshold | Run Command |
| :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL core-accuracy --> | <!-- AGENT:FILL N cases --> | <!-- AGENT:FILL >= 95% --> | <!-- AGENT:FILL cmd --> |`;

    case "auth-permissions":
      return `## 1. Identity & Session Architecture

- **Identity Provider / Mechanism:** <!-- AGENT:FILL Clerk / Auth0 / Better Auth / JWT / API Keys -->
- **Session Lifecycle:** <!-- AGENT:FILL Access TTL, refresh rotation, revocation rules -->
- **Service / Machine Auth:** <!-- AGENT:FILL Scoped API keys or M2M tokens -->

## 2. Role & Permission Matrix

| Resource | Owner / Admin | Member / Editor | Viewer / Read-Only | Unauthenticated |
| :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL Resource 1 --> | CRUD + Manage | CRU | R | Deny |
| <!-- AGENT:FILL Resource 2 --> | CRUD | R | R | Deny |

## 3. Tenant Isolation Enforcement

- **Enforcement Point:** <!-- AGENT:FILL Middleware + Repository layer + Database RLS -->
- **Cross-Tenant Access Rule:** Return \`404 Not Found\` (not \`403\`) for unknown tenant resource IDs to prevent enumeration.
- **Verification Test:** <!-- AGENT:FILL Mandatory negative integration test proving Tenant A cannot read/mutate Tenant B data -->`;

    case "security-model":
      return `## 1. Trust Boundaries & Asset Classification

| Asset / Data Class | Classification | Storage & Transit Protection | Untrusted Entry Points |
| :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL User credentials / keys --> | Restricted | Hashed / encrypted + TLS | Auth / Webhook endpoints |
| <!-- AGENT:FILL Primary domain data --> | Confidential | Encrypted at rest + scoped queries | API / UI inputs |

## 2. Threat Matrix & Required Controls

| Threat Vector | Concrete Risk | Mandatory Code-Level Control | Verification Method |
| :--- | :--- | :--- | :--- |
| Injection (SQL/Cmd/Prompt) | Data breach or RCE | Parameterized queries, strict schema validation, no \`eval\` | Static check + negative tests |
| Broken Access Control (IDOR) | Cross-user/tenant access | Central authorization guard on every handler | Integration auth tests |
| Secret Leakage | Compromised vendor accounts | Env/secret manager only; redact from logs/errors | Secret scanner in CI |
| <!-- AGENT:FILL Domain-specific threat --> | <!-- AGENT:FILL risk --> | <!-- AGENT:FILL control --> | <!-- AGENT:FILL verification --> |

## 3. Secrets, Encryption & Supply Chain

- **Secrets Policy:** Never commit \`.env\` or keys; define all required secrets in the runbook.
- **Dependency Hygiene:** <!-- AGENT:FILL Lockfile enforcement, audit command, minimal dependency policy -->`;

    case "testing-strategy":
      return `## 1. Verification Pyramid & Change-to-Test Matrix

| Change Class | Unit Tests | Integration Tests | Contract / E2E Tests | Required Command |
| :--- | :--- | :--- | :--- | :--- |
| Core domain logic | Mandatory | Recommended | Optional | <!-- AGENT:FILL unit cmd --> |
| Schema / API / Auth change | Mandatory | Mandatory | Mandatory | <!-- AGENT:FILL full cmd --> |
| Bug fix | Mandatory regression test | If cross-boundary | If user-facing | <!-- AGENT:FILL test cmd --> |

## 2. Mocking & Test Data Rules

- **Do NOT Mock:** <!-- AGENT:FILL Core domain logic, validation schemas, local test DB where feasible -->
- **Always Mock / Sandbox:** <!-- AGENT:FILL Paid third-party APIs, payment gateways, outbound emails -->
- **Fixtures & Determinism:** Tests must be deterministic, isolated, and runnable offline in CI.

## 3. Critical Invariant Test Checklist

- [ ] <!-- AGENT:FILL Critical invariant 1 (e.g., tenant isolation negative test) -->
- [ ] <!-- AGENT:FILL Critical invariant 2 (e.g., idempotency / retry safety) -->
- [ ] <!-- AGENT:FILL Critical invariant 3 (e.g., error envelope & exit code stability) -->`;

    case "domain-glossary":
      return `## 1. Canonical Terms & Forbidden Synonyms

| Canonical Term | Code Identifier | Exact Definition | Forbidden Aliases |
| :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL Primary Entity --> | \`<!-- AGENT:FILL identifier -->\` | <!-- AGENT:FILL Precise definition --> | <!-- AGENT:FILL Banned synonyms --> |
| <!-- AGENT:FILL Secondary Entity --> | \`<!-- AGENT:FILL identifier -->\` | <!-- AGENT:FILL Precise definition --> | <!-- AGENT:FILL Banned synonyms --> |

## 2. Domain Business Rules & Invariants

| Rule ID | Invariant Statement | Enforcement Point |
| :--- | :--- | :--- |
| BR-001 | <!-- AGENT:FILL Unbreakable business calculation or ownership law --> | <!-- AGENT:FILL Module / DB constraint --> |
| BR-002 | <!-- AGENT:FILL Rounding, currency, timezone, or status rule --> | <!-- AGENT:FILL Module / validator --> |

## 3. Bounded Contexts

- <!-- AGENT:FILL List subsystem boundaries where domain entities have distinct representations -->`;

    case "ui-design-system":
      return `## 1. Visual Language & Design Tokens

| Token Group | Values / Scale | Semantic Usage |
| :--- | :--- | :--- |
| Typography | <!-- AGENT:FILL Display / Body / Mono fonts & scale --> | Headings, prose, code/data |
| Color Semantics | <!-- AGENT:FILL Surface, text, primary, danger, warning, success --> | Never hardcode arbitrary hex values |
| Spacing & Radius | <!-- AGENT:FILL 4px/8px grid, border-radius scale --> | Consistent layout density |

## 2. Navigation & Screen Inventory

| Route / Screen | Layout Shell | Auth / Role Guard | Primary User Action |
| :--- | :--- | :--- | :--- |
| \`/\` | <!-- AGENT:FILL Shell --> | <!-- AGENT:FILL Public / Auth --> | <!-- AGENT:FILL Core CTA --> |
| <!-- AGENT:FILL /app/... --> | <!-- AGENT:FILL Shell --> | <!-- AGENT:FILL Guard --> | <!-- AGENT:FILL Action --> |

## 3. Component Primitives & Mandatory State Coverage

Every data-driven screen and primitive MUST handle all 5 states:
- **Loading:** <!-- AGENT:FILL Skeleton / spinner contract -->
- **Empty:** <!-- AGENT:FILL Clear zero-state + primary action -->
- **Error:** <!-- AGENT:FILL Actionable error banner + retry -->
- **Partial / Optimistic:** <!-- AGENT:FILL Pending mutation feedback -->
- **Success:** <!-- AGENT:FILL Final rendered state -->

## 4. Accessibility & Interaction Standards

- **Target Standard:** WCAG 2.1 AA minimum.
- **Keyboard & Focus:** <!-- AGENT:FILL Focus trap in modals, keyboard shortcuts, aria-live error regions -->`;

    case "cli-ux-spec":
      return `## 1. Command Grammar & Subcommand Tree

\`\`\`text
${project.slug} <command> [arguments] [options]
\`\`\`

| Subcommand | Positional Args | Key Flags | Side Effects |
| :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL cmd-1 --> | <!-- AGENT:FILL args --> | \`--json\`, \`--help\` | Read-only / Writes files |
| <!-- AGENT:FILL cmd-2 --> | <!-- AGENT:FILL args --> | \`--json\`, \`--dry-run\` | <!-- AGENT:FILL effect --> |

## 2. Machine Output (\`--json\`) & Stream Discipline

- **\`stdout\`:** Strictly valid JSON in \`--json\` mode (no ANSI codes, banners, or progress logs).
- **\`stderr\`:** Human diagnostics, warnings, and structured error JSON on failure.
- **Non-Interactive Guarantee:** Never hang waiting on TTY prompts when required flags are supplied or stdin is non-TTY.

## 3. Exit Code Contract

| Exit Code | Meaning | Caller / Agent Action |
| :--- | :--- | :--- |
| \`0\` | Success | Parse stdout result |
| \`1\` | Usage / invalid input / runtime error | Read stderr error message and fix invocation |
| \`2\` | Policy / validation / audit gate failure | Inspect structured findings and remediate |

## 4. Configuration Precedence

1. Explicit CLI flags (highest priority)
2. Environment variables (\`<!-- AGENT:FILL ENV_PREFIX_* -->\`)
3. Local project config file (\`<!-- AGENT:FILL config filename -->\`)
4. Deterministic built-in defaults`;

    case "sdk-public-api":
      return `## 1. Export Map & Public Surface

| Entrypoint / Export | Stability | Responsibility | Internal-Only Boundary |
| :--- | :--- | :--- | :--- |
| \`.\` (root) | Stable | <!-- AGENT:FILL Primary exports --> | Never export internal helpers |
| <!-- AGENT:FILL subpath --> | Beta / Stable | <!-- AGENT:FILL Subpath exports --> | <!-- AGENT:FILL Internal boundary --> |

## 2. Core Interfaces & Consumer Ergonomics

\`\`\`ts
// <!-- AGENT:FILL Minimal canonical consumer usage snippet for ${project.name} -->
\`\`\`

- **Typed Errors:** <!-- AGENT:FILL Exported error classes and error codes -->
- **Runtime / Bundle Constraints:** <!-- AGENT:FILL Node/Browser/Edge targets, ESM/CJS, tree-shaking, dependency limits -->

## 3. Versioning, Deprecation & Compatibility

- **SemVer Contract:** Breaking changes require a major version bump and migration note.
- **Deprecation Window:** <!-- AGENT:FILL Deprecation policy before removal -->`;

    case "plugin-architecture":
      return `## 1. Execution Contexts & Trust Isolation

| Context | Trust Level | Capabilities / APIs Allowed | Forbidden Access |
| :--- | :--- | :--- | :--- |
| Host / Core | Trusted | Full runtime & lifecycle orchestration | Never execute unvalidated plugin payloads as code |
| Plugin / Extension | Sandboxed / Restricted | Declared hook APIs & messaging bridge | Direct host internals, arbitrary secrets |

## 2. Manifest & Lifecycle Hook Contract

| Lifecycle Phase | Hook / Event | Execution Order | Failure Containment |
| :--- | :--- | :--- | :--- |
| Discovery & Validation | \`manifest\` schema check | Pre-load | Reject invalid plugin without crashing host |
| Activation | \`<!-- AGENT:FILL onActivate -->\` | Deterministic registration order | Isolate & disable failing plugin |
| Teardown | \`<!-- AGENT:FILL onDeactivate -->\` | Reverse order | Clean up listeners/handles |

## 3. Permission Model & Sandboxing

- **Capability Declarations:** <!-- AGENT:FILL Least-privilege permissions declared in plugin manifest -->
- **IPC / Message Contract:** <!-- AGENT:FILL Strict typed message envelope between contexts -->`;

    case "state-workflows":
      return `## 1. State Machines & Allowed Transitions

\`\`\`mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Active : submit
  Active --> Completed : finish
  Active --> Failed : error
\`\`\`

| Entity | From State | Event / Trigger | To State | Guard Condition | Side Effect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL Entity --> | \`draft\` | \`submit\` | \`active\` | <!-- AGENT:FILL Guard --> | <!-- AGENT:FILL Side effect --> |
| <!-- AGENT:FILL Entity --> | \`active\` | \`fail\` | \`failed\` | <!-- AGENT:FILL Guard --> | <!-- AGENT:FILL Compensation --> |

## 2. Async Queues, Workers & Schedules

| Queue / Job | Trigger | Idempotency Key | Concurrency / Timeout | Retry & Backoff | Dead-Letter Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL job-name --> | <!-- AGENT:FILL Event / Cron --> | <!-- AGENT:FILL Key formula --> | <!-- AGENT:FILL Limits --> | Exponential (max 5) | <!-- AGENT:FILL DLQ & alert --> |

## 3. Failure Recovery & Compensation

- **Replay Safety:** Every consumer handler MUST be safe to execute at-least-once.
- **Manual Recovery:** <!-- AGENT:FILL Safe replay or compensation command -->`;

    case "offline-sync":
      return `## 1. Local Storage Engine & Durability

- **On-Device Store:** <!-- AGENT:FILL SQLite / IndexedDB / local files -->
- **Encryption & Quota:** <!-- AGENT:FILL Local encryption & storage eviction guard -->
- **Schema Upgrade Path:** <!-- AGENT:FILL Versioned local migration runner on app launch -->

## 2. Sync Protocol & Mutation Queue

| Queue Operation | Payload Contract | Idempotency ID | Ordering Guarantee | Retry Strategy |
| :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL create/update/delete --> | <!-- AGENT:FILL Delta/envelope --> | Client UUIDv7 | Per-entity FIFO | Exponential on reconnect |

## 3. Conflict Resolution Policy

| Entity / Field | Resolution Strategy | Tie-Breaker | User Notification |
| :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL Entity 1 --> | LWW / Field Merge / CRDT | Server logical clock / HLC | Silent or conflict banner |
| <!-- AGENT:FILL Entity 2 --> | <!-- AGENT:FILL Strategy --> | <!-- AGENT:FILL Tie-breaker --> | <!-- AGENT:FILL UX behavior --> |`;

    case "integrations":
      return `## 1. External Provider Matrix

| Provider | Purpose | Pinned API / SDK Version | Auth Method | Rate Limits | Owning Adapter Module |
| :--- | :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL Vendor 1 --> | <!-- AGENT:FILL Capability --> | <!-- AGENT:FILL Version --> | <!-- AGENT:FILL API Key / OAuth --> | <!-- AGENT:FILL Quota --> | \`src/integrations/...\` |

## 2. Inbound Webhooks & Verification

| Webhook Source | Signature Header & Algorithm | Replay Window | Deduplication Store | Async Handoff |
| :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL Vendor --> | <!-- AGENT:FILL HMAC-SHA256 --> | 5 minutes | Event ID unique table | Enqueue & return \`200\` fast |

## 3. Resilience, Sandboxing & Mocking

- **Timeouts & Circuit Breakers:** <!-- AGENT:FILL Per-provider timeout (e.g., 5s) and fallback behavior -->
- **Local Dev & CI Mocking:** <!-- AGENT:FILL Deterministic stub/fixture server; never call live paid APIs in tests -->`;

    case "conventions":
      return `## 1. Naming & File Structure Rules

| Artifact | Convention | Example |
| :--- | :--- | :--- |
| Files & Directories | <!-- AGENT:FILL kebab-case / camelCase --> | \`<!-- AGENT:FILL example -->\` |
| Types / Classes | PascalCase | \`InvoiceRecord\` |
| Constants / Env Vars | SCREAMING_SNAKE_CASE | \`MAX_RETRY_ATTEMPTS\` |
| Test Files | <!-- AGENT:FILL *.test.ts / *.spec.ts --> | \`planner.test.js\` |

## 2. Error Handling & Logging Standard

- **Typed Domain Errors:** <!-- AGENT:FILL Standard error class/code pattern; never swallow errors silently -->
- **Structured Logging:** <!-- AGENT:FILL JSON log format, required correlation fields, ban raw console.log in prod -->

## 3. Dependency & Refactoring Discipline

- **Adding Packages:** Justify bundle/runtime cost; prefer standard library before adding dependencies.
- **Code Cohesion:** <!-- AGENT:FILL Module size guidelines, pure core vs side-effect adapters -->`;

    case "performance-budgets":
      return `## 1. Quantitative SLOs & Budgets

| Metric | Target (p50 / p95) | Hard Ceiling (p99 / Max) | Measurement Method |
| :--- | :--- | :--- | :--- |
| API / Core Latency | <!-- AGENT:FILL e.g. <50ms / <150ms --> | <!-- AGENT:FILL e.g. <400ms --> | <!-- AGENT:FILL Benchmark / APM --> |
| Memory / Bundle Ceiling | <!-- AGENT:FILL Target --> | <!-- AGENT:FILL Hard cap --> | <!-- AGENT:FILL Profiler / bundler --> |
| Throughput / Concurrency | <!-- AGENT:FILL Target RPS --> | <!-- AGENT:FILL Peak load --> | <!-- AGENT:FILL Load test cmd --> |

## 2. Caching & Query Efficiency Rules

- **Caching Strategy:** <!-- AGENT:FILL Key format, TTLs, stampede protection, invalidation events -->
- **Query Hygiene:** Zero unbounded \`SELECT *\` scans; enforce cursor pagination caps and index every hot filter/join.

## 3. Benchmarking & Profiling Commands

\`\`\`bash
# <!-- AGENT:FILL Reproducible local benchmark command -->
\`\`\``;

    case "adr-log":
      return `## 1. Architecture Decision Index

| ADR ID | Date | Status | Decision Summary |
| :--- | :--- | :--- | :--- |
| ADR-001 | <!-- AGENT:FILL YYYY-MM-DD --> | Accepted | <!-- AGENT:FILL Core runtime / storage architecture choice --> |

## 2. Recorded Decisions

### ADR-001: <!-- AGENT:FILL Decision Title -->

- **Status:** Accepted
- **Context:** <!-- AGENT:FILL Technical constraint or requirement driving this decision -->
- **Decision:** <!-- AGENT:FILL Chosen option -->
- **Rejected Alternatives:** <!-- AGENT:FILL Option B & C and exact reasons they were rejected -->
- **Consequences:** <!-- AGENT:FILL Trade-offs and follow-up obligations -->`;

    case "local-dev-runbook":
      return `## 1. Prerequisites & Toolchain Versions

- **Runtime:** <!-- AGENT:FILL e.g. Node.js >= 20, Python >= 3.12 -->
- **Local Services:** <!-- AGENT:FILL Postgres / Redis / Docker Compose or None -->

## 2. Environment Variable Contract

| Variable | Required | Default / Example | Scope (dev/test/prod) | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| \`<!-- AGENT:FILL VAR_NAME -->\` | Yes | \`<!-- AGENT:FILL example -->\` | all | <!-- AGENT:FILL Purpose --> |

## 3. Bootstrap, Seed & Troubleshooting Playbook

\`\`\`bash
# 1. Start dependencies & install
<!-- AGENT:FILL setup cmd -->

# 2. Run migrations & deterministic seed
<!-- AGENT:FILL migrate/seed cmd -->

# 3. Verify healthy local boot
<!-- AGENT:FILL smoke check cmd -->
\`\`\`

| Common Failure | Root Cause | Fast Fix |
| :--- | :--- | :--- |
| <!-- AGENT:FILL Failure 1 --> | <!-- AGENT:FILL Cause --> | <!-- AGENT:FILL Exact fix --> |`;

    case "infra-deploy":
      return `## 1. Environments & Hosting Topology

| Environment | Hosting / Runtime | Execution Constraints | Data Isolation |
| :--- | :--- | :--- | :--- |
| Local | Developer machine | <!-- AGENT:FILL Local constraints --> | Local/ephemeral DB |
| Preview / Staging | <!-- AGENT:FILL Platform --> | <!-- AGENT:FILL Timeout/memory limits --> | Isolated staging DB |
| Production | <!-- AGENT:FILL Platform / Region --> | <!-- AGENT:FILL Stateless/edge/container constraints --> | Production DB + backups |

## 2. CI/CD Pipeline & Release Gates

1. **Pull Request Gate:** <!-- AGENT:FILL Lint + Typecheck + Unit/Integration tests + md-structure audit -->
2. **Release Promotion:** <!-- AGENT:FILL Tag/main merge -> migrations -> canary/rollout -->
3. **Secret Provisioning:** <!-- AGENT:FILL Vault / platform env management -->

## 3. Rollback & Disaster Recovery

- **Instant Rollback Command:** <!-- AGENT:FILL Exact rollback procedure -->
- **Backup Cadence & Targets:** <!-- AGENT:FILL RPO / RTO and restore drill procedure -->`;

    case "observability":
      return `## 1. Structured Logging & Redaction Policy

- **Format:** Single-line JSON logs with \`timestamp\`, \`level\`, \`service\`, \`request_id\`, \`trace_id\`, and \`tenant_id\` (when applicable).
- **Mandatory Redaction:** Strictly strip passwords, auth tokens, API keys, payment cards, and raw PII before emitting logs.

## 2. Core Metrics, Traces & Health Checks

| Signal | Name / Endpoint | Dimensions / Labels | Purpose |
| :--- | :--- | :--- | :--- |
| Health Check | \`GET /healthz\` & \`/readyz\` | — | Liveness & dependency readiness |
| Golden Signals | Latency, traffic, errors, saturation | \`route\`, \`status_class\` | SLO tracking |
| Business / AI Metric | <!-- AGENT:FILL Custom metric --> | <!-- AGENT:FILL Labels --> | <!-- AGENT:FILL Outcome tracked --> |

## 3. Alerting & Triage Runbook

| Alert Condition | Severity | First-Response Diagnostic Step |
| :--- | :--- | :--- |
| <!-- AGENT:FILL Error rate > 1% for 5m --> | P1 | <!-- AGENT:FILL Trace query & rollback check --> |`;

    case "migration-plan":
      return `## 1. Legacy Surface & Parity Requirements

| Legacy Capability / Dataset | Compatibility Requirement | Parity Verification Check |
| :--- | :--- | :--- |
| <!-- AGENT:FILL Legacy API / Table --> | Zero breaking payload changes | <!-- AGENT:FILL Shadow diff / checksum --> |

## 2. Phased Cutover & Backfill Strategy

1. **Phase 1 — Shadow Read / Schema Prep:** <!-- AGENT:FILL Non-breaking additive rollout -->
2. **Phase 2 — Dual-Write & Historical Backfill:** <!-- AGENT:FILL Idempotent batch backfill + progress tracking -->
3. **Phase 3 — Progressive Traffic Cutover:** <!-- AGENT:FILL Feature flag % ramp (1% -> 10% -> 50% -> 100%) -->
4. **Phase 4 — Legacy Decommission:** <!-- AGENT:FILL Hold period & safe teardown -->

## 3. Verification & Rollback Triggers

- **Hard Abort Triggers:** <!-- AGENT:FILL Parity mismatch > 0%, latency regression > X%, error spike -->
- **Immediate Rollback Path:** <!-- AGENT:FILL Flip routing flag back to legacy without data loss -->`;

    case "compliance-privacy":
      return `## 1. Regulatory Scope & Data Classification

- **Applicable Frameworks:** <!-- AGENT:FILL GDPR / HIPAA / SOC2 / PCI-DSS -->
- **Data Residency:** <!-- AGENT:FILL Allowed storage/processing regions -->

| Field / Entity | Classification | Encryption | Approved Sub-Processors |
| :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL User email / health record --> | PII / PHI / PCI | TLS 1.3 + AES-256 at rest | <!-- AGENT:FILL Explicitly approved list --> |

## 2. Retention, Deletion & Data Subject Rights

- **Retention TTLs:** <!-- AGENT:FILL Exact retention window per data class -->
- **Right to Erasure / Export:** <!-- AGENT:FILL Cascade deletion / crypto-shredding workflow & SLA -->

## 3. Immutable Audit Trail Specification

| Event Type | Required Audit Fields | Storage & Immutability Guarantee |
| :--- | :--- | :--- |
| Auth / Role / Permission Change | \`actor_id\`, \`tenant_id\`, \`action\`, \`target\`, \`timestamp\`, \`ip\` | Append-only audit table / WORM store |
| Sensitive Data Export / Delete | \`actor_id\`, \`subject_id\`, \`reason\`, \`timestamp\` | Append-only, retained per policy |`;

    case "monorepo-topology":
      return `## 1. Workspace Package Inventory

| Package / App | Path | Runtime | Single Responsibility | Public Contract |
| :--- | :--- | :--- | :--- | :--- |
| <!-- AGENT:FILL web-app --> | \`apps/web\` | Browser / Edge | User-facing frontend | Internal app |
| <!-- AGENT:FILL shared-core --> | \`packages/core\` | Universal | Shared domain logic & schemas | Strict \`exports\` map |

## 2. Dependency Graph Rules

\`\`\`mermaid
flowchart TD
  Apps["apps/*"] --> Shared["packages/core"]
  Apps --> UI["packages/ui"]
\`\`\`

- **Allowed:** \`apps/*\` may import from \`packages/*\`.
- **Forbidden:** \`packages/*\` MUST NEVER import from \`apps/*\`, and \`apps/*\` MUST NEVER import across sibling apps.

## 3. Build Orchestration & Release Strategy

- **Orchestrator:** <!-- AGENT:FILL Turborepo / Nx / pnpm workspaces -->
- **Caching & Task Graph:** <!-- AGENT:FILL Exact root build/test/lint pipeline commands -->`;

    default: {
      // Fallback for any future catalog additions
      return doc.sections
        .map(
          (sec, idx) =>
            `## ${idx + 1}. ${sec.heading}\n\n> **Section Contract:** ${sec.purpose}\n\n<!-- AGENT:FILL Provide concise, table-driven specifications for "${sec.heading}" tailored to ${project.name}. Prefer tables, schemas, and verifiable rules over prose. -->`
        )
        .join("\n\n");
    }
  }
}

/**
 * Render any document in the blueprint.
 * @param {object} blueprint
 * @param {object} doc
 */
export function renderDocument(blueprint, doc) {
  if (doc.id === "agents-entry") {
    return renderAgentsEntry(blueprint, doc);
  }
  if (doc.id === "context-map") {
    return renderContextMap(blueprint, doc);
  }

  const fm = renderFrontmatter(doc, { status: "draft" });
  const deps =
    doc.dependsOn.length > 0
      ? doc.dependsOn.map((id) => `\`${id}\``).join(", ")
      : "None";

  const body = renderSpecializedBody(blueprint, doc);

  return `${fm}

# ${doc.title}

> **Authority:** ${doc.authority}
> **Why This MD Exists:** ${doc.whyRequired}
> **Failure Mode Prevented:** ${doc.failureModePrevented}
> **Upstream Dependencies:** ${deps} | **Load Policy:** \`${doc.loadPolicy}\` | **Token Budget:** ${doc.tokenBudget.target} target / ${doc.tokenBudget.max} max

---

${body}

---

## Agent Completion Checklist

Before changing frontmatter \`status: draft\` -> \`status: approved\`:

- [ ] Every \`<!-- AGENT:FILL ... -->\` directive in this document is replaced with concrete, verified decisions.
- [ ] All definitions align with upstream dependencies (${deps}) with zero contradictions.
- [ ] Estimated token count stays within the **${doc.tokenBudget.max}** token ceiling.
`;
}

/**
 * Render thin, single-source-of-truth IDE/agent shims pointing to AGENTS.md.
 * @param {string} shimName
 * @param {object} blueprint
 * @returns {{ path: string, content: string }}
 */
export function renderAgentShim(shimName, blueprint) {
  const name = blueprint.project.name;
  switch (shimName) {
    case "claude":
      return {
        path: "CLAUDE.md",
        content: `# CLAUDE.md — ${name}

This repository uses [AGENTS.md](./AGENTS.md) as its single source of truth for agent instructions and progressive-disclosure architecture routing.

## Mandatory Startup Rule

1. Read [AGENTS.md](./AGENTS.md) first at the beginning of every session.
2. Load only the domain Markdown documents in \`docs/\` whose \`read_triggers\` match your current task.
3. Never duplicate rules here; update \`AGENTS.md\` or the owning authority document instead.
`,
      };
    case "cursor":
      return {
        path: ".cursor/rules/md-structure.mdc",
        content: `---
description: Progressive-disclosure Markdown architecture routing for ${name}
alwaysApply: true
---

# Agent Architecture Protocol

- Treat \`AGENTS.md\` at the repository root as the authoritative control plane.
- Follow its Document Routing Map and load only the \`docs/*.md\` files whose \`read_triggers\` apply to your task.
- Respect every non-negotiable invariant in \`AGENTS.md\` and run \`md-structure audit --json\` after architectural doc edits.
`,
      };
    case "copilot":
      return {
        path: ".github/copilot-instructions.md",
        content: `# GitHub Copilot Instructions — ${name}

Follow [AGENTS.md](../AGENTS.md) as the single source of truth for project invariants, workspace commands, and progressive-disclosure documentation routing. Load only the relevant \`docs/*.md\` files listed in its routing table for your current task.
`,
      };
    case "windsurf":
      return {
        path: ".windsurfrules",
        content: `# Windsurf Rules — ${name}
# Single Source of Truth: AGENTS.md

1. Read AGENTS.md before making changes.
2. Follow the Document Routing Map in AGENTS.md to load only task-relevant docs/*.md files.
3. Keep docs synchronized with architectural changes and validate with \`md-structure audit\`.
`,
      };
    default:
      throw new Error(`Unsupported agent shim: '${shimName}'`);
  }
}
