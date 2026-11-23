/**
 * Zero-Dependency Existing Repository Scanner.
 *
 * Inspects an existing local repository (manifests, lockfiles, configs, directory structure,
 * and existing Markdown files) to automatically infer an Intake Profile, generate a tailored
 * MD-Structure blueprint, and compute the exact gap vs. existing documentation.
 */

import fs from "node:fs";
import path from "node:path";
import { planArchitecture } from "./planner.js";
import { MANIFEST_FILENAME } from "./constants.js";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  "dist",
  "build",
  "out",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".cache",
  "coverage",
]);

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function safeReadText(filePath, maxBytes = 65536) {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(maxBytes);
    const bytesRead = fs.readSync(fd, buf, 0, maxBytes, 0);
    fs.closeSync(fd);
    return buf.toString("utf8", 0, bytesRead);
  } catch {
    return "";
  }
}

/**
 * Shallow recursive directory walk (bounded by depth and entry cap for instant execution).
 * @param {string} rootDir
 * @param {number} maxDepth
 * @param {number} maxEntries
 */
function walkRepo(rootDir, maxDepth = 3, maxEntries = 600) {
  const files = [];
  const dirs = [];

  function visit(currentDir, depth) {
    if (depth > maxDepth || files.length + dirs.length >= maxEntries) return;
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length + dirs.length >= maxEntries) break;
      if (IGNORED_DIRS.has(entry.name)) continue;
      const abs = path.join(currentDir, entry.name);
      const rel = path.relative(rootDir, abs).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        dirs.push(rel);
        visit(abs, depth + 1);
      } else if (entry.isFile()) {
        files.push(rel);
      }
    }
  }

  visit(rootDir, 0);
  return { files, dirs };
}

/**
 * Scan an existing repository directory and synthesize a blueprint + documentation gap analysis.
 * @param {string} repoDir
 */
export function scanRepository(repoDir) {
  const absDir = path.resolve(repoDir);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    throw new Error(`Repository directory not found: ${absDir}`);
  }

  const { files, dirs } = walkRepo(absDir, 3, 700);
  const fileSet = new Set(files);
  const dirSet = new Set(dirs);
  const lowerFiles = files.map((f) => f.toLowerCase());

  const stack = new Set();
  const capabilities = new Set();
  const evidence = [];

  let inferredName = path.basename(absDir);
  let inferredArchetype = null;
  let description = "";

  // 1. Inspect package.json (Node / TS / JS)
  const pkgPath = path.join(absDir, "package.json");
  const pkg = fileSet.has("package.json") ? safeReadJson(pkgPath) : null;
  if (pkg) {
    if (pkg.name) inferredName = String(pkg.name).replace(/^@[^/]+\//, "");
    if (pkg.description) description = String(pkg.description);
    stack.add("Node.js");

    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
    };
    const depNames = Object.keys(allDeps);

    if (depNames.includes("typescript") || fileSet.has("tsconfig.json")) stack.add("TypeScript");
    if (depNames.some((d) => ["next", "nuxt", "@sveltejs/kit", "astro", "@remix-run/react"].includes(d))) {
      stack.add(depNames.find((d) => ["next", "nuxt", "@sveltejs/kit", "astro", "@remix-run/react"].includes(d)));
      inferredArchetype = inferredArchetype || "web-saas";
      capabilities.add("complex-ui");
      evidence.push("Detected full-stack web framework in package.json");
    }
    if (depNames.some((d) => ["react", "vue", "svelte", "solid-js", "tailwindcss"].includes(d))) {
      capabilities.add("complex-ui");
      stack.add("Frontend UI");
    }
    if (depNames.some((d) => ["express", "fastify", "hono", "koa", "@nestjs/core", "@trpc/server", "graphql"].includes(d))) {
      capabilities.add("public-api");
      inferredArchetype = inferredArchetype || "api-backend";
      evidence.push("Detected server/API framework in package.json");
    }
    if (depNames.some((d) => ["prisma", "@prisma/client", "drizzle-orm", "mongoose", "pg", "mysql2", "better-sqlite3", "sqlite3", "typeorm", "sequelize", "@supabase/supabase-js", "firebase-admin"].includes(d))) {
      capabilities.add("database-persistence");
      evidence.push("Detected database/ORM dependency in package.json");
    }
    if (depNames.some((d) => ["stripe", "@paddle/paddle-node-sdk", "@lemonsqueezy/lemonsqueezy.js"].includes(d))) {
      capabilities.add("payments-billing");
      capabilities.add("external-integrations");
      evidence.push("Detected payment provider SDK in package.json");
    }
    if (depNames.some((d) => ["openai", "@anthropic-ai/sdk", "@google/genai", "ai", "langchain", "@langchain/core", "@modelcontextprotocol/sdk"].includes(d))) {
      capabilities.add("ai-llm-agents");
      if (depNames.includes("@modelcontextprotocol/sdk")) {
        inferredArchetype = "ai-agent-system";
      }
      evidence.push("Detected AI/LLM/MCP SDK in package.json");
    }
    if (depNames.some((d) => ["@clerk/nextjs", "next-auth", "better-auth", "passport", "jsonwebtoken", "@auth0/nextjs-auth0", "lucia"].includes(d))) {
      capabilities.add("auth-rbac");
      evidence.push("Detected authentication library in package.json");
    }
    if (depNames.some((d) => ["socket.io", "ws", "pusher", "ably", "@liveblocks/client"].includes(d))) {
      capabilities.add("realtime-sync");
      evidence.push("Detected realtime/WebSocket dependency");
    }
    if (depNames.some((d) => ["bullmq", "bull", "inngest", "@trigger.dev/sdk", "@temporalio/client", "agenda", "node-cron"].includes(d))) {
      capabilities.add("background-jobs");
      capabilities.add("state-workflows");
      evidence.push("Detected background queue/workflow dependency");
    }
    if (depNames.some((d) => ["electron", "@tauri-apps/api"].includes(d))) {
      inferredArchetype = "desktop-app";
      capabilities.add("offline-local-first");
      evidence.push("Detected desktop shell dependency");
    }
    if (depNames.some((d) => ["react-native", "expo"].includes(d))) {
      inferredArchetype = "mobile-app";
      capabilities.add("offline-local-first");
      evidence.push("Detected mobile framework dependency");
    }
    if (pkg.bin && !inferredArchetype) {
      inferredArchetype = "cli-tool";
      capabilities.add("cli-interface");
      evidence.push("Detected package.json `bin` entrypoint");
    }
    if ((pkg.exports || pkg.main) && !pkg.bin && !inferredArchetype && !capabilities.has("complex-ui")) {
      inferredArchetype = "library-sdk";
      capabilities.add("sdk-surface");
      evidence.push("Detected library package exports");
    }
    if (pkg.workspaces) {
      capabilities.add("monorepo");
      inferredArchetype = "monorepo-platform";
      evidence.push("Detected package.json workspaces");
    }
  }

  // 2. Inspect Python / Rust / Go manifests
  if (fileSet.has("pyproject.toml") || fileSet.has("requirements.txt")) {
    stack.add("Python");
    const pyText = safeReadText(path.join(absDir, fileSet.has("pyproject.toml") ? "pyproject.toml" : "requirements.txt")).toLowerCase();
    if (/\b(fastapi|django|flask|litestar)\b/.test(pyText)) {
      capabilities.add("public-api");
      inferredArchetype = inferredArchetype || "api-backend";
    }
    if (/\b(sqlalchemy|alembic|psycopg|asyncpg|pymongo|sqlmodel)\b/.test(pyText)) {
      capabilities.add("database-persistence");
    }
    if (/\b(openai|anthropic|google-genai|langchain|langgraph|mcp|pydantic-ai)\b/.test(pyText)) {
      capabilities.add("ai-llm-agents");
      inferredArchetype = inferredArchetype || "ai-agent-system";
    }
    if (/\b(celery|dramatiq|rq|temporalio|prefect|airflow)\b/.test(pyText)) {
      capabilities.add("background-jobs");
    }
    if (/\b(typer|click|argparse)\b/.test(pyText) && !inferredArchetype) {
      inferredArchetype = "cli-tool";
      capabilities.add("cli-interface");
    }
  }

  if (fileSet.has("Cargo.toml")) {
    stack.add("Rust");
    const cargo = safeReadText(path.join(absDir, "Cargo.toml")).toLowerCase();
    if (/\b(axum|actix-web|rocket|warp)\b/.test(cargo)) {
      capabilities.add("public-api");
      inferredArchetype = inferredArchetype || "api-backend";
    }
    if (/\bclap\b/.test(cargo) && !inferredArchetype) {
      inferredArchetype = "cli-tool";
      capabilities.add("cli-interface");
    }
    if (/\b(sqlx|diesel|sea-orm)\b/.test(cargo)) capabilities.add("database-persistence");
  }

  if (fileSet.has("go.mod")) {
    stack.add("Go");
    const gomod = safeReadText(path.join(absDir, "go.mod")).toLowerCase();
    if (/\b(gin-gonic|echo|fiber|chi)\b/.test(gomod)) {
      capabilities.add("public-api");
      inferredArchetype = inferredArchetype || "api-backend";
    }
    if (/\bcobra\b/.test(gomod) && !inferredArchetype) {
      inferredArchetype = "cli-tool";
      capabilities.add("cli-interface");
    }
  }

  // 3. Structural & Infra signals
  if (fileSet.has("pnpm-workspace.yaml") || fileSet.has("turbo.json") || fileSet.has("nx.json") || (dirSet.has("apps") && dirSet.has("packages"))) {
    capabilities.add("monorepo");
    inferredArchetype = "monorepo-platform";
    evidence.push("Detected monorepo workspace configuration");
  }

  if (fileSet.has("Dockerfile") || fileSet.has("docker-compose.yml") || fileSet.has("docker-compose.yaml") || lowerFiles.some((f) => f.endsWith(".tf")) || dirSet.has("k8s") || dirSet.has("helm")) {
    capabilities.add("self-hosted-infra");
    evidence.push("Detected container/IaC deployment files");
  }

  if (lowerFiles.some((f) => f.includes("prisma/schema.prisma") || f.includes("drizzle.config") || f.includes("migrations/"))) {
    capabilities.add("database-persistence");
    evidence.push("Detected database schema/migration directory");
  }

  if (fileSet.has("manifest.json")) {
    const extManifest = safeReadJson(path.join(absDir, "manifest.json"));
    if (extManifest && (extManifest.manifest_version === 2 || extManifest.manifest_version === 3)) {
      inferredArchetype = "browser-extension";
      capabilities.add("plugin-extensibility");
      evidence.push("Detected browser extension manifest.json");
    }
  }

  // 4. Existing Markdown files & shims
  const existingMarkdownFiles = files.filter((f) => f.toLowerCase().endsWith(".md"));
  const hasAgentsMd = existingMarkdownFiles.includes("AGENTS.md");
  const hasClaudeMd = existingMarkdownFiles.includes("CLAUDE.md");
  const hasMdManifest = fileSet.has(MANIFEST_FILENAME);

  // Estimate lifecycle from repo footprint
  let lifecycle = "mvp";
  if (files.length <= 15 && capabilities.size <= 2) lifecycle = "prototype";
  else if (capabilities.size >= 5 || fileSet.has(".github/workflows/ci.yml") || capabilities.has("self-hosted-infra")) {
    lifecycle = "production";
  }

  const synthesizedProfile = {
    name: inferredName,
    idea:
      description ||
      `Existing ${inferredArchetype || "software"} repository '${inferredName}' with detected stack [${[...stack].join(", ") || "general"}] and capabilities [${[...capabilities].join(", ") || "core"}].`,
    archetype: inferredArchetype || "web-saas",
    capabilities: [...capabilities],
    stack: [...stack],
    lifecycle,
  };

  const recommendedBlueprint = planArchitecture(synthesizedProfile);

  // Compute gap against existing markdown files
  const existingLower = new Set(existingMarkdownFiles.map((f) => f.toLowerCase()));
  const missingRecommended = [];
  const alreadyPresent = [];

  for (const doc of recommendedBlueprint.documents) {
    const baseName = path.basename(doc.path).toLowerCase();
    const matchedFile = existingMarkdownFiles.find(
      (f) => f.toLowerCase() === doc.path.toLowerCase() || path.basename(f).toLowerCase() === baseName
    );
    if (matchedFile) {
      alreadyPresent.push({ docId: doc.id, recommendedPath: doc.path, existingPath: matchedFile });
    } else {
      missingRecommended.push({
        docId: doc.id,
        path: doc.path,
        priority: doc.priority,
        whyRequired: doc.whyRequired,
      });
    }
  }

  return {
    repoDir: absDir,
    hasMdStructureManifest: hasMdManifest,
    hasAgentsMd,
    hasClaudeMd,
    scannedFileCount: files.length,
    existingMarkdownFiles,
    detectionEvidence: evidence,
    inferredProfile: synthesizedProfile,
    recommendedBlueprint,
    gapAnalysis: {
      recommendedCount: recommendedBlueprint.summary.totalDocuments,
      alreadyPresentCount: alreadyPresent.length,
      missingCount: missingRecommended.length,
      alreadyPresent,
      missingRecommended,
      existingLowerCount: existingLower.size,
    },
    nextAction: hasMdManifest
      ? "Workspace already uses MD-Structure. Run `md-structure audit --dir . --json` to check health."
      : `Run \`md-structure init --out "${absDir}" --archetype ${synthesizedProfile.archetype}${synthesizedProfile.capabilities.length ? ` --caps ${synthesizedProfile.capabilities.join(",")}` : ""} --dry-run\` to preview adding the ${missingRecommended.length} missing architectural MDs safely.`,
  };
}
