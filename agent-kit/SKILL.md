---
name: md-structure
description: Architect, scaffold, author, and audit a right-sized, progressive-disclosure Markdown documentation system for any software project before writing code. Use whenever a user describes a new project idea, asks how many .md files they need, which .md files to create, why each .md is necessary, or wants to structure AGENTS.md and docs/ for AI coding agents.
---

# MD-Structure — Agent-Native Project Architecture Skill

Use this skill whenever a user pitches a new project idea, starts a repository from scratch, or asks how to structure Markdown specifications (`AGENTS.md`, `PRD.md`, `ARCHITECTURE.md`, etc.) for AI coding agents.

## Core Principle

Never guess an arbitrary list of Markdown files, and never dump 20 bloated corporate docs into a repo. Use the deterministic `md-structure` tool (via MCP tools or CLI `--json`) to answer three questions rigorously before writing application code:

1. **How many MDs?** Right-sized to Complexity Tier (`T0` Micro: 2–4, `T1` MVP: 4–7, `T2` Production: 7–12, `T3` Enterprise: 11–16) with an ultra-lean always-on `AGENTS.md` (<= 1,600 tokens).
2. **Which MDs?** Selected from 27 canonical archetypes by detected project archetype, capabilities, and risk level — sorted in strict dependency DAG order.
3. **Why each MD (and why others were skipped)?** Every selected MD prevents a specific agent failure mode (hallucinated schemas, IDOR bugs, naming drift, runaway loops); excluded MDs are recorded explicitly in `docs/00-CONTEXT-MAP.md` so no agent creates redundant docs later.

---

## Mandatory 5-Phase Agent Workflow

### Phase 1: Discovery & Ambiguity Check
Run `md_discovery_questions` (MCP) or:
```bash
md-structure discover "<user idea>" --json
```
- If `needsClarification` is `true`, ask the user **only** the returned high-leverage questions (typically 2–4 questions) before locking the blueprint.
- If `needsClarification` is `false`, proceed directly to Phase 2.

### Phase 2: Deterministic Blueprint Analysis
Run `md_analyze_idea` (MCP) or:
```bash
md-structure analyze "<refined idea>" --json
```
Present a crisp architectural summary to the user covering:
- **Detected Archetype & Complexity Tier (`T0`–`T3`)**
- **Exact MD Count & Token Budget** (Always-On vs. Progressive Disclosure)
- **Selected MDs & WHY each is required** (failure mode prevented)
- **Key Excluded MDs & WHY they were intentionally skipped**

Wait for user confirmation if scope or tier is uncertain.

### Phase 3: Workspace Scaffolding
Run `md_scaffold_project` (MCP) or:
```bash
md-structure init "<refined idea>" --out <target-dir> --shims claude,cursor --json
```
This materializes `AGENTS.md`, `docs/00-CONTEXT-MAP.md`, all selected domain MDs (with YAML frontmatter, `token_budget`, `read_triggers`, and structured `<!-- AGENT:FILL -->` slots), thin IDE shims, and `md-structure.manifest.json`.

### Phase 4: Strict DAG Authoring Loop
Never author downstream specs (like `04-API-CONTRACT.md`) before upstream authorities (`01-PRD.md`, `02-ARCHITECTURE.md`, `03-DATA-MODEL.md`) are locked.

Loop until `completed === true`:
1. Call `md_next_doc` (MCP) or `md-structure next --dir <target-dir> --json`.
2. Read **only** the listed `upstreamToReadFirst` files.
3. Fill every `<!-- AGENT:FILL ... -->` directive in `next.path` using dense Markdown tables, schemas, and verifiable checklists — never verbose essays.
4. Respect `next.tokenBudget.max`.
5. Flip YAML frontmatter `status: draft` to `status: approved`.

### Phase 5: Pre-Code Governance Gate & Ongoing Execution
Before writing application code, run `md_audit_workspace` (MCP) or:
```bash
md-structure audit --dir <target-dir> --strict --json
```
- Do **not** begin coding until `readyForImplementation: true` (0 errors, 0 unresolved directives, all docs within token budgets, `AGENTS.md` routing synchronized, zero broken links).
- **Task-Scoped Context Loading (During Coding):** Before starting any implementation or bug-fix task, run `md_route_context` (`md-structure route "<task>" --dir <target-dir> --json`) and load **only** the returned `mustRead` documents to maximize context-window efficiency.
- **Brownfield / Existing Repositories:** Run `md_scan_repo` (`md-structure scan --dir <repo> --json`) to detect stack/capabilities and identify missing architectural docs before scaffolding.
- **Scope Evolution:** When new capabilities enter scope later (e.g., adding Stripe or an AI agent), run `md_add_doc` (`md-structure add-doc <doc-id> --dir <target-dir> --json`) and `md_sync_workspace` (`md-structure sync --dir <target-dir> --json`) to evolve the manifest, `AGENTS.md`, and `00-CONTEXT-MAP.md` without drift.
