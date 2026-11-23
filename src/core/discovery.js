/**
 * Adaptive Discovery Question Generator for AI Agents.
 *
 * When a user describes a vague idea, an agent should NOT ask 20 generic questions.
 * Instead, this module returns the minimal set of high-leverage architectural questions
 * that directly determine WHICH Markdown documents to include or skip.
 */

import { analyzeProject } from "./analyzer.js";

/**
 * Generate targeted clarifying questions for an agent to ask a user before scaffolding.
 *
 * @param {string | object} input Raw idea string or intake profile
 * @param {{ maxQuestions?: number }} [options]
 */
export function generateDiscoveryQuestions(input, options = {}) {
  const isAnalysis =
    Boolean(input) &&
    typeof input.archetype === "object" &&
    input.archetype !== null &&
    typeof input.tier === "object" &&
    input.tier !== null &&
    typeof input.archetype.id === "string" &&
    typeof input.tier.id === "string";
  const analysis = isAnalysis ? input : analyzeProject(input);
  const maxQuestions = options.maxQuestions || 5;
  const ambiguityIds = new Set(analysis.ambiguities.map((a) => a.id));
  const capIds = new Set(analysis.capabilities.map((c) => c.id));

  const questions = [];

  if (ambiguityIds.has("unclear-archetype") || ambiguityIds.has("sparse-idea")) {
    questions.push({
      id: "q-archetype",
      priority: 1,
      dimension: "Runtime Archetype",
      question: "What primary form factor is this project?",
      options: [
        "Web Application / SaaS (frontend + backend + DB)",
        "API / Backend Service (headless HTTP/RPC/webhooks)",
        "AI / Agentic System (LLMs, tools, MCP, RAG, workflows)",
        "CLI / Local Developer Tool",
        "Library / SDK / Reusable Package",
        "Mobile or Desktop App (local-first / native)",
      ],
      impactedDocs: [
        "architecture",
        "ui-design-system",
        "api-contract",
        "cli-ux-spec",
        "sdk-public-api",
        "ai-agent-spec",
      ],
      whyItMatters:
        "Determines the core interface contract docs (UI vs. API vs. CLI vs. SDK vs. AI Agent) and prevents scaffolding irrelevant layers.",
    });
  }

  if (ambiguityIds.has("unclear-lifecycle")) {
    questions.push({
      id: "q-maturity",
      priority: 2,
      dimension: "Target Scale & Lifecycle",
      question: "What maturity stage are you targeting right now?",
      options: [
        "T0: Quick prototype / utility script (2-3 minimal MDs)",
        "T1: Focused MVP for early users (5-7 lean MDs)",
        "T2: Production product with real users & ops (8-12 MDs)",
        "T3: Enterprise / regulated / multi-team platform (12-16 MDs)",
      ],
      impactedDocs: [
        "context-map",
        "testing-strategy",
        "security-model",
        "infra-deploy",
        "adr-log",
        "observability",
      ],
      whyItMatters:
        "Sets the exact Markdown count and token budget ceiling so you neither under-specify nor drown the agent in premature operational docs.",
    });
  }

  if (ambiguityIds.has("unclear-auth")) {
    questions.push({
      id: "q-auth-tenancy",
      priority: 3,
      dimension: "Users, Auth & Tenancy",
      question: "Who accesses this system and what isolation model is needed?",
      options: [
        "Single-user / local / no authentication needed",
        "Standard user accounts (individual login)",
        "Role-based access (Admin / Member / Viewer)",
        "Multi-tenant B2B workspaces / organizations with strict data isolation",
      ],
      impactedDocs: ["auth-permissions", "security-model", "data-model", "domain-glossary"],
      whyItMatters:
        "Authorization and cross-tenant isolation bugs are the #1 failure mode in AI-built apps. Only creates AUTH-PERMISSIONS.md when identity boundaries actually exist.",
    });
  }

  if (ambiguityIds.has("unclear-risk-compliance")) {
    questions.push({
      id: "q-risk-capabilities",
      priority: 4,
      dimension: "High-Risk Capabilities",
      question: "Which high-risk or specialized capabilities are in scope for V1?",
      multiSelect: true,
      options: [
        "Payments, subscriptions, or financial ledger",
        "AI / LLM prompts, tool calling, or RAG",
        "Regulated PII / HIPAA / GDPR / SOC2 audit trails",
        "Background workers, queues, or multi-step workflows",
        "Third-party webhooks or external SaaS integrations",
        "None of the above (keep V1 lean)",
      ],
      impactedDocs: [
        "ai-agent-spec",
        "state-workflows",
        "integrations",
        "compliance-privacy",
        "security-model",
        "observability",
      ],
      whyItMatters:
        "Each specialized capability unlocks a targeted contract doc that prevents silent production corruption (e.g., duplicate webhooks, runaway LLM loops, PII leaks).",
    });
  }

  if (ambiguityIds.has("unclear-stack")) {
    questions.push({
      id: "q-stack",
      priority: 5,
      dimension: "Tech Stack & Constraints",
      question: "Do you have preferred languages, frameworks, or hosting constraints (or should the agent propose the cleanest default)?",
      options: [
        "Let the agent recommend a minimal, proven default stack",
        "TypeScript / Node.js ecosystem",
        "Python ecosystem",
        "Go / Rust systems stack",
        "Custom stack (specify)",
      ],
      impactedDocs: ["architecture", "data-model", "local-dev-runbook", "infra-deploy"],
      whyItMatters:
        "Locks runtime constraints early so downstream schemas, deployment topology, and testing strategy match your real environment.",
    });
  }

  if (
    !capIds.has("offline-local-first") &&
    ["mobile-app", "desktop-app", "web-saas"].includes(analysis.archetype.id) &&
    questions.length < maxQuestions
  ) {
    questions.push({
      id: "q-offline-realtime",
      priority: 6,
      dimension: "Sync & Connectivity",
      question: "Does the product require offline-first execution or real-time multiplayer/WebSocket sync?",
      options: [
        "Standard online request/response only",
        "Real-time live updates / WebSockets / SSE",
        "Offline-first local storage with background sync",
      ],
      impactedDocs: ["offline-sync", "state-workflows", "performance-budgets"],
      whyItMatters:
        "Offline conflict resolution and real-time event buses fundamentally change data modeling and cannot be bolted on cleanly later.",
    });
  }

  const selected = questions.slice(0, maxQuestions);

  return {
    projectName: analysis.projectName,
    currentAssessment: {
      archetype: analysis.archetype.id,
      archetypeConfidence: analysis.archetype.confidence,
      projectedTier: analysis.tier.id,
      detectedCapabilities: analysis.capabilities.map((c) => c.id),
    },
    needsClarification: selected.length > 0 && analysis.needsDiscovery,
    recommendedAction:
      selected.length === 0
        ? "Idea specification is sufficiently clear. Proceed directly to planning and scaffolding."
        : analysis.needsDiscovery
          ? "Ask the user these high-leverage questions first, then pass their answers into the intake profile."
          : "Idea is actionable with sensible defaults; optionally confirm these open dimensions before finalizing docs.",
    questions: selected,
  };
}
