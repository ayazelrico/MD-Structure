/**
 * Main CLI Command Router for MD-Structure.
 *
 * Exit code contract:
 *   0 = Success (or audit readyForImplementation === true)
 *   1 = Runtime / usage / invalid argument error
 *   2 = Governance audit gate failed (errors or incomplete drafts in --strict mode)
 */

import fs from "node:fs";
import path from "node:path";
import {
  AUTHOR,
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
import { startMcpServer } from "../mcp/server.js";
import { parseCliArgs, parseCsvFlag } from "./args.js";
import {
  formatAddDoc,
  formatAudit,
  formatBlueprint,
  formatCatalog,
  formatDiscovery,
  formatExplain,
  formatNextDoc,
  formatRoute,
  formatScaffold,
  formatScan,
  formatSync,
} from "./formatters.js";
import { runWizard } from "./interactive.js";

const HELP_TEXT = `${SIGNATURE} (v${VERSION}) — Agent-Native Project Architecture & Markdown Governance System

USAGE:
  md-structure <command> [arguments] [options]

COMMANDS:
  analyze [idea]       Determine HOW MANY MDs, WHICH MDs (DAG order), WHY each exists,
                       WHICH are skipped, and exact token budgets.
  discover [idea]      Generate minimal high-leverage clarifying questions for an agent
                       when a project idea has architectural ambiguities.
  init [idea]          Scaffold AGENTS.md, docs/00-CONTEXT-MAP.md, selected domain MDs,
                       optional IDE shims, and md-structure.manifest.json.
  scan [dir]           Scan an existing local repository to infer archetype/capabilities,
                       recommend a tailored MD blueprint, and report missing MDs.
  route <task>         Progressive-disclosure router: return the exact minimal MDs to
                       load for a specific coding task + token savings.
  add-doc <doc-id>     Add a catalog MD to an existing workspace, update manifest in DAG
                       order, patch AGENTS.md routing table, and refresh 00-CONTEXT-MAP.md.
  sync                 Non-destructively sync AGENTS.md routing map & 00-CONTEXT-MAP.md
                       with md-structure.manifest.json.
  next                 Return the next single MD file an agent should author in DAG order.
  audit                Audit workspace completeness, frontmatter, AGENT:FILL slots,
                       token budgets, AGENTS.md routing sync, and broken links.
  explain <doc-id>     Explain why a catalog Markdown archetype exists and what agent
                       failure mode it prevents.
  catalog              List all 27 canonical Markdown document archetypes.
  wizard               Interactive terminal wizard for human-guided scaffolding.
  mcp                  Start the native JSON-RPC 2.0 MCP stdio server for AI agents.

COMMON OPTIONS:
  --json               Emit strictly machine-readable JSON on stdout (agent default).
  --profile <file>     Load structured Intake Profile JSON from file.
  --name <name>        Explicit project name.
  --archetype <id>     Override project archetype (web-saas, api-backend, ai-agent-system,
                       cli-tool, library-sdk, mobile-app, desktop-app, data-pipeline,
                       monorepo-platform, browser-extension).
  --tier <T0|T1|T2|T3> Override complexity tier.
  --caps <a,b>         Force-enable capability signals (comma-separated).
  --exclude-caps <a,b> Explicitly rule out capability signals.
  --include <a,b>      Force-include specific catalog doc IDs.
  --exclude <a,b>      Force-exclude specific catalog doc IDs.
  --stack <a,b>        Specify preferred stack tokens (comma-separated).
  --lifecycle <stage>  prototype | mvp | production | enterprise
  --team <size>        solo | small | org

INIT OPTIONS:
  --out <dir>          Target directory to scaffold into (required for init).
  --shims <list>       Generate thin single-source-of-truth shims (${SUPPORTED_SHIMS.join(",")}).
  --docs-dir <dir>     Subdirectory for domain docs (default: docs).
  --dry-run            Preview files and token budgets without writing to disk.
  --force              Overwrite existing files.

AUDIT / NEXT OPTIONS:
  --dir <dir>          Workspace directory to inspect (default: current directory).
  --strict             Exit with code 2 if workspace is not readyForImplementation.

EXAMPLES:
  md-structure analyze "Multi-tenant B2B SaaS with Stripe billing, RBAC, and AI copilot" --json
  md-structure discover "Build an invoice app" --json
  md-structure init "Local CLI code analyzer with plugin hooks" --out ./my-cli --shims claude,cursor --json
  md-structure next --dir ./my-cli --json
  md-structure audit --dir ./my-cli --strict --json
  md-structure mcp
`;

function loadIntakeInput(positionals, flags) {
  let baseProfile = {};
  if (typeof flags.profile === "string") {
    const profilePath = path.resolve(flags.profile);
    if (!fs.existsSync(profilePath)) {
      throw new Error(`Profile file not found: ${profilePath}`);
    }
    baseProfile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  }

  const ideaFromArgs = positionals.join(" ").trim();
  const profile = {
    ...baseProfile,
    idea: ideaFromArgs || baseProfile.idea || "",
  };

  if (typeof flags.name === "string") profile.name = flags.name;
  if (typeof flags.archetype === "string") profile.archetype = flags.archetype;
  if (typeof flags.tier === "string") profile.tier = flags.tier.toUpperCase();
  if (typeof flags.lifecycle === "string") profile.lifecycle = flags.lifecycle;
  if (typeof flags.team === "string") profile.teamSize = flags.team;

  const caps = parseCsvFlag(flags.caps);
  if (caps.length > 0) {
    profile.capabilities = [...new Set([...(profile.capabilities || []), ...caps])];
  }
  const exCaps = parseCsvFlag(flags["exclude-caps"]);
  if (exCaps.length > 0) {
    profile.excludeCapabilities = [...new Set([...(profile.excludeCapabilities || []), ...exCaps])];
  }
  const stack = parseCsvFlag(flags.stack);
  if (stack.length > 0) {
    profile.stack = [...new Set([...(profile.stack || []), ...stack])];
  }

  return profile;
}

function emitOutput(data, formattedText, asJson) {
  if (asJson) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  } else {
    process.stdout.write(formattedText + "\n");
  }
}

/**
 * Execute CLI with the given argv slice.
 * @param {string[]} argv
 * @returns {Promise<number>} exit code
 */
export async function runCli(argv) {
  const { command, positionals, flags } = parseCliArgs(argv);
  const asJson = Boolean(flags.json);

  if (flags.version || flags.v) {
    if (asJson) {
      process.stdout.write(JSON.stringify({ name: "md-structure", version: VERSION, author: AUTHOR }) + "\n");
    } else {
      process.stdout.write(`md-structure ${VERSION} (by ${AUTHOR})\n`);
    }
    return 0;
  }

  if (!command || command === "help" || flags.help || flags.h) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  try {
    switch (command) {
      case "analyze": {
        const profile = loadIntakeInput(positionals, flags);
        if (!profile.idea && !profile.archetype && !profile.name) {
          throw new Error("Provide a project idea string or --profile <file.json>.");
        }
        const blueprint = planArchitecture(profile, {
          includeDocs: parseCsvFlag(flags.include),
          excludeDocs: parseCsvFlag(flags.exclude),
          docsDir: typeof flags["docs-dir"] === "string" ? flags["docs-dir"] : "docs",
        });
        emitOutput(
          blueprint,
          formatBlueprint(blueprint, { showExcluded: Boolean(flags["show-excluded"]) }),
          asJson
        );
        return 0;
      }

      case "discover": {
        const profile = loadIntakeInput(positionals, flags);
        if (!profile.idea && !profile.archetype) {
          throw new Error("Provide a project idea string or --profile <file.json>.");
        }
        const maxQuestions = flags.max ? Number(flags.max) : 5;
        const discovery = generateDiscoveryQuestions(profile, { maxQuestions });
        emitOutput(discovery, formatDiscovery(discovery), asJson);
        return 0;
      }

      case "init": {
        const outDir = typeof flags.out === "string" ? flags.out : null;
        if (!outDir) {
          throw new Error("Missing required option --out <directory>.");
        }
        const profile = loadIntakeInput(positionals, flags);
        if (!profile.idea && !profile.archetype && !profile.name) {
          throw new Error("Provide a project idea string or --profile <file.json>.");
        }

        const shims = parseCsvFlag(flags.shims);
        for (const s of shims) {
          if (!SUPPORTED_SHIMS.includes(s)) {
            throw new Error(`Unsupported shim '${s}'. Supported: ${SUPPORTED_SHIMS.join(", ")}`);
          }
        }

        const result = scaffoldWorkspace(profile, {
          outDir,
          dryRun: Boolean(flags["dry-run"]),
          force: Boolean(flags.force),
          shims,
          includeDocs: parseCsvFlag(flags.include),
          excludeDocs: parseCsvFlag(flags.exclude),
          docsDir: typeof flags["docs-dir"] === "string" ? flags["docs-dir"] : "docs",
        });

        emitOutput(result, formatScaffold(result), asJson);
        return 0;
      }

      case "next": {
        const dir = typeof flags.dir === "string" ? flags.dir : positionals[0] || ".";
        const nextInfo = getNextDocumentToAuthor(dir);
        emitOutput(nextInfo, formatNextDoc(nextInfo), asJson);
        return 0;
      }

      case "scan": {
        const dir = typeof flags.dir === "string" ? flags.dir : positionals[0] || ".";
        const scan = scanRepository(dir);
        emitOutput(scan, formatScan(scan), asJson);
        return 0;
      }

      case "route": {
        const dir = typeof flags.dir === "string" ? flags.dir : ".";
        const task = positionals.join(" ").trim();
        if (!task) {
          throw new Error("Provide a task description, e.g.: md-structure route \"Add Stripe webhook handler\" --dir . --json");
        }
        const route = routeContextForTask(dir, task);
        emitOutput(route, formatRoute(route), asJson);
        return 0;
      }

      case "add-doc": {
        const docId = positionals[0];
        if (!docId) {
          throw new Error("Specify a catalog document ID, e.g.: md-structure add-doc ai-agent-spec --dir .");
        }
        const dir = typeof flags.dir === "string" ? flags.dir : ".";
        const res = addDocumentToWorkspace(dir, docId, {
          dryRun: Boolean(flags["dry-run"]),
          force: Boolean(flags.force),
        });
        emitOutput(res, formatAddDoc(res), asJson);
        return 0;
      }

      case "sync": {
        const dir = typeof flags.dir === "string" ? flags.dir : positionals[0] || ".";
        const res = syncWorkspace(dir, { dryRun: Boolean(flags["dry-run"]) });
        emitOutput(res, formatSync(res), asJson);
        return 0;
      }

      case "audit": {
        const dir = typeof flags.dir === "string" ? flags.dir : positionals[0] || ".";
        const report = auditWorkspace(dir);
        emitOutput(report, formatAudit(report), asJson);
        if (flags.strict && !report.readyForImplementation) {
          return 2;
        }
        if (report.summary.errorCount > 0) {
          return 2;
        }
        return 0;
      }

      case "explain": {
        const docId = positionals[0];
        if (!docId) {
          throw new Error(
            `Specify a document ID. Run 'md-structure catalog' to see all ${DOC_CATALOG.length} IDs.`
          );
        }
        const doc = getCatalogDoc(docId);
        if (!doc) {
          throw new Error(
            `Unknown document ID '${docId}'. Valid IDs: ${DOC_CATALOG.map((d) => d.id).join(", ")}`
          );
        }
        const enriched = {
          ...doc,
          layerMeta: LAYERS[doc.layer],
          loadPolicyMeta: LOAD_POLICIES[doc.loadPolicy],
        };
        emitOutput(enriched, formatExplain(enriched), asJson);
        return 0;
      }

      case "catalog": {
        const layer = typeof flags.layer === "string" ? flags.layer : null;
        if (layer && !LAYERS[layer]) {
          throw new Error(`Unknown layer '${layer}'. Valid layers: ${Object.keys(LAYERS).join(", ")}`);
        }
        const docs = layer ? DOC_CATALOG.filter((d) => d.layer === layer) : DOC_CATALOG;
        const payload = {
          total: docs.length,
          tiers: Object.values(TIERS),
          layers: Object.values(LAYERS),
          documents: docs,
        };
        emitOutput(payload, formatCatalog(docs), asJson);
        return 0;
      }

      case "wizard": {
        return await runWizard();
      }

      case "mcp": {
        await startMcpServer();
        return 0;
      }

      default:
        throw new Error(`Unknown command '${command}'. Run 'md-structure --help' for usage.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (asJson) {
      process.stderr.write(JSON.stringify({ error: { message } }) + "\n");
    } else {
      process.stderr.write(`Error: ${message}\n`);
    }
    return 1;
  }
}
