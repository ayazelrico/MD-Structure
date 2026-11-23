---
id: agents-entry
title: Agent Operating Manual
status: approved
layer: bootstrap
priority: critical
load_policy: always
token_budget:
  target: 700
  max: 1200
authority: Session bootstrap rules, module boundaries, invariants, and verification commands for MD-Structure itself.
depends_on: []
read_triggers:
  - Automatically at the start of every agent session before reading or modifying code
update_triggers:
  - When module ownership, CLI commands, MCP tools, or verification commands change
---

# AGENTS.md — MD-Structure

> **Agent Control Plane** | Creator: **Ayazelrico** | Archetype: `cli-tool` + `mcp-server` | Runtime: Node.js `>=20` ESM (Zero Runtime Dependencies)

## 1. Project Identity & Mission

`MD-Structure` is a local, agent-native architecture decision engine, Markdown scaffolder, MCP server, and context-governance auditor. It deterministically answers **how many `.md` files** a project needs, **which `.md` files** to author (in dependency DAG order), **why each exists** (and why others are skipped), and enforces token-budget and anti-drift gates.

## 2. Module Ownership Map

| Path | Single Responsibility | Allowed Imports |
| :--- | :--- | :--- |
| `src/core/constants.js` | Tiers (`T0`–`T3`), layers, load policies, archetypes, capabilities | None (pure data) |
| `src/core/catalog.js` | 27 canonical agent-native Markdown archetypes & rationales | None (pure data) |
| `src/core/tokens.js` | Deterministic token estimator & budget evaluator | None |
| `src/core/analyzer.js` | Idea/profile signal extraction, complexity scoring & ambiguity detection | `constants.js` |
| `src/core/discovery.js` | Adaptive clarifying question generator mapped to impacted MDs | `analyzer.js` |
| `src/core/planner.js` | Deterministic MD selection, topological DAG sort, exclusion ledger | `analyzer.js`, `catalog.js`, `constants.js` |
| `src/core/templates.js` | YAML frontmatter, `AGENTS.md`, `00-CONTEXT-MAP.md`, domain docs, IDE shims | None |
| `src/core/scaffold.js` | Safe workspace file materialization + `md-structure.manifest.json` | `node:fs`, `node:path`, `node:crypto`, `planner.js`, `templates.js`, `tokens.js` |
| `src/core/auditor.js` | Frontmatter parser, completeness/bloat/link/drift auditor, `next` DAG navigator | `node:fs`, `node:path`, `constants.js`, `tokens.js` |
| `src/core/scanner.js` | Existing repository scanner (manifests/codebase -> blueprint & doc gap) | `node:fs`, `node:path`, `planner.js`, `constants.js` |
| `src/core/router.js` | Progressive-disclosure task-to-context router & token-savings calculator | `node:fs`, `node:path`, `auditor.js`, `constants.js`, `tokens.js` |
| `src/core/evolve.js` | Non-destructive `add-doc` & `sync` workspace evolution engine | `node:fs`, `node:path`, `node:crypto`, `auditor.js`, `catalog.js`, `planner.js`, `templates.js`, `tokens.js` |
| `src/mcp/server.js` | Zero-dependency JSON-RPC 2.0 MCP stdio server (11 tools, 3 resources, 2 prompts) | `node:readline`, `src/index.js` |
| `src/cli/` | CLI argument parsing, formatters, interactive wizard, command router | `src/index.js`, `src/mcp/server.js` |
| `agent-kit/` | Drop-in `SKILL.md`, `SYSTEM-PROMPT.md`, `AGENT-WORKFLOW.md`, MCP config | Static docs |
| `schemas/` | Formal JSON Schemas (Draft 2020-12) for intake, manifest, and audit reports | Static JSON |

## 3. Non-Negotiable Invariants

1. **Zero External Runtime Dependencies:** Keep `package.json` free of runtime `dependencies` so agents can run `md-structure` offline with sub-50ms startup.
2. **Strict Stream Discipline:** In `--json` CLI mode and `mcp` stdio mode, `stdout` MUST emit strictly valid JSON only. Send diagnostics/errors exclusively to `stderr`.
3. **English by Default:** All CLI text, templates, catalog rationales, schemas, and MCP tool descriptions MUST be crisp, idiomatic technical English.
4. **DAG Acyclicity:** Document `dependsOn` edges in `src/core/catalog.js` MUST remain a strict Directed Acyclic Graph.
5. **Deterministic Exit Codes:** CLI exits `0` on success, `1` on usage/runtime errors, and `2` on audit gate failure (`--strict` or audit errors).

## 4. Verification Gate

Run before declaring any task complete:

```bash
# Run full unit, integration, CLI, and MCP protocol test suite
npm test

# Smoke test CLI analysis & MCP server
node bin/md-structure.js catalog
node bin/md-structure.js analyze --profile examples/saas-platform-idea.json --json
```
