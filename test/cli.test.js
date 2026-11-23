import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, "..", "bin", "md-structure.js");

function runBin(args) {
  try {
    const stdout = execFileSync(process.execPath, [BIN, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      status: err.status ?? 1,
      stdout: String(err.stdout || ""),
      stderr: String(err.stderr || ""),
    };
  }
}

test("CLI analyze --json outputs valid blueprint JSON with exit code 0", () => {
  const res = runBin([
    "analyze",
    "Multi-tenant SaaS API with PostgreSQL, RBAC, and Stripe billing",
    "--json",
  ]);
  assert.equal(res.status, 0);
  const parsed = JSON.parse(res.stdout);
  assert.ok(parsed.summary.totalDocuments >= 6);
  assert.ok(Array.isArray(parsed.documents));
  assert.ok(Array.isArray(parsed.excludedDocuments));
});

test("CLI catalog and explain --json return valid catalog entries", () => {
  const cat = runBin(["catalog", "--json"]);
  assert.equal(cat.status, 0);
  const catJson = JSON.parse(cat.stdout);
  assert.equal(catJson.total, 27);

  const exp = runBin(["explain", "ai-agent-spec", "--json"]);
  assert.equal(exp.status, 0);
  const expJson = JSON.parse(exp.stdout);
  assert.equal(expJson.id, "ai-agent-spec");
  assert.ok(expJson.failureModePrevented.length > 10);
});

test("CLI init -> next -> audit --strict returns exit code 2 until approved", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "md-structure-cli-"));
  try {
    const initRes = runBin([
      "init",
      "Simple local CLI tool for formatting SQL",
      "--out",
      dir,
      "--shims",
      "claude",
      "--json",
    ]);
    assert.equal(initRes.status, 0);
    const initJson = JSON.parse(initRes.stdout);
    assert.ok(initJson.written.some((w) => w.relativePath === "AGENTS.md"));
    assert.ok(initJson.written.some((w) => w.relativePath === "CLAUDE.md"));

    const nextRes = runBin(["next", "--dir", dir, "--json"]);
    assert.equal(nextRes.status, 0);
    const nextJson = JSON.parse(nextRes.stdout);
    assert.equal(nextJson.completed, false);
    assert.ok(nextJson.next.path);

    const auditStrict = runBin(["audit", "--dir", dir, "--strict", "--json"]);
    assert.equal(auditStrict.status, 2);
    const auditJson = JSON.parse(auditStrict.stdout);
    assert.equal(auditJson.readyForImplementation, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI returns exit code 1 with JSON error on stderr for unknown command", () => {
  const res = runBin(["nonexistent-command", "--json"]);
  assert.equal(res.status, 1);
  const errObj = JSON.parse(res.stderr);
  assert.ok(errObj.error.message.includes("Unknown command"));
});
