/**
 * Deterministic Idea & Intake Profile Analyzer.
 *
 * Extracts project archetype, capability signals, complexity score,
 * risk profile, and architectural ambiguities from natural language ideas
 * or structured agent intake profiles.
 */

import { ARCHETYPES, CAPABILITIES, TIERS } from "./constants.js";

const ARCHETYPE_RULES = [
  {
    id: "ai-agent-system",
    patterns: [
      /\b(ai agent|coding agent|agentic|autonomous agent|multi-agent|agent orchestration|agent framework|ai assistant|ai copilot|llm|mcp server|mcp tools|mcp|rag|copilot|chatbot|prompt orchestration|tool calling|openai|anthropic|gemini|claude|langchain|langgraph|vercel ai sdk|vector db|embeddings)\b/gi,
    ],
    weight: 4,
  },
  {
    id: "monorepo-platform",
    patterns: [
      /\b(monorepo|turborepo|nx workspace|pnpm workspace|multi-package|microservices|microfrontends|platform with multiple apps|shared packages)\b/gi,
    ],
    weight: 4,
  },
  {
    id: "cli-tool",
    patterns: [
      /\b(cli|command[- ]line|terminal tool|local tool|devtool|scaffolder|code generator|linter|shell tool|binary|npx)\b/gi,
    ],
    weight: 4,
  },
  {
    id: "library-sdk",
    patterns: [
      /\b(sdk|library|npm package|python package|crate|framework|reusable module|component library|design system package|open[- ]source package)\b/gi,
    ],
    weight: 4,
  },
  {
    id: "mobile-app",
    patterns: [
      /\b(mobile app|ios app|android app|react native|flutter|swiftui|kotlin multiplatform|expo)\b/gi,
    ],
    weight: 4,
  },
  {
    id: "desktop-app",
    patterns: [
      /\b(desktop app|electron|tauri|macos app|windows app|native desktop|menu bar app)\b/gi,
    ],
    weight: 4,
  },
  {
    id: "browser-extension",
    patterns: [
      /\b(chrome extension|browser extension|firefox add-on|safari extension|vscode extension|figma plugin|obsidian plugin)\b/gi,
    ],
    weight: 5,
  },
  {
    id: "data-pipeline",
    patterns: [
      /\b(data pipeline|etl|elt|streaming pipeline|kafka|flink|airflow|dbt|data warehouse|analytics engine|batch ingestion|bigquery|snowflake|iceberg)\b/gi,
    ],
    weight: 4,
  },
  {
    id: "api-backend",
    patterns: [
      /\b(rest api|graphql api|grpc|backend service|api server|microservice|webhook processor|headless backend)\b/gi,
    ],
    weight: 3,
  },
  {
    id: "web-saas",
    patterns: [
      /\b(saas|web app|webapp|dashboard|portal|marketplace|crm|erp|cms|storefront|e-commerce|ecommerce|booking platform|next\.js|nextjs|react app|sveltekit|nuxt|full[- ]stack)\b/gi,
    ],
    weight: 3,
  },
];

const CAPABILITY_RULES = [
  {
    id: "database-persistence",
    patterns: [
      /\b(database|postgres|postgresql|mysql|sqlite|mongodb|firestore|supabase|neon|prisma|drizzle|dynamo|redis|storage|persist|records|crud|ledger|warehouse|vector db|indexeddb)\b/gi,
    ],
  },
  {
    id: "public-api",
    patterns: [
      /\b(api|rest|graphql|grpc|endpoints|webhook|openapi|swagger|http server|backend|rpc|json-rpc)\b/gi,
    ],
  },
  {
    id: "auth-rbac",
    patterns: [
      /\b(auth|authentication|authorization|login|signup|oauth|sso|saml|jwt|rbac|abac|roles|permissions|admin panel|api keys|clerk|auth0|passkey)\b/gi,
    ],
  },
  {
    id: "multi-tenant",
    patterns: [
      /\b(multi[- ]tenant|b2b|organizations|workspaces|teams|org isolation|tenant|enterprise accounts|subdomains)\b/gi,
    ],
  },
  {
    id: "payments-billing",
    patterns: [
      /\b(payment|payments|billing|stripe|paddle|lemonsqueezy|subscription|subscriptions|invoice|invoicing|checkout|usage metering|credits|wallet|payout|fintech|ledger)\b/gi,
    ],
  },
  {
    id: "ai-llm-agents",
    patterns: [
      /\b(ai|llm|agent|agents|agentic|gpt|claude|gemini|openai|anthropic|rag|embedding|embeddings|prompt|mcp|tool calling|evals|copilot|autonomous|inference)\b/gi,
    ],
  },
  {
    id: "complex-ui",
    patterns: [
      /\b(ui|frontend|dashboard|design system|canvas|editor|interactive|web app|mobile app|desktop app|portal|landing page|kanban|calendar|builder|charts|tailwind|react|vue|svelte|next\.js)\b/gi,
    ],
  },
  {
    id: "state-workflows",
    patterns: [
      /\b(workflow|workflows|state machine|approval|approvals|pipeline|lifecycle|orchestration|saga|durable execution|step function|booking flow|order lifecycle|status transition)\b/gi,
    ],
  },
  {
    id: "realtime-sync",
    patterns: [
      /\b(realtime|real-time|websocket|websockets|sse|server-sent|live collaboration|multiplayer|cursors|chat|presence|streaming updates|pub\/sub|notifications)\b/gi,
    ],
  },
  {
    id: "external-integrations",
    patterns: [
      /\b(integration|integrations|third[- ]party|webhook|webhooks|slack|github|notion|linear|jira|google drive|gmail|twilio|sendgrid|resend|shopify|salesforce|hubspot|oauth provider|stripe)\b/gi,
    ],
  },
  {
    id: "background-jobs",
    patterns: [
      /\b(background job|queue|queues|worker|workers|cron|scheduled|scheduler|async processing|batch job|email queue|bullmq|celery|inngest|trigger\.dev|temporal|sqs)\b/gi,
    ],
  },
  {
    id: "compliance-pii",
    patterns: [
      /\b(compliance|gdpr|hipaa|soc2|soc 2|pci|pci-dss|pii|phi|healthcare|medical|banking|financial regulation|legal|kyc|aml|audit log|audit trail|privacy|data residency|encrypted)\b/gi,
    ],
  },
  {
    id: "high-throughput",
    patterns: [
      /\b(high[- ]throughput|high scale|millions of|low latency|sub-100ms|real-time bidding|edge caching|cdn|load balanced|distributed|sharded|rate limit|high concurrency|sla|slo)\b/gi,
    ],
  },
  {
    id: "cli-interface",
    patterns: [
      /\b(cli|command[- ]line|terminal|subcommand|stdin|stdout|shell|local tool|npx|binary)\b/gi,
    ],
  },
  {
    id: "sdk-surface",
    patterns: [
      /\b(npm package|python package|pypi package|rust crate|client library|developer kit|reusable library|public sdk|build an? sdk|programmatic sdk|component library)\b/gi,
    ],
  },
  {
    id: "plugin-extensibility",
    patterns: [
      /\b(plugin|plugins|extension|extensions|marketplace|hooks|sandboxed|custom modules|add-on|extensible)\b/gi,
    ],
  },
  {
    id: "offline-local-first",
    patterns: [
      /\b(offline|local[- ]first|sync engine|crdt|local sqlite|indexeddb|runs locally|no internet|local tool|desktop app|mobile app)\b/gi,
    ],
  },
  {
    id: "self-hosted-infra",
    patterns: [
      /\b(docker|kubernetes|k8s|terraform|aws|gcp|azure|self[- ]hosted|ci\/cd|vercel|cloudflare|fly\.io|railway|cloud run|helm|deployment|production deploy)\b/gi,
    ],
  },
  {
    id: "migration-legacy",
    patterns: [
      /\b(migrate|migration|legacy|rewrite|strangler|cutover|backfill|replace existing|v1 to v2|modernize)\b/gi,
    ],
  },
  {
    id: "monorepo",
    patterns: [
      /\b(monorepo|turborepo|nx|pnpm workspaces|multi[- ]package|multiple services|microservices|microfrontends)\b/gi,
    ],
  },
  {
    id: "complex-domain",
    patterns: [
      /\b(accounting|double[- ]entry|trading|order book|underwriting|clinical|ehr|supply chain|logistics|compiler|ast|cad|erp|insurance|tax engine|procurement|legal contract)\b/gi,
    ],
  },
];

const MICRO_SIGNAL_PATTERN =
  /\b(tiny|simple|quick|small|minimal|single[- ]purpose|prototype|script|utility|one[- ]off|mvp|lightweight|hobby|personal tool)\b/gi;

const ENTERPRISE_SIGNAL_PATTERN =
  /\b(enterprise|regulated|mission[- ]critical|multi[- ]region|global scale|bank|hospital|government|multi[- ]team|organization[- ]wide)\b/gi;

/**
 * Derive a clean project slug from a name or idea string.
 * @param {string} input
 * @returns {string}
 */
export function slugifyProjectName(input) {
  const cleaned = String(input || "untitled-project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 48) || "untitled-project";
}

/**
 * Infer a readable project name if the user only provided an idea sentence.
 * @param {string} idea
 * @returns {string}
 */
function inferProjectName(idea) {
  if (!idea) return "Untitled Project";
  // Look for explicit naming cues: "called X", "named X", "project X"
  const explicitMatch = idea.match(
    /\b(?:called|named|titled)\s+["'`]?([A-Za-z0-9][A-Za-z0-9._ -]{1,36})["'`]?/i
  );
  if (explicitMatch) {
    return explicitMatch[1].trim().replace(/[.,;:!?]+$/, "");
  }
  const words = idea
    .replace(/[^A-Za-z0-9\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => !["a", "an", "the", "build", "create", "make", "i", "want", "to", "for", "that", "with"].includes(w.toLowerCase()))
    .slice(0, 4);
  if (words.length === 0) return "New Project";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * Match regex list and return deduplicated matched phrases.
 * @param {string} text
 * @param {RegExp[]} patterns
 * @returns {string[]}
 */
function collectMatches(text, patterns) {
  const hits = new Set();
  for (const rx of patterns) {
    const cloned = new RegExp(rx.source, rx.flags);
    let m;
    while ((m = cloned.exec(text)) !== null) {
      hits.add(m[0].toLowerCase().trim());
    }
  }
  return [...hits];
}

/**
 * Determine complexity tier from numeric score.
 * @param {number} score
 * @returns {"T0" | "T1" | "T2" | "T3"}
 */
function scoreToTier(score) {
  if (score <= TIERS.T0.maxScore) return "T0";
  if (score <= TIERS.T1.maxScore) return "T1";
  if (score <= TIERS.T2.maxScore) return "T2";
  return "T3";
}

/**
 * Analyze a raw idea string or structured intake profile.
 *
 * @param {string | {
 *   idea?: string,
 *   name?: string,
 *   archetype?: string,
 *   capabilities?: string[],
 *   excludeCapabilities?: string[],
 *   tier?: "T0" | "T1" | "T2" | "T3",
 *   teamSize?: "solo" | "small" | "org",
 *   lifecycle?: "prototype" | "mvp" | "production" | "enterprise",
 *   riskLevel?: "low" | "medium" | "high" | "critical",
 *   stack?: string[],
 *   constraints?: string[]
 * }} input
 */
export function analyzeProject(input) {
  const profile = typeof input === "string" ? { idea: input } : { ...(input || {}) };
  const ideaText = String(profile.idea || "").trim();
  const stackText = Array.isArray(profile.stack) ? profile.stack.join(" ") : "";
  const constraintsText = Array.isArray(profile.constraints) ? profile.constraints.join(" ") : "";
  const corpus = [profile.name || "", ideaText, stackText, constraintsText].join(" ").trim();

  // 1. Archetype scoring
  const archetypeScores = [];
  for (const rule of ARCHETYPE_RULES) {
    const matches = collectMatches(corpus, rule.patterns);
    if (matches.length > 0) {
      archetypeScores.push({
        id: rule.id,
        score: matches.length * rule.weight,
        matches,
      });
    }
  }
  archetypeScores.sort((a, b) => b.score - a.score);

  let detectedArchetype = "web-saas";
  let archetypeConfidence = "low";
  let archetypeMatches = [];

  if (profile.archetype && ARCHETYPES[profile.archetype]) {
    detectedArchetype = profile.archetype;
    archetypeConfidence = "explicit";
    archetypeMatches = ["explicitly specified in intake profile"];
  } else if (archetypeScores.length > 0) {
    detectedArchetype = archetypeScores[0].id;
    archetypeMatches = archetypeScores[0].matches;
    archetypeConfidence = archetypeScores[0].score >= 8 ? "high" : "medium";
  }

  const archetypeMeta = ARCHETYPES[detectedArchetype];

  // 2. Capability extraction
  /** @type {Map<string, string[]>} */
  const capabilityEvidence = new Map();

  for (const rule of CAPABILITY_RULES) {
    const matches = collectMatches(corpus, rule.patterns);
    if (matches.length > 0) {
      capabilityEvidence.set(rule.id, matches);
    }
  }

  // Merge archetype default capabilities if not explicitly excluded (with clear provenance)
  const excludedCaps = new Set(Array.isArray(profile.excludeCapabilities) ? profile.excludeCapabilities : []);
  for (const defaultCap of archetypeMeta.defaultCapabilities) {
    if (!excludedCaps.has(defaultCap) && !capabilityEvidence.has(defaultCap)) {
      capabilityEvidence.set(defaultCap, [`inferred from archetype:${detectedArchetype}`]);
    }
  }

  // Merge explicitly supplied capabilities
  if (Array.isArray(profile.capabilities)) {
    for (const cap of profile.capabilities) {
      if (CAPABILITIES[cap] && !excludedCaps.has(cap)) {
        const existing = capabilityEvidence.get(cap) || [];
        if (!existing.includes("explicitly specified")) {
          capabilityEvidence.set(cap, [...existing, "explicitly specified"]);
        }
      }
    }
  }

  // Remove self-hosted-infra if only triggered by managed cloud SDK names in stack without explicit deployment focus
  if (
    capabilityEvidence.has("self-hosted-infra") &&
    capabilityEvidence.get("self-hosted-infra").every((m) => m === "vercel" || m === "cloudflare") &&
    !/\b(deploy|deployment|docker|kubernetes|terraform|infra|ci\/cd|self[- ]hosted)\b/i.test(corpus)
  ) {
    capabilityEvidence.delete("self-hosted-infra");
  }

  // Remove explicitly excluded capabilities
  for (const cap of excludedCaps) {
    capabilityEvidence.delete(cap);
  }

  const capabilities = [...capabilityEvidence.keys()].filter((id) => Boolean(CAPABILITIES[id]));
  const capabilityDetails = capabilities.map((id) => ({
    id,
    label: CAPABILITIES[id].label,
    weight: CAPABILITIES[id].weight,
    evidence: capabilityEvidence.get(id) || [],
  }));

  // 3. Complexity scoring
  const microHits = collectMatches(corpus, [MICRO_SIGNAL_PATTERN]);
  const enterpriseHits = collectMatches(corpus, [ENTERPRISE_SIGNAL_PATTERN]);

  let complexityScore = archetypeMeta.baseComplexity;

  // Add weighted capability points (diminishing slightly for inferred defaults)
  for (const detail of capabilityDetails) {
    const onlyInferred =
      detail.evidence.length === 1 && detail.evidence[0].startsWith("inferred from archetype:");
    complexityScore += onlyInferred ? Math.max(0.5, detail.weight * 0.5) : detail.weight;
  }

  // Lifecycle & team modifiers
  if (profile.lifecycle === "prototype") complexityScore -= 3;
  else if (profile.lifecycle === "mvp") complexityScore -= 1;
  else if (profile.lifecycle === "production") complexityScore += 2;
  else if (profile.lifecycle === "enterprise") complexityScore += 5;

  if (profile.teamSize === "org") complexityScore += 3;
  else if (profile.teamSize === "small") complexityScore += 1;

  if (microHits.length > 0 && enterpriseHits.length === 0 && !profile.lifecycle) {
    complexityScore -= Math.min(3, microHits.length * 1.5);
  }
  if (enterpriseHits.length > 0) {
    complexityScore += Math.min(5, enterpriseHits.length * 2);
  }

  complexityScore = Math.max(0, Math.round(complexityScore));

  // 4. Risk level assessment
  let riskLevel = profile.riskLevel || "low";
  if (!profile.riskLevel) {
    const hasCritical =
      capabilities.includes("compliance-pii") ||
      (capabilities.includes("payments-billing") && capabilities.includes("multi-tenant"));
    const hasHigh =
      capabilities.includes("payments-billing") ||
      capabilities.includes("multi-tenant") ||
      capabilities.includes("auth-rbac") ||
      capabilities.includes("migration-legacy");
    const hasMedium =
      capabilities.includes("ai-llm-agents") ||
      capabilities.includes("public-api") ||
      capabilities.includes("database-persistence") ||
      capabilities.includes("external-integrations");

    if (hasCritical) riskLevel = "critical";
    else if (hasHigh) riskLevel = "high";
    else if (hasMedium) riskLevel = "medium";
    else riskLevel = "low";
  }

  // 5. Tier resolution
  const computedTier = scoreToTier(complexityScore);
  const tier = profile.tier && TIERS[profile.tier] ? profile.tier : computedTier;

  // 6. Ambiguity detection (what key architecture signals are still unclear?)
  const ambiguities = [];
  if (!ideaText || ideaText.split(/\s+/).length < 6) {
    ambiguities.push({
      id: "sparse-idea",
      severity: "high",
      dimension: "Problem & Scope",
      reason: "The project idea description is very brief; scope boundaries and core capabilities are likely underspecified.",
    });
  }
  if (archetypeConfidence === "low") {
    ambiguities.push({
      id: "unclear-archetype",
      severity: "high",
      dimension: "Runtime Archetype",
      reason: "Could not confidently determine whether this is a web app, API service, CLI tool, AI agent, mobile/desktop app, or library.",
    });
  }
  if (!profile.lifecycle && microHits.length === 0 && enterpriseHits.length === 0) {
    ambiguities.push({
      id: "unclear-lifecycle",
      severity: "medium",
      dimension: "Target Maturity / Scale",
      reason: "Unclear if this is a throwaway prototype (T0), focused MVP (T1), production product (T2), or enterprise platform (T3).",
    });
  }
  if (
    ["web-saas", "api-backend", "ai-agent-system", "mobile-app"].includes(detectedArchetype) &&
    !capabilities.includes("auth-rbac") &&
    !excludedCaps.has("auth-rbac")
  ) {
    ambiguities.push({
      id: "unclear-auth",
      severity: "medium",
      dimension: "Users, Auth & Tenancy",
      reason: "Unclear whether the system has user accounts, role-based access control, or multi-tenant workspaces.",
    });
  }
  if (
    !Array.isArray(profile.stack) ||
    profile.stack.length === 0
  ) {
    const mentionsStack =
      /\b(node|typescript|javascript|python|go|rust|java|swift|kotlin|next\.js|react|vue|svelte|django|fastapi|postgres|sqlite|mongodb|supabase|firebase|cloudflare|vercel)\b/i.test(
        corpus
      );
    if (!mentionsStack) {
      ambiguities.push({
        id: "unclear-stack",
        severity: "low",
        dimension: "Preferred Tech Stack",
        reason: "No runtime, language, or storage engine was mentioned; the agent will need to propose or confirm stack defaults.",
      });
    }
  }
  if (
    ["web-saas", "api-backend", "ai-agent-system"].includes(detectedArchetype) &&
    !capabilities.includes("payments-billing") &&
    !capabilities.includes("compliance-pii") &&
    !profile.riskLevel
  ) {
    ambiguities.push({
      id: "unclear-risk-compliance",
      severity: "low",
      dimension: "Sensitive Data & Risk Profile",
      reason: "Unclear if the project handles payments, regulated PII/PHI, or strict compliance requirements.",
    });
  }

  const projectName = profile.name ? String(profile.name).trim() : inferProjectName(ideaText);

  return {
    projectName,
    projectSlug: slugifyProjectName(projectName),
    idea: ideaText,
    archetype: {
      id: detectedArchetype,
      label: archetypeMeta.label,
      confidence: archetypeConfidence,
      evidence: archetypeMatches,
      alternatives: archetypeScores.slice(1, 3).map((s) => ({
        id: s.id,
        label: ARCHETYPES[s.id].label,
        score: s.score,
      })),
    },
    tier: {
      id: tier,
      name: TIERS[tier].name,
      summary: TIERS[tier].summary,
      overridden: Boolean(profile.tier && profile.tier !== computedTier),
      computedTier,
      complexityScore,
    },
    riskLevel,
    capabilities: capabilityDetails,
    stack: Array.isArray(profile.stack) ? profile.stack : [],
    constraints: Array.isArray(profile.constraints) ? profile.constraints : [],
    signals: {
      microHits,
      enterpriseHits,
    },
    ambiguities,
    needsDiscovery: ambiguities.some((a) => a.severity === "high") || ambiguities.length >= 3,
  };
}
