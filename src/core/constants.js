/**
 * Core domain constants for MD-Structure.
 * Defines complexity tiers, architectural layers, agent load policies,
 * project archetypes, and capability signals.
 */

export const VERSION = "1.0.0";
export const SCHEMA_VERSION = "1.0.0";
export const AUTHOR = "Ayazelrico";
export const SIGNATURE = "MD-Structure by Ayazelrico";
export const MANIFEST_FILENAME = "md-structure.manifest.json";

/**
 * Complexity tiers determine the baseline documentation footprint and token envelope.
 */
export const TIERS = Object.freeze({
  T0: {
    id: "T0",
    name: "Micro / Utility",
    summary: "Single-purpose script, prototype, small CLI, or focused library with minimal state.",
    recommendedDocRange: [2, 4],
    totalTokenEnvelope: [1200, 3800],
    alwaysOnTokenLimit: 1000,
    minScore: 0,
    maxScore: 4,
  },
  T1: {
    id: "T1",
    name: "Focused MVP",
    summary: "Single-domain application, service, or tool with clear boundaries and limited external risk.",
    recommendedDocRange: [4, 7],
    totalTokenEnvelope: [3500, 8500],
    alwaysOnTokenLimit: 1200,
    minScore: 5,
    maxScore: 10,
  },
  T2: {
    id: "T2",
    name: "Production Product",
    summary: "Multi-capability product (SaaS, agent platform, full-stack app, or multi-service API) with real users and operational risk.",
    recommendedDocRange: [7, 13],
    totalTokenEnvelope: [8000, 18000],
    alwaysOnTokenLimit: 1400,
    minScore: 11,
    maxScore: 26,
  },
  T3: {
    id: "T3",
    name: "Enterprise / Distributed Platform",
    summary: "Regulated, multi-tenant, high-scale, or multi-team distributed system requiring strict governance and compliance controls.",
    recommendedDocRange: [12, 18],
    totalTokenEnvelope: [16000, 30000],
    alwaysOnTokenLimit: 1600,
    minScore: 27,
    maxScore: 999,
  },
});

/**
 * Logical architecture layers for grouping and ordering Markdown documents.
 */
export const LAYERS = Object.freeze({
  bootstrap: {
    id: "bootstrap",
    order: 0,
    label: "Bootstrap & Context Routing",
    description: "Always-on entrypoints and routing indexes that govern how an agent navigates the workspace.",
  },
  product: {
    id: "product",
    order: 1,
    label: "Product & Domain",
    description: "Problem definition, user workflows, scope boundaries, non-goals, and ubiquitous domain language.",
  },
  system: {
    id: "system",
    order: 2,
    label: "System & Interfaces",
    description: "Structural topology, persistence models, APIs, UI systems, agent protocols, and state machines.",
  },
  engineering: {
    id: "engineering",
    order: 3,
    label: "Engineering & Quality",
    description: "Code conventions, testing strategy, performance budgets, security controls, and ADRs.",
  },
  operations: {
    id: "operations",
    order: 4,
    label: "Operations & Delivery",
    description: "Infrastructure, deployment pipelines, observability, local runbooks, and data migrations.",
  },
  governance: {
    id: "governance",
    order: 5,
    label: "Governance & Compliance",
    description: "Privacy, regulatory obligations, audit trails, and organizational boundaries.",
  },
});

/**
 * Agent progressive-disclosure load policies.
 */
export const LOAD_POLICIES = Object.freeze({
  always: {
    id: "always",
    label: "Always-On",
    description: "Loaded at the start of every agent session. Must stay ultra-concise to protect the context window.",
  },
  "on-demand": {
    id: "on-demand",
    label: "On-Demand",
    description: "Loaded when a task touches the document's domain or matches one of its explicit read triggers.",
  },
  "task-scoped": {
    id: "task-scoped",
    label: "Task-Scoped",
    description: "Loaded only during specific phases (e.g., deployment, migration, security audit, incident debugging).",
  },
  reference: {
    id: "reference",
    label: "Reference / Append-Only",
    description: "Consulted selectively for historical decisions, glossary lookups, or contract verification.",
  },
});

/**
 * Supported project archetypes.
 */
export const ARCHETYPES = Object.freeze({
  "web-saas": {
    id: "web-saas",
    label: "Web Application / SaaS",
    description: "Browser-based product with frontend UI, backend logic, and persistent state.",
    baseComplexity: 4,
    defaultCapabilities: ["complex-ui", "database-persistence"],
  },
  "api-backend": {
    id: "api-backend",
    label: "API / Backend Service",
    description: "HTTP, GraphQL, or RPC service exposing programmatic endpoints and business logic.",
    baseComplexity: 3,
    defaultCapabilities: ["public-api", "database-persistence"],
  },
  "ai-agent-system": {
    id: "ai-agent-system",
    label: "AI / Agentic System",
    description: "LLM-powered application, autonomous agent, RAG pipeline, MCP tool server, or orchestration workflow.",
    baseComplexity: 5,
    defaultCapabilities: ["ai-llm-agents", "external-integrations"],
  },
  "cli-tool": {
    id: "cli-tool",
    label: "CLI / Local Developer Tool",
    description: "Command-line binary, local automation tool, code generator, or developer utility.",
    baseComplexity: 2,
    defaultCapabilities: ["cli-interface"],
  },
  "library-sdk": {
    id: "library-sdk",
    label: "Library / SDK / Package",
    description: "Reusable software package, framework, or SDK consumed by other developers or agents.",
    baseComplexity: 2,
    defaultCapabilities: ["sdk-surface"],
  },
  "mobile-app": {
    id: "mobile-app",
    label: "Mobile Application",
    description: "iOS, Android, or cross-platform mobile client with offline/device constraints.",
    baseComplexity: 4,
    defaultCapabilities: ["complex-ui", "offline-local-first"],
  },
  "desktop-app": {
    id: "desktop-app",
    label: "Desktop Application",
    description: "Local desktop application (Electron, Tauri, Swift, native) with local storage and OS integration.",
    baseComplexity: 4,
    defaultCapabilities: ["complex-ui", "offline-local-first"],
  },
  "data-pipeline": {
    id: "data-pipeline",
    label: "Data Pipeline / Analytics Engine",
    description: "ETL/ELT ingestion, streaming processor, analytics warehouse, or ML training pipeline.",
    baseComplexity: 4,
    defaultCapabilities: ["database-persistence", "background-jobs"],
  },
  "monorepo-platform": {
    id: "monorepo-platform",
    label: "Multi-App Monorepo / Platform",
    description: "Multi-package workspace spanning multiple services, apps, and shared libraries.",
    baseComplexity: 6,
    defaultCapabilities: ["monorepo", "public-api", "database-persistence"],
  },
  "browser-extension": {
    id: "browser-extension",
    label: "Browser Extension / Plugin",
    description: "Browser extension or host-app plugin operating across isolated execution contexts.",
    baseComplexity: 3,
    defaultCapabilities: ["complex-ui", "plugin-extensibility"],
  },
});

/**
 * Capability & risk signals extracted from user ideas or structured intake profiles.
 */
export const CAPABILITIES = Object.freeze({
  "database-persistence": {
    id: "database-persistence",
    label: "Database & Persistent Storage",
    weight: 2,
    description: "Stores structured/unstructured records across sessions (SQL, NoSQL, vector DB, local DB).",
  },
  "public-api": {
    id: "public-api",
    label: "API / Service Contracts",
    weight: 2,
    description: "Exposes REST, GraphQL, gRPC, WebSocket, or webhook contracts consumed by clients or third parties.",
  },
  "auth-rbac": {
    id: "auth-rbac",
    label: "Authentication & Authorization (RBAC/ABAC)",
    weight: 2,
    description: "Manages user identity, sessions, API keys, roles, permissions, or OAuth/SSO.",
  },
  "multi-tenant": {
    id: "multi-tenant",
    label: "Multi-Tenancy & Isolation",
    weight: 3,
    description: "Serves multiple organizations/workspaces with strict tenant data isolation.",
  },
  "payments-billing": {
    id: "payments-billing",
    label: "Payments, Billing & Financial Ledger",
    weight: 3,
    description: "Handles money movement, subscriptions, invoicing, Stripe/payment webhooks, or usage metering.",
  },
  "ai-llm-agents": {
    id: "ai-llm-agents",
    label: "AI / LLM / Autonomous Agents",
    weight: 3,
    description: "Uses LLMs, tool calling, prompts, RAG, evaluations, memory, or MCP integrations.",
  },
  "complex-ui": {
    id: "complex-ui",
    label: "Interactive UI & Design System",
    weight: 2,
    description: "Multi-screen user interface with visual hierarchy, design tokens, accessibility, and state flows.",
  },
  "state-workflows": {
    id: "state-workflows",
    label: "Complex Workflows & State Machines",
    weight: 2,
    description: "Multi-step lifecycles, approvals, retries, sagas, or deterministic state transitions.",
  },
  "realtime-sync": {
    id: "realtime-sync",
    label: "Realtime / Event-Driven Sync",
    weight: 2,
    description: "WebSockets, SSE, multiplayer cursors, live collaboration, or pub/sub event streams.",
  },
  "external-integrations": {
    id: "external-integrations",
    label: "Third-Party Integrations & Webhooks",
    weight: 2,
    description: "Depends on external APIs, webhooks, OAuth providers, or vendor SDKs.",
  },
  "background-jobs": {
    id: "background-jobs",
    label: "Background Jobs, Queues & Cron",
    weight: 2,
    description: "Asynchronous workers, queues, scheduled tasks, or long-running pipelines.",
  },
  "compliance-pii": {
    id: "compliance-pii",
    label: "Compliance, Privacy & Regulated Data",
    weight: 3,
    description: "Handles PII, HIPAA, SOC2, GDPR, PCI, financial/medical/legal records, or audit logging.",
  },
  "high-throughput": {
    id: "high-throughput",
    label: "High Scale & Performance Budgets",
    weight: 2,
    description: "Strict latency SLOs, caching layers, heavy traffic, or constrained compute/memory envelopes.",
  },
  "cli-interface": {
    id: "cli-interface",
    label: "CLI Surface & Machine Output",
    weight: 1,
    description: "Command-line UX, subcommands, exit codes, stdin/stdout contracts, and config precedence.",
  },
  "sdk-surface": {
    id: "sdk-surface",
    label: "Public SDK / Package API Surface",
    weight: 2,
    description: "Versioned public API exports, SemVer compatibility guarantees, and consumer ergonomics.",
  },
  "plugin-extensibility": {
    id: "plugin-extensibility",
    label: "Plugin / Extension Architecture",
    weight: 2,
    description: "Dynamic extensions, hooks, sandboxed plugins, or user-authored modules.",
  },
  "offline-local-first": {
    id: "offline-local-first",
    label: "Offline / Local-First Execution",
    weight: 2,
    description: "Runs locally without guaranteed connectivity, requiring local storage or conflict resolution.",
  },
  "self-hosted-infra": {
    id: "self-hosted-infra",
    label: "Cloud Infrastructure & Deployment Topology",
    weight: 2,
    description: "Docker, Kubernetes, Terraform, CI/CD, multi-environment rollouts, or self-hosting.",
  },
  "migration-legacy": {
    id: "migration-legacy",
    label: "Legacy Migration / Rewrite",
    weight: 2,
    description: "Replaces or migrates data/traffic from an existing production system with zero-downtime needs.",
  },
  monorepo: {
    id: "monorepo",
    label: "Monorepo / Multi-Package Topology",
    weight: 2,
    description: "Multiple packages/services sharing internal libraries, build graphs, and ownership boundaries.",
  },
  "complex-domain": {
    id: "complex-domain",
    label: "Specialized Domain Terminology",
    weight: 1,
    description: "Domain-specific rules/jargon (finance, healthcare, legal, logistics, compilers, gaming) prone to naming drift.",
  },
});

export const SUPPORTED_SHIMS = Object.freeze(["claude", "cursor", "copilot", "windsurf"]);
