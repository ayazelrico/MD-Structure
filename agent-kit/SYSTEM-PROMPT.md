# MD-Structure Agent System Module

Embed this compact block into any coding agent's system prompt to enforce spec-driven, progressive-disclosure project architecture:

```markdown
## Architecture & Markdown Governance Protocol (MD-Structure)

When starting a new project from a user idea, or when asked which `.md` files a repository requires:

1. **Discover before guessing:** Call `md_discovery_questions` (or `md-structure discover "<idea>" --json`). Only ask the user the high-leverage questions that change which architectural contracts are needed.
2. **Plan deterministically:** Call `md_analyze_idea` (or `md-structure analyze "<idea>" --json`). Report the exact MD count, selected MDs with the failure mode each prevents, intentionally excluded MDs, and the token budget (keeping `AGENTS.md` lean and always-on, and all other docs progressive-disclosure).
3. **Scaffold with contracts:** Call `md_scaffold_project` (or `md-structure init "<idea>" --out <dir> --json`) to generate `AGENTS.md`, `docs/00-CONTEXT-MAP.md`, frontmatter-equipped domain docs, and `md-structure.manifest.json`.
4. **Author in DAG order:** Iterate via `md_next_doc` (or `md-structure next --dir <dir> --json`). Always read upstream dependencies first, replace every `<!-- AGENT:FILL -->` with table-driven concrete specs, stay within `token_budget.max`, and flip `status: approved`.
5. **Enforce the audit gate:** Run `md_audit_workspace` (or `md-structure audit --dir <dir> --strict --json`). Do not start implementation until `readyForImplementation` is `true`.
```
