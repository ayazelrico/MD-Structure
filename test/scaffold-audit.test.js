import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  MANIFEST_FILENAME,
  auditWorkspace,
  getNextDocumentToAuthor,
  parseFrontmatter,
  scaffoldWorkspace,
} from "../src/index.js";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "md-structure-test-"));
}

test("scaffoldWorkspace dryRun writes nothing while planning exact outputs", () => {
  const dir = makeTempDir();
  try {
    const res = scaffoldWorkspace("Simple local CLI tool", {
      outDir: dir,
      dryRun: true,
      shims: ["claude", "cursor"],
    });
    assert.equal(res.dryRun, true);
    assert.ok(res.written.length >= 4);
    assert.equal(fs.existsSync(path.join(dir, "AGENTS.md")), false);
    assert.equal(fs.existsSync(path.join(dir, MANIFEST_FILENAME)), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("full agent lifecycle: scaffold -> next DAG loop -> approve -> audit passes 100/100", () => {
  const dir = makeTempDir();
  try {
    const scaffolded = scaffoldWorkspace(
      {
        name: "TinyLint",
        idea: "A tiny simple local CLI tool for linting JSON schemas",
        archetype: "cli-tool",
        lifecycle: "prototype",
        stack: ["Node.js 22"],
      },
      {
        outDir: dir,
        shims: ["claude", "cursor"],
      }
    );

    assert.equal(fs.existsSync(path.join(dir, "AGENTS.md")), true);
    assert.equal(fs.existsSync(path.join(dir, "CLAUDE.md")), true);
    assert.equal(fs.existsSync(path.join(dir, ".cursor/rules/md-structure.mdc")), true);
    assert.equal(fs.existsSync(path.join(dir, MANIFEST_FILENAME)), true);

    // Initial audit should show unfinished drafts / open AGENT:FILL directives
    const initialAudit = auditWorkspace(dir);
    assert.equal(initialAudit.hasManifest, true);
    assert.equal(initialAudit.readyForImplementation, false);
    assert.ok(initialAudit.summary.totalOpenDirectives > 0);

    // Simulate an AI agent looping through `getNextDocumentToAuthor` until complete
    let guard = 0;
    while (guard++ < 20) {
      const nextStep = getNextDocumentToAuthor(dir);
      if (nextStep.completed) break;

      const filePath = path.join(dir, nextStep.next.path);
      let content = fs.readFileSync(filePath, "utf8");

      // Parse frontmatter to ensure validity
      const fm = parseFrontmatter(content);
      assert.equal(fm.hasFrontmatter, true);
      assert.equal(fm.data.id, nextStep.next.id);

      // Replace all AGENT:FILL directives with substantive technical text and approve
      content = content.replace(/<!--\s*AGENT:FILL[\s\S]*?-->/gi, "Verified production specification entry.");
      content = content.replace(/^status:\s*draft$/m, "status: approved");
      fs.writeFileSync(filePath, content, "utf8");
    }

    const finalNext = getNextDocumentToAuthor(dir);
    assert.equal(finalNext.completed, true);
    assert.equal(finalNext.progress.percent, 100);

    const finalAudit = auditWorkspace(dir);
    assert.equal(finalAudit.readyForImplementation, true);
    assert.equal(finalAudit.readinessScore, 100);
    assert.equal(finalAudit.summary.errorCount, 0);
    assert.equal(finalAudit.summary.warningCount, 0);
    assert.ok(scaffolded.written.length > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("auditWorkspace detects broken links, orphaned docs, and always-on token bloat", () => {
  const dir = makeTempDir();
  try {
    scaffoldWorkspace("A tiny simple local CLI tool", { outDir: dir });

    // 1. Add an orphaned doc
    fs.writeFileSync(path.join(dir, "docs", "UNTRACKED.md"), "# Random Doc\n", "utf8");

    // 2. Break a link and bloat AGENTS.md beyond its token ceiling
    const agentsPath = path.join(dir, "AGENTS.md");
    const bloatText = "\nSee [broken](./docs/DOES-NOT-EXIST.md).\n" + "bloatword ".repeat(1400);
    fs.appendFileSync(agentsPath, bloatText, "utf8");

    const report = auditWorkspace(dir);
    const codes = new Set(report.issues.map((i) => i.code));

    assert.ok(codes.has("ORPHANED_DOCUMENT"));
    assert.ok(codes.has("BROKEN_LINK"));
    assert.ok(codes.has("ALWAYS_ON_BLOAT"));
    assert.ok(codes.has("TOKEN_BUDGET_EXCEEDED"));
    assert.equal(report.readyForImplementation, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
