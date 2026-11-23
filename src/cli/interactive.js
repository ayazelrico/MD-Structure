/**
 * Interactive Terminal Wizard (`md-structure wizard`) for human-guided scaffolding.
 * Agents should prefer `analyze`, `discover`, `init`, `next`, `audit` with `--json` or MCP tools.
 */

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ARCHETYPES, SUPPORTED_SHIMS, TIERS } from "../core/constants.js";
import { planArchitecture } from "../core/planner.js";
import { scaffoldWorkspace } from "../core/scaffold.js";
import { formatBlueprint, formatScaffold } from "./formatters.js";

export async function runWizard() {
  const rl = readline.createInterface({ input, output });
  try {
    console.log("MD-STRUCTURE INTERACTIVE ARCHITECTURE WIZARD");
    console.log("=".repeat(64));

    const idea = (await rl.question("1. Describe your project idea in 1-3 sentences:\n> ")).trim();
    if (!idea) {
      console.error("Error: A project idea is required.");
      return 1;
    }

    const name = (await rl.question("\n2. Project name (leave blank to auto-infer):\n> ")).trim();

    const archetypeKeys = Object.keys(ARCHETYPES);
    console.log(`\n3. Optional archetype override (${archetypeKeys.join(", ")})`);
    const archetypeRaw = (await rl.question("   Leave blank to auto-detect:\n> ")).trim();
    const archetype = ARCHETYPES[archetypeRaw] ? archetypeRaw : undefined;

    console.log(`\n4. Complexity tier override (${Object.keys(TIERS).join(", ")})`);
    const tierRaw = (await rl.question("   Leave blank to auto-score:\n> ")).trim().toUpperCase();
    const tier = TIERS[tierRaw] ? tierRaw : undefined;

    const stackRaw = (await rl.question("\n5. Preferred tech stack (comma-separated, optional):\n> ")).trim();
    const stack = stackRaw ? stackRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const blueprint = planArchitecture({
      idea,
      name: name || undefined,
      archetype,
      tier,
      stack,
    });

    console.log("\n" + formatBlueprint(blueprint, { showExcluded: false }) + "\n");

    const confirm = (await rl.question("Scaffold this Markdown architecture now? (y/N): ")).trim().toLowerCase();
    if (confirm !== "y" && confirm !== "yes") {
      console.log("Aborted without writing files.");
      return 0;
    }

    const outDir = (await rl.question(`Target output directory [./${blueprint.project.slug}]: `)).trim() || `./${blueprint.project.slug}`;
    const shimsRaw = (await rl.question(`Generate thin IDE shims? (${SUPPORTED_SHIMS.join(",")} or blank): `)).trim();
    const shims = shimsRaw ? shimsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const result = scaffoldWorkspace(blueprint, { outDir, shims });
    console.log("\n" + formatScaffold(result));
    return 0;
  } finally {
    rl.close();
  }
}
