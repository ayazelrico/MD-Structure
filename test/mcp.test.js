import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, "..", "bin", "md-structure.js");

test("MCP stdio server handles initialize, tools/list, tools/call, resources/read, and prompts/get", async () => {
  const child = spawn(process.execPath, [BIN, "mcp"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const responses = [];
  let buffer = "";

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.trim()) responses.push(JSON.parse(line));
    }
  });

  const requests = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "md_analyze_idea",
        arguments: {
          idea: "AI coding agent orchestration backend with MCP tools and PostgreSQL persistence",
          lifecycle: "production",
        },
      },
    },
    { jsonrpc: "2.0", id: 4, method: "resources/read", params: { uri: "md-structure://protocol" } },
    {
      jsonrpc: "2.0",
      id: 5,
      method: "prompts/get",
      params: { name: "architect-from-idea", arguments: { idea: "Realtime collaborative notes app" } },
    },
  ];

  for (const req of requests) {
    child.stdin.write(JSON.stringify(req) + "\n");
  }
  child.stdin.end();

  await new Promise((resolve, reject) => {
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`MCP process exited with code ${code}`));
    });
    child.on("error", reject);
  });

  assert.equal(responses.length, 5, "Notification should produce no reply; 5 requests -> 5 responses");

  const byId = new Map(responses.map((r) => [r.id, r]));

  // 1. initialize
  assert.equal(byId.get(1).result.serverInfo.name, "md-structure");
  assert.ok(byId.get(1).result.capabilities.tools);

  // 2. tools/list
  const toolNames = byId.get(2).result.tools.map((t) => t.name);
  assert.ok(toolNames.includes("md_analyze_idea"));
  assert.ok(toolNames.includes("md_discovery_questions"));
  assert.ok(toolNames.includes("md_scaffold_project"));
  assert.ok(toolNames.includes("md_next_doc"));
  assert.ok(toolNames.includes("md_audit_workspace"));
  assert.ok(toolNames.includes("md_explain_doc"));
  assert.ok(toolNames.includes("md_list_catalog"));

  // 3. tools/call md_analyze_idea
  const analyzeResult = byId.get(3).result.structuredContent;
  assert.equal(analyzeResult.project.archetype.id, "ai-agent-system");
  assert.ok(analyzeResult.documents.some((d) => d.id === "ai-agent-spec"));
  assert.ok(analyzeResult.documents.some((d) => d.id === "data-model"));

  // 4. resources/read
  assert.ok(byId.get(4).result.contents[0].text.includes("5-Phase Agent Architecture Protocol"));

  // 5. prompts/get
  assert.ok(byId.get(5).result.messages[0].content.text.includes("Realtime collaborative notes app"));
});
