# MD-Structure

**Agent-Native Project Architecture Decision Engine, Markdown Scaffolder, MCP Server & Context-Governance Auditor — Created by Ayazelrico.**

> Built from the ground up **for AI coding agents** — solving the exact problem developers hit when starting a project from an idea:
> **How many `.md` files do we need? Which ones? Why does each exist (and why were others skipped)? In what order should the agent author and load them?**

---

## Why MD-Structure Exists

When a user describes a software idea to an AI coding agent, two failure modes dominate:

1. **Under-specification (0–1 MD files):** Critical decisions remain trapped in chat history. After context compaction, the agent hallucinates column names, breaks API envelopes, misses tenant isolation, and forgets invariants.
2. **Over-specification (20+ bloated human docs):** Massive narrative specs burn 40% of the context window before coding starts, contradict each other across files, and drift rapidly.

**MD-Structure** replaces guesswork with a **deterministic, zero-dependency local Context Engineering engine**:

- **27 Canonical Agent-Native Markdown Archetypes** across 6 architectural layers (`bootstrap`, `product`, `system`, `engineering`, `operations`, `governance`).
- **4 Complexity Tiers (`T0`–`T3`):**
  - `T0` **Micro / Utility** → 2–4 MDs (~1.2k–3.8k total tokens)
  - `T1` **Focused MVP** → 4–7 MDs (~3.5k–8.5k total tokens)
  - `T2` **Production Product** → 7–12 MDs (~8k–17k total tokens)
  - `T3` **Enterprise / Distributed Platform** → 11–16 MDs (~15k–28k total tokens)
- **Progressive Disclosure by Default:** Only `AGENTS.md` is `load_policy: always` (capped <= 1,600 tokens). Every other `.md` carries machine-readable YAML frontmatter (`load_policy`, `token_budget`, `depends_on`, `authority`, `read_triggers`, `update_triggers`).
- **Explicit Exclusion Ledger (`docs/00-CONTEXT-MAP.md`):** Records both **why** each active MD exists (the exact agent failure mode it prevents) and **why** every omitted catalog archetype was intentionally skipped.
- **DAG Authoring Navigator (`md-structure next`):** Feeds the agent one `.md` file at a time in strict topological dependency order (`AGENTS.md` → `01-PRD.md` → `02-ARCHITECTURE.md` → `03-DATA-MODEL.md` → ...).
- **Pre-Code Governance Auditor (`md-structure audit`):** Scores readiness `0–100`, detects unresolved `<!-- AGENT:FILL -->` slots, token-budget bloat, `AGENTS.md` routing drift, broken internal links, and orphaned files.
- **Native MCP Server (`md-structure mcp`) + Drop-In `SKILL.md`:** Zero runtime dependencies, sub-50ms startup, works offline with Claude Code, Antigravity, Cursor, Codex, Windsurf, and Cline.

---

## Requirements

- **Node.js `>= 20.0.0`**
- **Zero external runtime dependencies** (runs immediately with no `npm install` required).

Optional global CLI link:

```bash
npm link
```

Or run directly:

```bash
node bin/md-structure.js --help
```

---

## Quick Start (Agent-First CLI)

Every command supports `--json` for strict machine-readable `stdout` output.

### 1. Check Ambiguities (Adaptive Discovery)

```bash
md-structure discover "Build an invoicing platform for agencies" --json
```

Returns only the 2–5 high-leverage questions that actually change which `.md` contracts are needed, mapped to `impactedDocs`.

### 2. Analyze an Idea (Answers: How Many? Which? Why?)

```bash
md-structure analyze "Multi-tenant B2B SaaS invoicing platform with RBAC, Stripe billing, webhooks, PostgreSQL, and an AI expense categorization agent" --json
```

Or analyze from a structured Intake Profile JSON:

```bash
md-structure analyze --profile examples/saas-platform-idea.json --show-excluded
```

### 3. Scaffold the Complete Markdown Architecture

```bash
md-structure init --profile examples/saas-platform-idea.json --out ./workspace-demo --shims claude,cursor --json
```

Generates:
- `AGENTS.md` — Ultra-lean always-on agent control plane, routing table, and capability-tailored invariants
- `docs/00-CONTEXT-MAP.md` — Active MD matrix, Mermaid dependency DAG, token ledger, and excluded MDs table
- All selected `docs/*.md` files with strict YAML frontmatter and structured `<!-- AGENT:FILL ... -->` slots
- Optional thin shims (`CLAUDE.md`, `.cursor/rules/md-structure.mdc`, `.github/copilot-instructions.md`, `.windsurfrules`) pointing to `AGENTS.md`
- `md-structure.manifest.json` — Machine-readable blueprint lockfile

### 4. Author in Strict Dependency DAG Order

```bash
md-structure next --dir ./workspace-demo --json
```

Tells the agent the exact next `.md` file to finalize, which upstream `.md` files to read first, its token budget, and its remaining `AGENT:FILL` directives.

### 5. Run the Pre-Code Governance Audit Gate

```bash
md-structure audit --dir ./workspace-demo --strict --json
```

Returns exit code `0` only when `readyForImplementation === true` (or exit code `2` when errors/unfinished drafts exist in `--strict` mode).

### 6. Route Context During Coding (Progressive Disclosure)

```bash
md-structure route "Add Stripe webhook verification and update tenant subscription table" --dir ./workspace-demo --json
```

Returns only the minimal `mustRead` `.md` files for that exact task and reports exact context token savings vs. loading the entire `docs/` directory.

### 7. Scan an Existing Repository (Brownfield Mode)

```bash
md-structure scan --dir ./existing-repo --json
```

Automatically inspects `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, Dockerfiles, schema directories, and existing `.md` files to recommend the exact missing architectural MDs.

### 8. Evolve & Synchronize as Scope Grows

```bash
md-structure add-doc ai-agent-spec --dir ./workspace-demo --json
md-structure sync --dir ./workspace-demo --json
```

Safely registers new catalog docs in topological DAG order, patches `AGENTS.md`'s Document Routing Map non-destructively, and refreshes `docs/00-CONTEXT-MAP.md`.

### 9. Inspect Any Catalog Archetype & Interactive Wizard

```bash
md-structure catalog
md-structure explain ai-agent-spec
md-structure wizard
```

---

## Native MCP Server Integration

Start the built-in JSON-RPC 2.0 stdio MCP server:

```bash
md-structure mcp
```

Register it in Claude Code, Antigravity, Cursor, Windsurf, or any MCP-compatible host (see [`agent-kit/mcp-config.example.json`](./agent-kit/mcp-config.example.json)):

```json
{
  "mcpServers": {
    "md-structure": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/MD-Structure/bin/md-structure.js", "mcp"]
    }
  }
}
```

### Exposed MCP Capabilities

| Type | Name / URI | Purpose |
| :--- | :--- | :--- |
| **Tool** | `md_discovery_questions` | Minimal high-leverage clarifying questions mapped to impacted MDs |
| **Tool** | `md_analyze_idea` | Deterministic blueprint: count, DAG-ordered MDs, rationales, exclusions, token budgets |
| **Tool** | `md_scaffold_project` | Materialize `AGENTS.md`, `docs/`, thin shims, and `md-structure.manifest.json` |
| **Tool** | `md_next_doc` | Next single MD to author in DAG order + upstream dependencies to read first |
| **Tool** | `md_audit_workspace` | Completeness, frontmatter, bloat, link, and routing audit (`0–100` readiness score) |
| **Tool** | `md_explain_doc` | Deep explanation of any catalog MD archetype and failure mode prevented |
| **Tool** | `md_list_catalog` | Browse all 27 canonical archetypes, tiers, layers, and capability triggers |
| **Tool** | `md_scan_repo` | Scan an existing codebase to infer stack/capabilities and missing architectural MDs |
| **Tool** | `md_route_context` | Progressive-disclosure router returning minimal MDs for a coding task + token savings |
| **Tool** | `md_add_doc` | Add a catalog MD to an existing workspace, patching manifest, `AGENTS.md`, and context map |
| **Tool** | `md_sync_workspace` | Non-destructively sync `AGENTS.md` routing table & `00-CONTEXT-MAP.md` with manifest |
| **Resource** | `md-structure://catalog` | Full machine-readable JSON catalog |
| **Resource** | `md-structure://methodology` | Context Engineering & Progressive Disclosure specification |
| **Resource** | `md-structure://protocol` | 5-Phase Agent Execution Protocol |
| **Prompt** | `architect-from-idea` | End-to-end guided prompt from idea to audited architecture |
| **Prompt** | `audit-and-repair-docs` | Guided workspace audit & self-healing workflow |

---

## Agent Integration Kit

Drop-in files inside [`agent-kit/`](./agent-kit/):

- [`agent-kit/SKILL.md`](./agent-kit/SKILL.md) — Ready-to-install Agent Skill for Antigravity, Claude Code, Codex, and Cursor
- [`agent-kit/SYSTEM-PROMPT.md`](./agent-kit/SYSTEM-PROMPT.md) — Compact system-prompt module for custom agents
- [`agent-kit/AGENT-WORKFLOW.md`](./agent-kit/AGENT-WORKFLOW.md) — Canonical 5-phase agent execution protocol
- [`agent-kit/mcp-config.example.json`](./agent-kit/mcp-config.example.json) — MCP server registration snippet

---

## Programmatic JavaScript / TypeScript API

```js
import {
  analyzeProject,
  generateDiscoveryQuestions,
  planArchitecture,
  scaffoldWorkspace,
  getNextDocumentToAuthor,
  auditWorkspace,
} from "md-structure";

const blueprint = planArchitecture({
  name: "PulseAPI",
  idea: "Multi-tenant REST API with RBAC, PostgreSQL, and Stripe webhooks",
  lifecycle: "production",
});

console.log(blueprint.summary.totalDocuments);
console.log(blueprint.whyThisStructure.headline);
```

Full TypeScript definitions are shipped in [`types/index.d.ts`](./types/index.d.ts), and JSON Schemas live in [`schemas/`](./schemas/).

---

## Testing

```bash
npm test
```

Runs the complete zero-dependency `node:test` suite covering:
- Idea signal extraction, archetype detection, complexity tier scoring, and ambiguity detection
- Deterministic MD selection, topological DAG ordering, exclusion rationales, and token-budget ledgers
- End-to-end workspace scaffolding, `AGENT:FILL` authoring progression (`next`), audit failure/self-heal transitions, bloat & broken-link detection
- CLI subcommands, `--json` output validity, `--dry-run`, and deterministic exit codes
- Live JSON-RPC 2.0 MCP server handshake, tool calls, resources, and prompts over stdio

---

## Author & License

Designed & architected by **Ayazelrico** · Released under the [MIT License](./LICENSE).
