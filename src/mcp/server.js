/**
 * Native Zero-Dependency Model Context Protocol (MCP) Stdio Server for MD-Structure.
 *
 * Implements JSON-RPC 2.0 over newline-delimited stdio so AI coding agents
 * (Claude Code, Cursor, Antigravity, Codex, Windsurf, Cline) can invoke
 * MD-Structure natively as tools, resources, and prompts.
 */

import readline from "node:readline";
import {
  ARCHETYPES,
  AUTHOR,
  CAPABILITIES,
  DOC_CATALOG,
  LAYERS,
  LOAD_POLICIES,
  SIGNATURE,
  SUPPORTED_SHIMS,
  TIERS,
  VERSION,
  addDocumentToWorkspace,
  auditWorkspace,
  generateDiscoveryQuestions,
  getCatalogDoc,
  getNextDocumentToAuthor,
  planArchitecture,
  routeContextForTask,
  scaffoldWorkspace,
  scanRepository,
  syncWorkspace,
} from "../index.js";

const SERVER_INFO = {
  name: "md-structure",
  title: SIGNATURE,
  version: VERSION,
  author: AUTHOR,
};

const SUPPORTED_PROTOCOL_VERSION = "2024-11-05";

const TOOLS = [
  {
    name: "md_analyze_idea",
    description:
      "Analyze a project idea or structured intake profile to determine HOW MANY Markdown documents are required, WHICH documents to create (in strict DAG order), WHY each is needed (failure mode prevented), WHICH catalog documents are intentionally skipped, and the context token budget.",
    inputSchema: {
      type: "object",
      properties: {
        idea: {
          type: "string",
          description: "Natural-language description of the user's project idea.",
        },
        name: {
          type: "string",
          description: "Optional project name.",
        },
        archetype: {
          type: "string",
          enum: Object.keys(ARCHETYPES),
          description: "Optional explicit project archetype override.",
        },
        tier: {
          type: "string",
          enum: Object.keys(TIERS),
          description: "Optional complexity tier override (T0, T1, T2, T3).",
        },
        capabilities: {
          type: "array",
          items: { type: "string", enum: Object.keys(CAPABILITIES) },
          description: "Optional explicit list of capability signals.",
        },
        excludeCapabilities: {
          type: "array",
          items: { type: "string", enum: Object.keys(CAPABILITIES) },
          description: "Optional capabilities explicitly ruled out.",
        },
        lifecycle: {
          type: "string",
          enum: ["prototype", "mvp", "production", "enterprise"],
        },
        teamSize: {
          type: "string",
          enum: ["solo", "small", "org"],
        },
        stack: {
          type: "array",
          items: { type: "string" },
        },
        includeDocs: {
          type: "array",
          items: { type: "string" },
          description: "Optional catalog doc IDs to force-include.",
        },
        excludeDocs: {
          type: "array",
          items: { type: "string" },
          description: "Optional catalog doc IDs to force-exclude.",
        },
        docsDir: {
          type: "string",
          description: "Target docs folder name (default: 'docs').",
        },
      },
      required: ["idea"],
    },
  },
  {
    name: "md_discovery_questions",
    description:
      "Generate the minimal set of high-leverage clarifying questions an agent should ask a user whose project idea is ambiguous, mapped directly to which Markdown files each answer determines.",
    inputSchema: {
      type: "object",
      properties: {
        idea: { type: "string", description: "User's raw project idea." },
        archetype: { type: "string", enum: Object.keys(ARCHETYPES) },
        capabilities: { type: "array", items: { type: "string" } },
        maxQuestions: { type: "integer", minimum: 1, maximum: 6, default: 5 },
      },
      required: ["idea"],
    },
  },
  {
    name: "md_scaffold_project",
    description:
      "Scaffold the complete agent-native Markdown architecture (AGENTS.md, docs/00-CONTEXT-MAP.md, selected domain MDs with YAML frontmatter and AGENT:FILL slots, optional IDE shims, and md-structure.manifest.json) into a local directory.",
    inputSchema: {
      type: "object",
      properties: {
        outDir: {
          type: "string",
          description: "Absolute or workspace-relative directory where files will be generated.",
        },
        idea: { type: "string", description: "Project idea description." },
        name: { type: "string", description: "Optional project name." },
        archetype: { type: "string", enum: Object.keys(ARCHETYPES) },
        tier: { type: "string", enum: Object.keys(TIERS) },
        capabilities: { type: "array", items: { type: "string" } },
        excludeCapabilities: { type: "array", items: { type: "string" } },
        lifecycle: { type: "string", enum: ["prototype", "mvp", "production", "enterprise"] },
        stack: { type: "array", items: { type: "string" } },
        includeDocs: { type: "array", items: { type: "string" } },
        excludeDocs: { type: "array", items: { type: "string" } },
        shims: {
          type: "array",
          items: { type: "string", enum: [...SUPPORTED_SHIMS] },
          description: "Optional thin agent shims to generate (claude, cursor, copilot, windsurf).",
        },
        docsDir: { type: "string", default: "docs" },
        dryRun: { type: "boolean", default: false },
        force: { type: "boolean", default: false },
      },
      required: ["outDir", "idea"],
    },
  },
  {
    name: "md_next_doc",
    description:
      "Given a scaffolded workspace, returns the exact next Markdown document an agent should author/finalize in strict dependency DAG order, listing upstream files to read first and remaining AGENT:FILL directives.",
    inputSchema: {
      type: "object",
      properties: {
        dir: {
          type: "string",
          description: "Path to the workspace containing md-structure.manifest.json.",
        },
      },
      required: ["dir"],
    },
  },
  {
    name: "md_audit_workspace",
    description:
      "Audit an MD-Structure workspace for completeness, YAML frontmatter integrity, unresolved AGENT:FILL slots, token-budget bloat, AGENTS.md routing sync, broken links, and orphaned docs. Returns a 0-100 readiness score and remediation plan.",
    inputSchema: {
      type: "object",
      properties: {
        dir: {
          type: "string",
          description: "Path to the workspace directory to audit.",
        },
      },
      required: ["dir"],
    },
  },
  {
    name: "md_explain_doc",
    description:
      "Explain a specific canonical Markdown archetype from the MD-Structure catalog: why it exists, what agent failure mode it prevents, when to include vs. skip it, required sections, load policy, and token budget.",
    inputSchema: {
      type: "object",
      properties: {
        docId: {
          type: "string",
          description: "Catalog document ID (e.g., 'agents-entry', 'prd', 'architecture', 'data-model', 'ai-agent-spec').",
        },
      },
      required: ["docId"],
    },
  },
  {
    name: "md_list_catalog",
    description:
      "List all 27 canonical agent-native Markdown document archetypes, complexity tiers (T0-T3), architectural layers, project archetypes, and capability triggers.",
    inputSchema: {
      type: "object",
      properties: {
        layer: {
          type: "string",
          enum: Object.keys(LAYERS),
          description: "Optional filter by architectural layer.",
        },
      },
    },
  },
  {
    name: "md_scan_repo",
    description:
      "Scan an existing local repository (package.json, pyproject.toml, Cargo.toml, go.mod, Dockerfiles, schemas, existing .md files) to infer its archetype/capabilities, generate a recommended MD-Structure blueprint, and report missing architectural docs.",
    inputSchema: {
      type: "object",
      properties: {
        dir: {
          type: "string",
          description: "Path to the existing repository directory to scan.",
        },
      },
      required: ["dir"],
    },
  },
  {
    name: "md_route_context",
    description:
      "Progressive-disclosure context router: given a specific coding task and an MD-Structure workspace, returns the minimal set of Markdown files the agent must load right now (plus exact context token savings vs. loading all docs).",
    inputSchema: {
      type: "object",
      properties: {
        dir: {
          type: "string",
          description: "Path to the workspace containing md-structure.manifest.json.",
        },
        task: {
          type: "string",
          description: "Concrete coding or debugging task description.",
        },
        includeUpstream: {
          type: "boolean",
          default: true,
        },
      },
      required: ["dir", "task"],
    },
  },
  {
    name: "md_add_doc",
    description:
      "Safely evolve an existing MD-Structure workspace by adding a canonical catalog document (e.g., 'payments-billing' -> 'integrations' or 'ai-agent-spec'), updating md-structure.manifest.json in DAG order, patching AGENTS.md routing map, and refreshing 00-CONTEXT-MAP.md.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Workspace directory." },
        docId: { type: "string", description: "Catalog document ID to add." },
        dryRun: { type: "boolean", default: false },
        force: { type: "boolean", default: false },
      },
      required: ["dir", "docId"],
    },
  },
  {
    name: "md_sync_workspace",
    description:
      "Non-destructively synchronize AGENTS.md Document Routing Map and docs/00-CONTEXT-MAP.md with md-structure.manifest.json without overwriting user-authored domain specs.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Workspace directory." },
        dryRun: { type: "boolean", default: false },
      },
      required: ["dir"],
    },
  },
];

const RESOURCES = [
  {
    uri: "md-structure://catalog",
    name: "MD-Structure Document Catalog",
    description: "Complete machine-readable taxonomy of all 27 canonical Markdown archetypes, tiers, and capability triggers.",
    mimeType: "application/json",
  },
  {
    uri: "md-structure://methodology",
    name: "Context Engineering Methodology",
    description: "Core rules answering how many MDs a project needs, progressive disclosure load policies, and token budgets.",
    mimeType: "text/markdown",
  },
  {
    uri: "md-structure://protocol",
    name: "5-Phase Agent Execution Protocol",
    description: "Deterministic workflow for AI agents turning a user idea into an audited Markdown architecture before writing code.",
    mimeType: "text/markdown",
  },
];

const PROMPTS = [
  {
    name: "architect-from-idea",
    description: "Turn a raw user project idea into an optimal, audited, progressive-disclosure Markdown architecture before writing code.",
    arguments: [
      {
        name: "idea",
        description: "The user's raw project idea or requirements.",
        required: true,
      },
      {
        name: "targetDir",
        description: "Target workspace directory path.",
        required: false,
      },
    ],
  },
  {
    name: "audit-and-repair-docs",
    description: "Audit an existing workspace's Markdown architecture for drift, bloat, or incomplete specs and repair all findings.",
    arguments: [
      {
        name: "dir",
        description: "Workspace directory path.",
        required: true,
      },
    ],
  },
];

const METHODOLOGY_MD = `# MD-Structure Context Engineering Methodology

1. **Right-Sized by Complexity Tier (T0-T3):**
   - T0 (Micro / Utility): 2-4 MDs (~1.2k-3.8k total tokens)
   - T1 (Focused MVP): 4-7 MDs (~3.5k-8.5k total tokens)
   - T2 (Production Product): 7-12 MDs (~8k-17k total tokens)
   - T3 (Enterprise / Regulated Platform): 11-16 MDs (~15k-28k total tokens)
2. **Progressive Disclosure Over Monolithic Docs:**
   - Only \`AGENTS.md\` is \`load_policy: always\` (strictly <= 1,600 tokens).
   - Every other document uses \`on-demand\`, \`task-scoped\`, or \`reference\` with explicit \`read_triggers\`.
3. **Every MD Must Prevent a Concrete Agent Failure Mode:**
   - If a document does not prevent hallucinations, naming drift, security flaws, or structural decay for THIS project, it is explicitly excluded in \`00-CONTEXT-MAP.md\`.
4. **DAG Authoring Order:**
   - Author upstream authorities first (\`AGENTS.md\` -> \`01-PRD.md\` -> \`02-ARCHITECTURE.md\` -> \`03-DATA-MODEL.md\` -> \`04-API-CONTRACT.md\` -> specialized contracts).
`;

const PROTOCOL_MD = `# 5-Phase Agent Architecture Protocol

1. **Phase 1 — Discovery:** Call \`md_discovery_questions\` on the user's idea. If \`needsClarification\` is true, ask only those high-leverage questions.
2. **Phase 2 — Blueprint Analysis:** Call \`md_analyze_idea\` with the refined intake profile. Present the exact MD count, selected docs + WHY, excluded docs + WHY, and token budget to the user.
3. **Phase 3 — Scaffold:** Call \`md_scaffold_project\` to generate \`AGENTS.md\`, \`docs/\`, optional shims, and \`md-structure.manifest.json\`.
4. **Phase 4 — DAG Authoring Loop:** Repeatedly call \`md_next_doc\`. Read listed upstream docs, fill all \`<!-- AGENT:FILL -->\` slots concisely within \`token_budget.max\`, flip \`status: approved\`, and repeat until \`completed: true\`.
5. **Phase 5 — Governance Gate:** Call \`md_audit_workspace\`. Do not write application code until \`readyForImplementation: true\` (0 errors, 0 unresolved directives, within token budgets).
`;

/**
 * Execute a single MCP JSON-RPC 2.0 request object and return a response object (or null for notifications).
 * Exported separately so unit/integration tests can invoke it directly or over stdio.
 *
 * @param {object} msg
 */
export function handleMcpMessage(msg) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") {
    return {
      jsonrpc: "2.0",
      id: msg?.id ?? null,
      error: { code: -32600, message: "Invalid JSON-RPC 2.0 request." },
    };
  }

  // Notifications have no `id` and expect no reply
  const isNotification = msg.id === undefined;

  try {
    switch (msg.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            protocolVersion: msg.params?.protocolVersion || SUPPORTED_PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: SERVER_INFO,
          },
        };

      case "notifications/initialized":
      case "notifications/cancelled":
        return null;

      case "ping":
        return { jsonrpc: "2.0", id: msg.id, result: {} };

      case "tools/list":
        return { jsonrpc: "2.0", id: msg.id, result: { tools: TOOLS } };

      case "tools/call": {
        const name = msg.params?.name;
        const args = msg.params?.arguments || {};
        const output = executeTool(name, args);
        return {
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(output, null, 2),
              },
            ],
            structuredContent: output,
            isError: false,
          },
        };
      }

      case "resources/list":
        return { jsonrpc: "2.0", id: msg.id, result: { resources: RESOURCES } };

      case "resources/read": {
        const uri = msg.params?.uri;
        const resource = readResource(uri);
        if (!resource) {
          return {
            jsonrpc: "2.0",
            id: msg.id,
            error: { code: -32602, message: `Unknown resource URI: ${uri}` },
          };
        }
        return {
          jsonrpc: "2.0",
          id: msg.id,
          result: { contents: [resource] },
        };
      }

      case "prompts/list":
        return { jsonrpc: "2.0", id: msg.id, result: { prompts: PROMPTS } };

      case "prompts/get": {
        const name = msg.params?.name;
        const args = msg.params?.arguments || {};
        const promptResult = buildPrompt(name, args);
        if (!promptResult) {
          return {
            jsonrpc: "2.0",
            id: msg.id,
            error: { code: -32602, message: `Unknown prompt: ${name}` },
          };
        }
        return { jsonrpc: "2.0", id: msg.id, result: promptResult };
      }

      default:
        if (isNotification) return null;
        return {
          jsonrpc: "2.0",
          id: msg.id,
          error: { code: -32601, message: `Method not found: ${msg.method}` },
        };
    }
  } catch (err) {
    if (isNotification) return null;
    return {
      jsonrpc: "2.0",
      id: msg.id,
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

function executeTool(name, args) {
  switch (name) {
    case "md_analyze_idea":
      return planArchitecture(args, {
        includeDocs: args.includeDocs,
        excludeDocs: args.excludeDocs,
        docsDir: args.docsDir,
      });

    case "md_discovery_questions":
      return generateDiscoveryQuestions(args, {
        maxQuestions: args.maxQuestions,
      });

    case "md_scaffold_project":
      return scaffoldWorkspace(args, {
        outDir: args.outDir,
        dryRun: Boolean(args.dryRun),
        force: Boolean(args.force),
        shims: args.shims || [],
        includeDocs: args.includeDocs,
        excludeDocs: args.excludeDocs,
        docsDir: args.docsDir,
      });

    case "md_next_doc":
      return getNextDocumentToAuthor(args.dir);

    case "md_audit_workspace":
      return auditWorkspace(args.dir);

    case "md_explain_doc": {
      const doc = getCatalogDoc(args.docId);
      if (!doc) {
        throw new Error(
          `Unknown docId '${args.docId}'. Valid IDs: ${DOC_CATALOG.map((d) => d.id).join(", ")}`
        );
      }
      return {
        ...doc,
        layerMeta: LAYERS[doc.layer],
        loadPolicyMeta: LOAD_POLICIES[doc.loadPolicy],
      };
    }

    case "md_list_catalog": {
      const docs = args.layer
        ? DOC_CATALOG.filter((d) => d.layer === args.layer)
        : DOC_CATALOG;
      return {
        totalCatalogDocs: docs.length,
        tiers: Object.values(TIERS),
        layers: Object.values(LAYERS),
        archetypes: Object.values(ARCHETYPES),
        capabilities: Object.values(CAPABILITIES),
        documents: docs.map((d) => ({
          id: d.id,
          title: d.title,
          path: d.path,
          layer: d.layer,
          loadPolicy: d.loadPolicy,
          minTier: d.minTier,
          tokenBudget: d.tokenBudget,
          triggerCapabilities: d.triggerCapabilities,
          triggerArchetypes: d.triggerArchetypes,
          whyRequired: d.whyRequired,
        })),
      };
    }

    case "md_scan_repo":
      return scanRepository(args.dir);

    case "md_route_context":
      return routeContextForTask(args.dir, args.task, {
        includeUpstream: args.includeUpstream,
      });

    case "md_add_doc":
      return addDocumentToWorkspace(args.dir, args.docId, {
        dryRun: Boolean(args.dryRun),
        force: Boolean(args.force),
      });

    case "md_sync_workspace":
      return syncWorkspace(args.dir, {
        dryRun: Boolean(args.dryRun),
      });

    default:
      throw new Error(`Unknown MCP tool: '${name}'`);
  }
}

function readResource(uri) {
  switch (uri) {
    case "md-structure://catalog":
      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            version: VERSION,
            tiers: TIERS,
            layers: LAYERS,
            archetypes: ARCHETYPES,
            capabilities: CAPABILITIES,
            documents: DOC_CATALOG,
          },
          null,
          2
        ),
      };
    case "md-structure://methodology":
      return { uri, mimeType: "text/markdown", text: METHODOLOGY_MD };
    case "md-structure://protocol":
      return { uri, mimeType: "text/markdown", text: PROTOCOL_MD };
    default:
      return null;
  }
}

function buildPrompt(name, args) {
  if (name === "architect-from-idea") {
    const idea = args.idea || "<describe project idea>";
    const targetDir = args.targetDir || ".";
    return {
      description: "Architect a right-sized Markdown structure before writing code.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Execute the MD-Structure 5-Phase Architecture Protocol for this project idea:\n\nIdea: ${idea}\nTarget Directory: ${targetDir}\n\nSteps:\n1. Call md_discovery_questions on the idea. If critical ambiguities exist, ask the user only those minimal questions before scaffolding.\n2. Call md_analyze_idea to compute the exact MD count, selected docs + WHY, excluded docs + WHY, and token budgets.\n3. Present the blueprint summary clearly to the user and scaffold via md_scaffold_project into "${targetDir}".\n4. Author every draft document in strict DAG order using md_next_doc until completed.\n5. Run md_audit_workspace and confirm readyForImplementation is true before starting implementation.`,
          },
        },
      ],
    };
  }
  if (name === "audit-and-repair-docs") {
    const dir = args.dir || ".";
    return {
      description: "Audit and repair a workspace's Markdown architecture.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Run md_audit_workspace on "${dir}". For every error or warning (missing docs, unresolved AGENT:FILL slots, token budget bloat, broken links, missing AGENTS.md routes, orphaned docs), execute the remediation plan and re-run md_audit_workspace until readinessScore reaches 100 and readyForImplementation is true.`,
          },
        },
      ],
    };
  }
  return null;
}

/**
 * Start the MCP JSON-RPC 2.0 server listening on stdin and writing to stdout.
 * Resolves only after readline has finished processing all buffered lines and closed.
 * @returns {Promise<void>}
 */
export function startMcpServer() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        const errResp = {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error: invalid JSON" },
        };
        process.stdout.write(JSON.stringify(errResp) + "\n");
        return;
      }

      const response = handleMcpMessage(parsed);
      if (response !== null) {
        process.stdout.write(JSON.stringify(response) + "\n");
      }
    });

    rl.on("close", () => {
      resolve();
    });

    process.stderr.write(`[md-structure] MCP stdio server v${VERSION} by ${AUTHOR} ready.\n`);
  });
}
