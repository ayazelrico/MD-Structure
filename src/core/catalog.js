/**
 * Canonical Catalog of 27 Agent-Native Markdown Archetypes.
 *
 * Every entry defines:
 * - WHAT the document governs (authority boundary)
 * - WHY an AI coding agent needs it (and what exact failure mode it prevents)
 * - WHEN it should be included vs. intentionally skipped
 * - HOW the agent should load it (progressive disclosure policy + token budget)
 * - DEPENDENCY ORDER (DAG) for authoring and reading
 */

export const DOC_CATALOG = Object.freeze([
  // =========================================================================
  // LAYER 0: BOOTSTRAP & CONTEXT ROUTING
  // =========================================================================
  {
    id: "agents-entry",
    title: "Agent Operating Manual",
    path: "AGENTS.md",
    layer: "bootstrap",
    loadPolicy: "always",
    tokenBudget: { min: 250, target: 700, max: 1200 },
    alwaysInclude: true,
    minTier: "T0",
    triggerCapabilities: [],
    triggerArchetypes: [],
    dependsOn: [],
    authority: "Session bootstrap rules, document routing table, hard invariants, build/test commands, and anti-drift workflow.",
    whyRequired:
      "Serves as the ultra-lean, always-loaded control plane for every AI coding agent. Prevents the agent from guessing project rules, running wrong commands, or loading every doc blindly.",
    failureModePrevented:
      "Agents ignore repo conventions, hallucinate scripts/commands, violate core constraints, or flood their context window reading irrelevant files.",
    skipRationale: "Never skipped; every agent-operated project requires a single root entrypoint.",
    readTriggers: [
      "Automatically at the start of every agent session before reading or modifying code",
    ],
    updateTriggers: [
      "When a new Markdown document is added/removed from the manifest",
      "When build, test, lint, or run commands change",
      "When a global invariant or hard constraint is added",
    ],
    sections: [
      {
        heading: "Project Identity & Mission",
        purpose: "3-line high-signal summary of what this repository builds, who uses it, and its current complexity tier.",
      },
      {
        heading: "Document Routing Map (Progressive Disclosure)",
        purpose: "Compact table mapping every active MD file to its authority, load policy, and read triggers.",
      },
      {
        heading: "Non-Negotiable Invariants",
        purpose: "Hard architectural, security, and behavioral laws the agent must never break.",
      },
      {
        heading: "Workspace Commands & Verification Gate",
        purpose: "Exact copy-pasteable commands for install, dev, test, lint, typecheck, and build.",
      },
      {
        heading: "Agent Execution & Anti-Drift Protocol",
        purpose: "Rules for reading upstream docs before coding, keeping docs synchronized, and verifying changes.",
      },
    ],
  },
  {
    id: "context-map",
    title: "Architecture Context Map & Rationale Ledger",
    path: "docs/00-CONTEXT-MAP.md",
    layer: "bootstrap",
    loadPolicy: "on-demand",
    tokenBudget: { min: 300, target: 750, max: 1300 },
    alwaysInclude: false,
    minTier: "T1",
    triggerCapabilities: [],
    triggerArchetypes: [],
    dependsOn: ["agents-entry"],
    authority: "Complete inventory of active vs. intentionally excluded MDs, dependency DAG, token budgets, and source-of-truth matrix.",
    whyRequired:
      "Explicitly answers how many MDs exist, why each was selected, why others were skipped, and in what dependency order they must be authored and read.",
    failureModePrevented:
      "Prevents agents and contributors from creating redundant duplicate docs, contradicting source-of-truth boundaries, or losing track of doc authoring dependencies.",
    skipRationale:
      "Skipped for T0 micro-utilities where 2-3 root documents are self-evident in AGENTS.md.",
    readTriggers: [
      "During project onboarding or architectural planning",
      "Before proposing a new documentation file or restructuring docs/",
      "When auditing documentation drift or context token budgets",
    ],
    updateTriggers: [
      "Whenever docs are added, removed, split, or re-scoped",
      "Whenever project complexity tier or capabilities evolve",
    ],
    sections: [
      {
        heading: "Architecture Blueprint Summary",
        purpose: "Detected archetype, complexity tier, active doc count, and total token envelope.",
      },
      {
        heading: "Active Document Matrix & Dependency DAG",
        purpose: "Table of every selected MD with its layer, load policy, upstream dependencies, and why it exists.",
      },
      {
        heading: "Intentionally Excluded Documents",
        purpose: "List of catalog MDs explicitly NOT created for this project and the exact reason why.",
      },
      {
        heading: "Source-of-Truth Authority Rules",
        purpose: "Conflict-resolution hierarchy when two documents appear to disagree.",
      },
    ],
  },

  // =========================================================================
  // LAYER 1: PRODUCT & DOMAIN
  // =========================================================================
  {
    id: "prd",
    title: "Product Requirements & Scope Contract",
    path: "docs/01-PRD.md",
    layer: "product",
    loadPolicy: "on-demand",
    tokenBudget: { min: 400, target: 1100, max: 1800 },
    alwaysInclude: true,
    minTier: "T0",
    triggerCapabilities: [],
    triggerArchetypes: [],
    dependsOn: ["agents-entry"],
    authority: "Problem statement, target users, MVP scope, explicit non-goals, core user journeys, and verifiable acceptance criteria.",
    whyRequired:
      "Anchors every downstream engineering decision to concrete user outcomes and explicit Non-Goals so the agent builds the right thing without gold-plating.",
    failureModePrevented:
      "Feature creep, hallucinated requirements, missing edge-case user journeys, and ambiguous definition of 'done'.",
    skipRationale: "Never skipped; without a product contract, architecture has no target.",
    readTriggers: [
      "Before designing architecture, schemas, or APIs",
      "Before implementing a new feature or changing user-visible behavior",
      "When resolving scope ambiguity or deciding whether a capability is out of scope",
    ],
    updateTriggers: [
      "When product scope, target personas, or acceptance criteria change",
      "When moving features between MVP and Non-Goals / Future Phases",
    ],
    sections: [
      {
        heading: "Problem Statement & Value Proposition",
        purpose: "Concise framing of the exact user pain and measurable success criteria.",
      },
      {
        heading: "Target Users & Personas",
        purpose: "Who operates the system (humans, admins, external developers, AI agents) and their constraints.",
      },
      {
        heading: "Core Functional Requirements (P0 / P1)",
        purpose: "Numbered, testable requirements with explicit acceptance criteria.",
      },
      {
        heading: "Explicit Non-Goals (Out of Scope)",
        purpose: "Hard boundaries preventing the agent from building unrequested features or premature abstractions.",
      },
      {
        heading: "Primary User Journeys & Edge Cases",
        purpose: "End-to-end flows from entry trigger to expected outcome and failure handling.",
      },
    ],
  },
  {
    id: "domain-glossary",
    title: "Ubiquitous Domain Glossary & Business Rules",
    path: "docs/01B-DOMAIN-GLOSSARY.md",
    layer: "product",
    loadPolicy: "reference",
    tokenBudget: { min: 250, target: 700, max: 1200 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["complex-domain", "payments-billing", "compliance-pii", "multi-tenant"],
    triggerArchetypes: [],
    dependsOn: ["prd"],
    authority: "Canonical domain terminology, forbidden synonyms, entity definitions, and deterministic business invariants.",
    whyRequired:
      "Eliminates naming drift across database columns, API payloads, UI labels, and code identifiers in domain-heavy projects.",
    failureModePrevented:
      "Agent calls the same concept 'Account', 'Workspace', 'Tenant', and 'Org' in different files, causing schema and API mismatches.",
    skipRationale:
      "Skipped when the project uses standard, self-explanatory concepts with low risk of terminology drift.",
    readTriggers: [
      "Before naming new database tables, API resources, TypeScript types, or domain modules",
      "Before implementing financial, legal, compliance, or domain-specific calculations",
    ],
    updateTriggers: [
      "When introducing a new core domain entity, status enum, or business rule",
    ],
    sections: [
      {
        heading: "Canonical Terms & Forbidden Synonyms",
        purpose: "Strict mapping of official term -> code identifier -> definition -> banned aliases.",
      },
      {
        heading: "Domain Business Rules & Invariants",
        purpose: "Unbreakable calculations, rounding rules, ownership semantics, and lifecycle laws.",
      },
      {
        heading: "Bounded Contexts",
        purpose: "Where terminology boundaries sit between subsystems.",
      },
    ],
  },

  // =========================================================================
  // LAYER 2: SYSTEM & INTERFACES
  // =========================================================================
  {
    id: "architecture",
    title: "System Architecture & Module Boundaries",
    path: "docs/02-ARCHITECTURE.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 450, target: 1300, max: 2100 },
    alwaysInclude: false,
    minTier: "T1",
    triggerCapabilities: [],
    triggerArchetypes: ["web-saas", "api-backend", "ai-agent-system", "mobile-app", "desktop-app", "data-pipeline", "monorepo-platform", "browser-extension"],
    dependsOn: ["prd"],
    authority: "Tech stack choices, directory/module ownership, dependency direction, runtime topology, and system data flows.",
    whyRequired:
      "Gives the agent a deterministic map of where code belongs, how layers communicate, and which architectural boundaries must never be crossed.",
    failureModePrevented:
      "Circular imports, leaking database logic into UI components, random folder sprawl, and conflicting library choices.",
    skipRationale:
      "Skipped only for ultra-minimal T0 single-file or tiny scripts where AGENTS.md captures the entire structure.",
    readTriggers: [
      "Before creating new directories, packages, services, or core modules",
      "Before adding any third-party package or changing dependency boundaries",
      "Before refactoring cross-cutting data flows",
    ],
    updateTriggers: [
      "When adding/removing major components, runtimes, queues, or storage layers",
      "When changing directory layout or module dependency rules",
    ],
    sections: [
      {
        heading: "Tech Stack & Runtime Matrix",
        purpose: "Pinned languages, frameworks, storage engines, and explicit rationale for each choice.",
      },
      {
        heading: "High-Level System Topology",
        purpose: "ASCII or Mermaid component diagram showing runtime boundaries and data flow.",
      },
      {
        heading: "Directory & Module Ownership Map",
        purpose: "Exact folder tree with single-responsibility contract and allowed import directions.",
      },
      {
        heading: "Key Data & Control Flows",
        purpose: "Step-by-step request, event, or pipeline paths for critical operations.",
      },
      {
        heading: "Architectural Constraints & Anti-Patterns",
        purpose: "Explicit 'DO NOT' rules preventing structural decay.",
      },
    ],
  },
  {
    id: "data-model",
    title: "Data Model & Persistence Contract",
    path: "docs/03-DATA-MODEL.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 400, target: 1200, max: 2000 },
    alwaysInclude: false,
    minTier: "T2",
    triggerCapabilities: ["database-persistence", "multi-tenant", "payments-billing", "offline-local-first"],
    triggerArchetypes: ["data-pipeline"],
    dependsOn: ["prd", "architecture"],
    authority: "Entities, relational/document schemas, primary/foreign keys, tenant isolation keys, indexes, retention, and migration rules.",
    whyRequired:
      "Prevents the single costliest class of AI coding bugs: drifting column names, broken relationships, missing indexes, and leaky multi-tenant queries.",
    failureModePrevented:
      "Agents invent incompatible field names across queries, forget foreign key cascades, omit tenant_id filters, or create unindexed hot paths.",
    skipRationale:
      "Skipped for stateless tools, pure libraries, or compute utilities without persistent data stores.",
    readTriggers: [
      "Before writing or editing database schemas, ORM models, migrations, or SQL/NoSQL queries",
      "Before designing API payloads that serialize stored entities",
    ],
    updateTriggers: [
      "Before or alongside any schema migration, new table/collection, or index change",
    ],
    sections: [
      {
        heading: "Storage Engine & Modeling Strategy",
        purpose: "Database engine, ORM/query layer, ID format (UUIDv7/ULID/int), and timestamp/soft-delete policy.",
      },
      {
        heading: "Entity-Relationship Overview",
        purpose: "Compact ER diagram or relationship matrix showing cardinalities and ownership.",
      },
      {
        heading: "Core Schema Definitions",
        purpose: "Exact entity fields, types, nullability, defaults, uniqueness constraints, and indexes.",
      },
      {
        heading: "Tenancy, Access & Integrity Rules",
        purpose: "Row-level isolation rules, transaction boundaries, and cascade behaviors.",
      },
      {
        heading: "Schema Evolution & Migration Policy",
        purpose: "Expand-contract rules, backward compatibility, and seed/fixture requirements.",
      },
    ],
  },
  {
    id: "api-contract",
    title: "API & Interface Contracts",
    path: "docs/04-API-CONTRACT.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 400, target: 1300, max: 2200 },
    alwaysInclude: false,
    minTier: "T2",
    triggerCapabilities: ["public-api", "realtime-sync", "payments-billing"],
    triggerArchetypes: ["api-backend", "web-saas"],
    dependsOn: ["architecture", "data-model"],
    authority: "Endpoint catalog, request/response envelopes, error code taxonomy, pagination, idempotency, versioning, and webhook payloads.",
    whyRequired:
      "Locks the exact wire contract between frontend, backend, SDKs, and third-party consumers so an agent never breaks callers when editing handlers.",
    failureModePrevented:
      "Inconsistent response shapes, ad-hoc HTTP status codes, missing pagination/idempotency, and broken frontend-backend payload contracts.",
    skipRationale:
      "Skipped for local-only CLIs, libraries without network endpoints, or single-process scripts.",
    readTriggers: [
      "Before adding, modifying, or calling any HTTP, RPC, GraphQL, WebSocket, or webhook endpoint",
      "Before changing validation schemas or error response structures",
    ],
    updateTriggers: [
      "Whenever an endpoint path, payload schema, status code, or auth requirement changes",
    ],
    sections: [
      {
        heading: "API Conventions & Envelope Standard",
        purpose: "Base URL, versioning strategy, JSON naming convention, pagination, and standard error object.",
      },
      {
        heading: "Authentication & Rate-Limiting Headers",
        purpose: "How callers authenticate, pass idempotency keys, and interpret throttling headers.",
      },
      {
        heading: "Endpoint & Event Catalog",
        purpose: "Structured table of method/route, auth scope, request/response contract, and error codes.",
      },
      {
        heading: "Error Code Taxonomy",
        purpose: "Deterministic machine-readable error codes mapped to HTTP statuses and retryability.",
      },
    ],
  },
  {
    id: "ai-agent-spec",
    title: "AI, LLM & Agentic System Specification",
    path: "docs/05-AI-AGENT-SPEC.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 450, target: 1300, max: 2200 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["ai-llm-agents"],
    triggerArchetypes: ["ai-agent-system"],
    dependsOn: ["prd", "architecture"],
    authority: "Model routing, prompt contracts, tool/MCP schemas, memory/RAG pipelines, guardrails, token/cost caps, and eval suites.",
    whyRequired:
      "AI systems fail silently without explicit prompt contracts, tool schemas, deterministic fallbacks, and evaluation rubrics.",
    failureModePrevented:
      "Prompt sprawl, unguarded tool execution, runaway token/cost loops, hallucinated structured outputs, and unmeasurable model regressions.",
    skipRationale:
      "Skipped when the application itself does not invoke LLMs, embeddings, or autonomous agent workflows.",
    readTriggers: [
      "Before writing or modifying system prompts, tool definitions, MCP handlers, or RAG retrieval logic",
      "Before changing model selection, structured output schemas, or safety guardrails",
    ],
    updateTriggers: [
      "Whenever a model, tool schema, memory strategy, safety policy, or eval metric changes",
    ],
    sections: [
      {
        heading: "Agent Topology & Model Routing",
        purpose: "Single vs. multi-agent graph, pinned model tiers, fallback models, and latency/cost budgets.",
      },
      {
        heading: "Tool & MCP Interface Contracts",
        purpose: "Tool names, strict input/output JSON schemas, side-effect classification (read vs. write), and permission gates.",
      },
      {
        heading: "Context, Memory & Retrieval (RAG) Design",
        purpose: "Chunking, indexing, context window budgets, and state persistence across turns.",
      },
      {
        heading: "Guardrails, Safety & Failure Handling",
        purpose: "Prompt injection defenses, max-step loop breakers, schema validation retries, and human-in-the-loop gates.",
      },
      {
        heading: "Evaluation Strategy & Golden Benchmarks",
        purpose: "Offline eval datasets, pass/fail thresholds, and regression criteria.",
      },
    ],
  },
  {
    id: "ui-design-system",
    title: "UI Architecture & Design System",
    path: "docs/06-UI-DESIGN-SYSTEM.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 350, target: 1000, max: 1700 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["complex-ui"],
    triggerArchetypes: ["web-saas", "mobile-app", "desktop-app", "browser-extension"],
    dependsOn: ["prd", "architecture"],
    authority: "Design tokens, component hierarchy, layout/routing map, client state boundaries, responsive breakpoints, and WCAG accessibility rules.",
    whyRequired:
      "Prevents agents from generating inconsistent styling, duplicate UI primitives, broken responsive layouts, and inaccessible controls.",
    failureModePrevented:
      "Every page looks like a different app, hardcoded hex colors scatter everywhere, loading/empty/error states are forgotten.",
    skipRationale:
      "Skipped for headless APIs, CLIs, data pipelines, and libraries with no graphical user interface.",
    readTriggers: [
      "Before creating or modifying pages, views, components, styles, or client state stores",
    ],
    updateTriggers: [
      "When adding design tokens, layout patterns, core UI primitives, or route hierarchies",
    ],
    sections: [
      {
        heading: "Visual Language & Design Tokens",
        purpose: "Typography scale, color semantics, spacing rhythm, elevation, and theme support.",
      },
      {
        heading: "Navigation & Screen Inventory",
        purpose: "Route map, layout shells, and access guards per screen.",
      },
      {
        heading: "Component Primitives & State Coverage",
        purpose: "Reusable UI primitives and mandatory state matrix (loading, empty, error, partial, success).",
      },
      {
        heading: "Accessibility & Interaction Standards",
        purpose: "Keyboard navigation, focus management, ARIA rules, and target WCAG level.",
      },
    ],
  },
  {
    id: "cli-ux-spec",
    title: "CLI Surface & Machine-Readable Contract",
    path: "docs/06B-CLI-UX-SPEC.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 300, target: 900, max: 1500 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["cli-interface"],
    triggerArchetypes: ["cli-tool"],
    dependsOn: ["prd", "architecture"],
    authority: "Command grammar, flags, stdin/stdout/stderr streams, --json schemas, exit codes, and configuration precedence.",
    whyRequired:
      "CLIs operated by agents and shell pipelines break catastrophically if stdout mixes logs with JSON, exit codes are inconsistent, or interactive prompts hang.",
    failureModePrevented:
      "Broken piping, non-deterministic exit codes, hanging interactive prompts in headless/agent environments, and inconsistent flag names.",
    skipRationale:
      "Skipped for applications without a command-line interface.",
    readTriggers: [
      "Before adding or changing CLI commands, flags, exit codes, help output, or JSON payloads",
    ],
    updateTriggers: [
      "Whenever a command signature, flag, exit code, or config resolution rule changes",
    ],
    sections: [
      {
        heading: "Command Grammar & Subcommand Tree",
        purpose: "Complete command hierarchy, positional args, and global flags.",
      },
      {
        heading: "Machine Output (--json) & Stream Discipline",
        purpose: "stdout vs. stderr separation, JSON envelope stability, and non-interactive guarantee.",
      },
      {
        heading: "Exit Code Contract",
        purpose: "Exact numeric exit codes and what each signals to calling scripts and agents.",
      },
      {
        heading: "Configuration Precedence",
        purpose: "Priority order across CLI flags, environment variables, project config, and defaults.",
      },
    ],
  },
  {
    id: "sdk-public-api",
    title: "Public SDK & Package Surface",
    path: "docs/06C-SDK-PUBLIC-API.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 300, target: 950, max: 1600 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["sdk-surface", "plugin-extensibility"],
    triggerArchetypes: ["library-sdk"],
    dependsOn: ["prd", "architecture"],
    authority: "Exported entrypoints, public types/signatures, stability guarantees, SemVer breaking-change policy, and extension hooks.",
    whyRequired:
      "Protects downstream consumers by separating stable public exports from internal implementation details.",
    failureModePrevented:
      "Accidental breaking changes, leaking internal helpers in package exports, bloated bundle footprints, and unclear plugin lifecycles.",
    skipRationale:
      "Skipped for end-user applications that do not expose a reusable package or plugin SDK.",
    readTriggers: [
      "Before modifying exported functions, classes, TypeScript types, package.json exports, or plugin hooks",
    ],
    updateTriggers: [
      "Whenever the public API surface, deprecation schedule, or plugin lifecycle changes",
    ],
    sections: [
      {
        heading: "Export Map & Public Surface",
        purpose: "Authoritative list of package exports and what remains strictly internal.",
      },
      {
        heading: "Core Interfaces & Ergonomics",
        purpose: "Primary consumer workflows, minimal code examples, and error types.",
      },
      {
        heading: "Versioning, Deprecation & Compatibility",
        purpose: "SemVer policy, runtime/browser targets, and tree-shaking/dependency rules.",
      },
    ],
  },
  {
    id: "state-workflows",
    title: "State Machines, Workflows & Async Jobs",
    path: "docs/07-STATE-WORKFLOWS.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 350, target: 1000, max: 1700 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["state-workflows", "background-jobs", "payments-billing", "realtime-sync"],
    triggerArchetypes: ["data-pipeline"],
    dependsOn: ["architecture", "data-model"],
    authority: "Allowed state transitions, idempotency keys, retry/backoff policies, dead-letter handling, cron schedules, and concurrency locks.",
    whyRequired:
      "Multi-step workflows, queues, and billing lifecycles silently corrupt data unless valid state transitions and retry semantics are explicitly locked.",
    failureModePrevented:
      "Illegal state transitions (e.g., cancelled -> paid), duplicate side effects on retry, zombie jobs, and race conditions.",
    skipRationale:
      "Skipped for synchronous CRUD apps or stateless utilities without complex lifecycles or background workers.",
    readTriggers: [
      "Before modifying status enums, queue workers, webhooks, scheduled jobs, or saga/orchestration logic",
    ],
    updateTriggers: [
      "When adding states, transitions, background queues, retry policies, or concurrency locks",
    ],
    sections: [
      {
        heading: "State Machines & Allowed Transitions",
        purpose: "Explicit transition tables (From -> Event -> To -> Guard -> Side Effect).",
      },
      {
        heading: "Async Queues, Workers & Schedules",
        purpose: "Job catalog, concurrency limits, timeouts, idempotency keys, and dead-letter queues.",
      },
      {
        heading: "Failure Recovery & Compensation",
        purpose: "Partial failure handling, replay safety, and manual recovery steps.",
      },
    ],
  },
  {
    id: "offline-sync",
    title: "Offline Storage & Sync Conflict Strategy",
    path: "docs/07B-OFFLINE-SYNC.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 300, target: 900, max: 1500 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["offline-local-first"],
    triggerArchetypes: ["mobile-app", "desktop-app"],
    dependsOn: ["architecture", "data-model"],
    authority: "Local persistence engine, sync queue protocol, optimistic mutations, conflict resolution rules (LWW/CRDT/merge), and offline degradation.",
    whyRequired:
      "Offline-capable apps silently lose user data when agents treat local storage as a mere cache instead of defining deterministic sync and merge semantics.",
    failureModePrevented:
      "Silent overwrites on reconnect, duplicate mutations from un-acked queues, broken offline UI states, and schema version crashes on device upgrade.",
    skipRationale:
      "Skipped for always-online web apps, server-only APIs, or stateless utilities.",
    readTriggers: [
      "Before modifying local SQLite/IndexedDB/file storage, sync engines, optimistic UI updates, or reconnect handlers",
    ],
    updateTriggers: [
      "When changing local storage engines, sync payload schemas, or conflict resolution rules",
    ],
    sections: [
      {
        heading: "Local Storage Engine & Durability",
        purpose: "On-device store, encryption, schema migration on app update, and quota limits.",
      },
      {
        heading: "Sync Protocol & Mutation Queue",
        purpose: "Outbox ordering, idempotency, retry backoff, and partial sync recovery.",
      },
      {
        heading: "Conflict Resolution Policy",
        purpose: "Per-entity strategy (LWW, field-level merge, CRDT, or manual user resolution).",
      },
    ],
  },
  {
    id: "plugin-architecture",
    title: "Plugin, Extension & Sandbox Architecture",
    path: "docs/06D-PLUGIN-ARCHITECTURE.md",
    layer: "system",
    loadPolicy: "on-demand",
    tokenBudget: { min: 300, target: 900, max: 1500 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["plugin-extensibility"],
    triggerArchetypes: ["browser-extension"],
    dependsOn: ["architecture"],
    authority: "Extension lifecycle hooks, manifest contract, host-plugin messaging bridge, capability permissions, and sandboxing boundaries.",
    whyRequired:
      "Extensible systems and browser extensions fail when agents blur host privileges with untrusted plugin contexts or break hook ordering.",
    failureModePrevented:
      "Privilege escalation across execution contexts, brittle monkey-patching, unversioned plugin manifests, and broken message-passing contracts.",
    skipRationale:
      "Skipped for closed applications with no plugin system or multi-context extension boundary.",
    readTriggers: [
      "Before adding extension points, plugin loaders, manifest parsers, or cross-context message bridges",
    ],
    updateTriggers: [
      "When adding/modifying lifecycle hooks, permission scopes, or plugin manifest versions",
    ],
    sections: [
      {
        heading: "Execution Contexts & Trust Isolation",
        purpose: "Host vs. plugin/content/background contexts and allowed IPC/messaging channels.",
      },
      {
        heading: "Manifest & Lifecycle Hook Contract",
        purpose: "Plugin discovery, registration, activation order, and teardown guarantees.",
      },
      {
        heading: "Permission Model & Sandboxing",
        purpose: "Least-privilege capability declarations and failure containment.",
      },
    ],
  },
  {
    id: "integrations",
    title: "External Integrations & Webhook Contracts",
    path: "docs/08-INTEGRATIONS.md",
    layer: "system",
    loadPolicy: "task-scoped",
    tokenBudget: { min: 300, target: 900, max: 1500 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["external-integrations", "payments-billing"],
    triggerArchetypes: [],
    dependsOn: ["architecture"],
    authority: "Third-party provider matrix, SDK/API versions, auth/secret management, webhook signature verification, rate limits, and circuit-breaker fallbacks.",
    whyRequired:
      "Isolates external vendor quirks, sandbox keys, webhook replay protection, and failure fallbacks so agents don't hardcode brittle third-party calls.",
    failureModePrevented:
      "Unverified webhooks, missing timeout/retry wrappers, leaked vendor keys, and cascading failures when an external API goes down.",
    skipRationale:
      "Skipped for self-contained local tools or systems with zero external vendor/API dependencies.",
    readTriggers: [
      "Before adding or modifying any third-party API client, webhook receiver, or OAuth integration",
    ],
    updateTriggers: [
      "When adding/removing external providers, upgrading vendor API versions, or changing webhook handlers",
    ],
    sections: [
      {
        heading: "External Provider Matrix",
        purpose: "Vendor, purpose, pinned API version, auth method, rate limits, and owning adapter module.",
      },
      {
        heading: "Inbound Webhooks & Verification",
        purpose: "Signature verification, replay window, idempotent deduplication, and async handoff.",
      },
      {
        heading: "Resilience, Sandboxing & Mocking",
        purpose: "Timeouts, fallbacks, and how integrations are mocked in local dev and CI tests.",
      },
    ],
  },

  // =========================================================================
  // LAYER 3: ENGINEERING & QUALITY
  // =========================================================================
  {
    id: "auth-permissions",
    title: "Authentication, Authorization & Tenancy Matrix",
    path: "docs/09-AUTH-PERMISSIONS.md",
    layer: "engineering",
    loadPolicy: "on-demand",
    tokenBudget: { min: 350, target: 950, max: 1600 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["auth-rbac", "multi-tenant"],
    triggerArchetypes: [],
    dependsOn: ["architecture", "data-model"],
    authority: "Identity flows, session/token mechanics, role-permission matrix (RBAC/ABAC), and tenant isolation enforcement boundaries.",
    whyRequired:
      "Authorization bugs (IDOR, privilege escalation, cross-tenant leakage) are the #1 security flaw in AI-generated apps when permissions aren't explicitly tabulated.",
    failureModePrevented:
      "Missing authorization checks on routes/queries, inconsistent role names, broken OAuth/session refresh, and cross-tenant data leaks.",
    skipRationale:
      "Skipped for single-user local tools, public read-only utilities, or libraries without user accounts or access control.",
    readTriggers: [
      "Before creating protected routes, server actions, database queries on user/tenant data, or role checks",
    ],
    updateTriggers: [
      "Whenever roles, permissions, auth providers, token lifecycles, or tenant boundaries change",
    ],
    sections: [
      {
        heading: "Identity & Session Architecture",
        purpose: "Auth provider, token/cookie strategy, expiration/rotation, and API key scoping.",
      },
      {
        heading: "Role & Permission Matrix",
        purpose: "Explicit table mapping Actor/Role x Resource x Action (Create/Read/Update/Delete/Admin).",
      },
      {
        heading: "Tenant Isolation Enforcement",
        purpose: "Where and how tenant_id scoping is enforced (middleware, RLS, repository layer).",
      },
    ],
  },
  {
    id: "security-model",
    title: "Security Model & Threat Mitigations",
    path: "docs/10-SECURITY-MODEL.md",
    layer: "engineering",
    loadPolicy: "task-scoped",
    tokenBudget: { min: 350, target: 1000, max: 1700 },
    alwaysInclude: false,
    minTier: "T2",
    triggerCapabilities: ["auth-rbac", "payments-billing", "compliance-pii", "multi-tenant", "ai-llm-agents", "plugin-extensibility"],
    triggerArchetypes: [],
    dependsOn: ["architecture"],
    authority: "Trust boundaries, threat model, secret handling, input validation, cryptography, sandboxing, and security review checklist.",
    whyRequired:
      "Encodes concrete threat mitigations so agents proactively apply input sanitization, secret hygiene, SSRF/XSS/SQLi defenses, and least-privilege defaults.",
    failureModePrevented:
      "Hardcoded secrets, unsafe dynamic execution, missing CSRF/CSP/validation, prompt injection execution, and unencrypted sensitive fields.",
    skipRationale:
      "Skipped for low-risk local scripts or offline prototypes with no untrusted inputs, secrets, or sensitive data.",
    readTriggers: [
      "Before handling user secrets, credentials, untrusted inputs, file uploads, webhooks, or code execution",
      "Before shipping a production release or conducting a security audit",
    ],
    updateTriggers: [
      "When introducing new trust boundaries, external attack surfaces, or sensitive data classes",
    ],
    sections: [
      {
        heading: "Trust Boundaries & Asset Classification",
        purpose: "What data is public, internal, confidential, or restricted, and where untrusted inputs enter.",
      },
      {
        heading: "Threat Matrix & Required Controls",
        purpose: "Concrete threats mapped to mandatory code-level mitigations and verification checks.",
      },
      {
        heading: "Secrets, Encryption & Supply Chain",
        purpose: "Env/vault handling, encryption at rest/in transit, and dependency hygiene.",
      },
    ],
  },
  {
    id: "conventions",
    title: "Engineering Standards & Code Conventions",
    path: "docs/11-CONVENTIONS.md",
    layer: "engineering",
    loadPolicy: "on-demand",
    tokenBudget: { min: 300, target: 850, max: 1400 },
    alwaysInclude: false,
    minTier: "T2",
    triggerCapabilities: ["monorepo", "sdk-surface"],
    triggerArchetypes: ["monorepo-platform"],
    dependsOn: ["architecture"],
    authority: "Naming conventions, error-handling patterns, logging format, file organization, dependency hygiene, and PR/commit standards.",
    whyRequired:
      "Keeps code generated across dozens of agent sessions stylistically cohesive, predictable, and easy to refactor.",
    failureModePrevented:
      "Mixed error-handling styles, inconsistent file naming, swallowed exceptions, ad-hoc console logs, and bloated utility duplication.",
    skipRationale:
      "Skipped for small T0/T1 projects where 5-10 bullet points inside AGENTS.md are sufficient.",
    readTriggers: [
      "Before writing the first modules in a new feature area",
      "Before code review or large-scale refactoring",
    ],
    updateTriggers: [
      "When linter rules, language idioms, or repository-wide code patterns change",
    ],
    sections: [
      {
        heading: "Naming & File Structure Rules",
        purpose: "Deterministic conventions for files, exports, types, tests, and env vars.",
      },
      {
        heading: "Error Handling & Logging Standard",
        purpose: "Typed errors vs. exceptions, structured log fields, and prohibited silent catches.",
      },
      {
        heading: "Dependency & Refactoring Discipline",
        purpose: "Criteria for adding packages, avoiding premature abstraction, and dead-code cleanup.",
      },
    ],
  },
  {
    id: "testing-strategy",
    title: "Testing & Verification Strategy",
    path: "docs/12-TESTING-STRATEGY.md",
    layer: "engineering",
    loadPolicy: "on-demand",
    tokenBudget: { min: 350, target: 950, max: 1600 },
    alwaysInclude: false,
    minTier: "T1",
    triggerCapabilities: ["payments-billing", "compliance-pii", "ai-llm-agents", "sdk-surface"],
    triggerArchetypes: [],
    dependsOn: ["architecture"],
    authority: "Test pyramid, required test types per change class, mocking boundaries, fixture strategy, and CI quality gates.",
    whyRequired:
      "Agents can only self-verify reliably when they know what to test, what NOT to mock, and what command proves a change is safe.",
    failureModePrevented:
      "Tautological mocked unit tests that pass while production breaks, untested critical paths, flaky E2E suites, and unverified regressions.",
    skipRationale:
      "Skipped for T0 throwaway prototypes or tiny scripts where AGENTS.md specifies a single smoke test command.",
    readTriggers: [
      "Before writing tests for a new feature or bug fix",
      "Before modifying CI workflows, fixtures, or test harnesses",
    ],
    updateTriggers: [
      "When changing test frameworks, coverage gates, or integration/E2E environments",
    ],
    sections: [
      {
        heading: "Verification Pyramid & Change-to-Test Matrix",
        purpose: "Exact test layers required per change type (unit, integration, contract, E2E, evals).",
      },
      {
        heading: "Mocking & Test Data Rules",
        purpose: "What must run against real/local instances vs. what must be mocked/stubbed.",
      },
      {
        heading: "Critical Invariant Test Checklist",
        purpose: "High-risk behaviors that must always have automated regression coverage.",
      },
    ],
  },
  {
    id: "performance-budgets",
    title: "Performance Budgets & Scalability Targets",
    path: "docs/13-PERFORMANCE-BUDGETS.md",
    layer: "engineering",
    loadPolicy: "task-scoped",
    tokenBudget: { min: 300, target: 850, max: 1400 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["high-throughput", "realtime-sync"],
    triggerArchetypes: ["data-pipeline"],
    dependsOn: ["architecture", "data-model"],
    authority: "Latency SLOs (p50/p95/p99), throughput targets, bundle/memory ceilings, caching layers, and N+1 prevention rules.",
    whyRequired:
      "Prevents agents from shipping naive N+1 queries, unbounded payload scans, or massive client bundles in latency-sensitive systems.",
    failureModePrevented:
      "Severe production latency degradation, OOM crashes under load, cache stampedes, and runaway cloud compute bills.",
    skipRationale:
      "Skipped for internal tools, early MVPs, or low-volume utilities without strict latency or scale constraints.",
    readTriggers: [
      "Before writing hot-path queries, caching logic, streaming pipelines, or frontend bundle changes",
      "During load testing or performance regression debugging",
    ],
    updateTriggers: [
      "When SLO targets, traffic assumptions, or caching strategies change",
    ],
    sections: [
      {
        heading: "Quantitative SLOs & Budgets",
        purpose: "Measurable latency, throughput, memory, and bundle-size ceilings.",
      },
      {
        heading: "Caching & Query Efficiency Rules",
        purpose: "Cache keys, TTLs, invalidation triggers, pagination caps, and index requirements.",
      },
      {
        heading: "Benchmarking & Profiling Commands",
        purpose: "Reproducible local/CI performance verification commands.",
      },
    ],
  },
  {
    id: "adr-log",
    title: "Architecture Decision Records (ADR Log)",
    path: "docs/14-ADR-LOG.md",
    layer: "engineering",
    loadPolicy: "reference",
    tokenBudget: { min: 250, target: 900, max: 1800 },
    alwaysInclude: false,
    minTier: "T2",
    triggerCapabilities: ["monorepo", "migration-legacy"],
    triggerArchetypes: [],
    dependsOn: ["architecture"],
    authority: "Append-only ledger of irreversible or high-impact architectural decisions, rejected alternatives, and trade-offs.",
    whyRequired:
      "Stops future agent sessions from repeatedly 're-litigating' or undoing intentional trade-offs because they didn't know why Option B was rejected.",
    failureModePrevented:
      "Flip-flopping architecture across sessions (e.g., Agent A chose SQLite for local-first; Agent B silently rewrites it to Postgres).",
    skipRationale:
      "Skipped for T0/T1 projects where major technical choices fit cleanly in Architecture or AGENTS.md.",
    readTriggers: [
      "Before proposing a stack change, major refactor, or replacing an existing architectural pattern",
    ],
    updateTriggers: [
      "Whenever a significant architectural trade-off is decided or superseded",
    ],
    sections: [
      {
        heading: "ADR Index",
        purpose: "Compact table of ADR ID, date, status (Accepted/Superseded), and 1-line summary.",
      },
      {
        heading: "ADR Template & Entries",
        purpose: "Structured Context -> Decision -> Rejected Alternatives -> Consequences entries.",
      },
    ],
  },

  // =========================================================================
  // LAYER 4: OPERATIONS & DELIVERY
  // =========================================================================
  {
    id: "local-dev-runbook",
    title: "Local Development & Environment Runbook",
    path: "docs/15-LOCAL-DEV-RUNBOOK.md",
    layer: "operations",
    loadPolicy: "task-scoped",
    tokenBudget: { min: 250, target: 800, max: 1400 },
    alwaysInclude: false,
    minTier: "T2",
    triggerCapabilities: ["database-persistence", "monorepo", "self-hosted-infra"],
    triggerArchetypes: ["monorepo-platform"],
    dependsOn: ["architecture"],
    authority: "Prerequisites, required environment variables, local service startup, database seeding, and common troubleshooting fixes.",
    whyRequired:
      "Lets an agent or developer bootstrap a working local environment on the first try without guessing env var names or seed scripts.",
    failureModePrevented:
      "Broken local boots, missing `.env` keys, port collisions, and wasted agent turns debugging environment setup.",
    skipRationale:
      "Skipped for zero-config T0/T1 projects whose setup is 1-3 commands in AGENTS.md.",
    readTriggers: [
      "When setting up the workspace, debugging boot failures, or adding new environment variables",
    ],
    updateTriggers: [
      "Whenever a new env var, local container, seed script, or tool version requirement is added",
    ],
    sections: [
      {
        heading: "Prerequisites & Toolchain Versions",
        purpose: "Pinned runtime versions and required local services.",
      },
      {
        heading: "Environment Variable Contract",
        purpose: "Table of env var name, required/optional, default/example, and scope (dev/test/prod).",
      },
      {
        heading: "Bootstrap, Seed & Troubleshooting Playbook",
        purpose: "Exact startup sequence and top known failure fixes.",
      },
    ],
  },
  {
    id: "infra-deploy",
    title: "Infrastructure, CI/CD & Deployment Topology",
    path: "docs/16-INFRA-DEPLOY.md",
    layer: "operations",
    loadPolicy: "task-scoped",
    tokenBudget: { min: 350, target: 1000, max: 1700 },
    alwaysInclude: false,
    minTier: "T2",
    triggerCapabilities: ["self-hosted-infra", "high-throughput", "multi-tenant", "background-jobs"],
    triggerArchetypes: ["web-saas", "api-backend", "monorepo-platform"],
    dependsOn: ["architecture"],
    authority: "Hosting environments, CI/CD pipeline stages, secret provisioning, release strategy, and rollback procedures.",
    whyRequired:
      "Aligns runtime assumptions (serverless timeouts, container limits, edge vs. Node runtimes, build artifacts) before code is written.",
    failureModePrevented:
      "Agents write stateful filesystem code for stateless serverless functions, break Docker builds, or omit rollback safety.",
    skipRationale:
      "Skipped for local-only utilities or libraries published via a single straightforward package command.",
    readTriggers: [
      "Before editing Dockerfiles, CI workflows, IaC configs, or runtime-sensitive code (filesystem, sockets, timeouts)",
    ],
    updateTriggers: [
      "When hosting platforms, deployment pipelines, regions, or rollback procedures change",
    ],
    sections: [
      {
        heading: "Environments & Hosting Topology",
        purpose: "Local, preview, staging, and production runtime constraints and limits.",
      },
      {
        heading: "CI/CD Pipeline & Release Gates",
        purpose: "Exact checks required before merge and before production promotion.",
      },
      {
        heading: "Rollback & Disaster Recovery",
        purpose: "Fast rollback path, backup cadence, and RTO/RPO targets.",
      },
    ],
  },
  {
    id: "observability",
    title: "Observability, Telemetry & Incident Playbook",
    path: "docs/17-OBSERVABILITY.md",
    layer: "operations",
    loadPolicy: "task-scoped",
    tokenBudget: { min: 300, target: 900, max: 1500 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["high-throughput", "payments-billing", "background-jobs", "ai-llm-agents"],
    triggerArchetypes: ["data-pipeline"],
    dependsOn: ["architecture", "infra-deploy"],
    authority: "Structured logging schema, metrics/SLI definitions, distributed tracing propagation, alert thresholds, and PII scrubbing rules.",
    whyRequired:
      "Ensures agents instrument code with consistent correlation IDs, actionable metrics, and scrubbed logs rather than noisy debug prints.",
    failureModePrevented:
      "Blind production outages, PII leaked into logs, uncorrelatable async failures, and silent AI/queue degradation.",
    skipRationale:
      "Skipped for local tools, prototypes, and early MVPs without production SLA monitoring.",
    readTriggers: [
      "Before adding logging, metrics, tracing spans, error reporting, or health check endpoints",
    ],
    updateTriggers: [
      "When adding new critical services, SLIs, alerting rules, or telemetry vendors",
    ],
    sections: [
      {
        heading: "Structured Logging & Redaction Policy",
        purpose: "Required log fields (request_id, tenant_id, trace_id) and fields banned from logs.",
      },
      {
        heading: "Core Metrics, Traces & Health Checks",
        purpose: "Golden signals, custom business metrics, and readiness/liveness contracts.",
      },
      {
        heading: "Alerting & Triage Runbook",
        purpose: "High-severity failure signatures and first-response diagnostic steps.",
      },
    ],
  },
  {
    id: "migration-plan",
    title: "Legacy Migration & Cutover Plan",
    path: "docs/18-MIGRATION-PLAN.md",
    layer: "operations",
    loadPolicy: "task-scoped",
    tokenBudget: { min: 350, target: 1000, max: 1600 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["migration-legacy"],
    triggerArchetypes: [],
    dependsOn: ["architecture", "data-model"],
    authority: "Coexistence architecture, dual-write/backfill strategy, data parity verification, cutover phases, and abort triggers.",
    whyRequired:
      "Rewrites and migrations fail catastrophically when agents assume greenfield freedom instead of preserving backward compatibility during cutover.",
    failureModePrevented:
      "Data loss during backfill, breaking legacy clients, irreversible big-bang cutovers, and unverified parity.",
    skipRationale:
      "Skipped for greenfield projects with no legacy system or production data to migrate.",
    readTriggers: [
      "Before writing migration scripts, compatibility adapters, dual-write paths, or feature flags for cutover",
    ],
    updateTriggers: [
      "As migration phases progress or parity/rollback criteria are refined",
    ],
    sections: [
      {
        heading: "Legacy Surface & Parity Requirements",
        purpose: "Exact behaviors, data sets, and APIs that must remain compatible.",
      },
      {
        heading: "Phased Cutover & Backfill Strategy",
        purpose: "Step-by-step rollout (shadow -> dual-write -> partial cutover -> decommission).",
      },
      {
        heading: "Verification & Rollback Triggers",
        purpose: "Parity diff checks and hard criteria that trigger immediate rollback.",
      },
    ],
  },

  // =========================================================================
  // LAYER 5: GOVERNANCE & COMPLIANCE
  // =========================================================================
  {
    id: "compliance-privacy",
    title: "Compliance, Privacy & Audit Governance",
    path: "docs/19-COMPLIANCE-PRIVACY.md",
    layer: "governance",
    loadPolicy: "task-scoped",
    tokenBudget: { min: 350, target: 1000, max: 1700 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["compliance-pii"],
    triggerArchetypes: [],
    dependsOn: ["data-model", "security-model"],
    authority: "Regulatory scope (GDPR/HIPAA/SOC2/PCI), data residency, retention/deletion workflows, consent rules, and immutable audit trails.",
    whyRequired:
      "Regulatory obligations cannot be bolted on after launch; agents must know which fields are PII/PHI, retention TTLs, and mandatory audit log events.",
    failureModePrevented:
      "Illegal data retention, missing right-to-erasure cascades, unlogged admin actions, and prohibited data sent to third-party AI APIs.",
    skipRationale:
      "Skipped when the project processes no regulated, personal, health, or financial compliance data.",
    readTriggers: [
      "Before storing user personal data, adding analytics/AI processors, or implementing export/delete/admin flows",
    ],
    updateTriggers: [
      "When regulatory scope, sub-processors, retention periods, or audit event schemas change",
    ],
    sections: [
      {
        heading: "Regulatory Scope & Data Classification",
        purpose: "Applicable standards, PII/PHI/PCI field inventory, and residency constraints.",
      },
      {
        heading: "Retention, Deletion & Data Subject Rights",
        purpose: "Automated TTLs, export workflows, and cryptographic/cascade erasure rules.",
      },
      {
        heading: "Immutable Audit Trail Specification",
        purpose: "Security-relevant events that must produce tamper-evident audit records.",
      },
    ],
  },
  {
    id: "monorepo-topology",
    title: "Monorepo Package Graph & Ownership",
    path: "docs/20-MONOREPO-TOPOLOGY.md",
    layer: "governance",
    loadPolicy: "on-demand",
    tokenBudget: { min: 300, target: 850, max: 1400 },
    alwaysInclude: false,
    minTier: "T3",
    triggerCapabilities: ["monorepo"],
    triggerArchetypes: ["monorepo-platform"],
    dependsOn: ["architecture"],
    authority: "Workspace packages, allowed internal dependency graph, build/cache pipeline, shared contract boundaries, and release coupling.",
    whyRequired:
      "Prevents agents in multi-package repositories from creating circular workspace dependencies, importing private internals, or breaking build caching.",
    failureModePrevented:
      "Broken Turborepo/Nx/pnpm workspace graphs, accidental cross-app imports, and uncoordinated shared-package breaking changes.",
    skipRationale:
      "Skipped for single-package repositories.",
    readTriggers: [
      "Before adding a workspace package, editing package dependencies, or moving shared code across packages",
    ],
    updateTriggers: [
      "Whenever a workspace package is added, renamed, deprecated, or its dependency boundaries change",
    ],
    sections: [
      {
        heading: "Workspace Package Inventory",
        purpose: "Every app and shared package with its runtime, responsibility, and public contract.",
      },
      {
        heading: "Dependency Graph Rules",
        purpose: "Strict allowed/forbidden import directions between apps/, packages/, and tools/.",
      },
      {
        heading: "Build Orchestration & Release Strategy",
        purpose: "Task graph commands, caching inputs/outputs, and independent vs. lockstep versioning.",
      },
    ],
  },
]);

/**
 * Lookup map by document ID.
 * @type {Map<string, typeof DOC_CATALOG[number]>}
 */
export const DOC_BY_ID = new Map(DOC_CATALOG.map((doc) => [doc.id, doc]));

/**
 * Retrieve a single document archetype by ID.
 * @param {string} id
 */
export function getCatalogDoc(id) {
  return DOC_BY_ID.get(id) || null;
}
