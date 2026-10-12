import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { main } from "../src/cli.mjs";
import { initTree } from "../src/init.mjs";
import { parseSkillMarkdown } from "../src/parse.mjs";
import { assess } from "../src/score.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skill-eng-"));
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

test("folded description keeps the trigger phrase", () => {
  const parsed = parseSkillMarkdown(`---
name: commit
description: >
  Write a conventional commit message.
  Use when the user asks to commit.
---

# Commit
`);
  assert.equal(parsed.error, null);
  assert.match(parsed.data.description, /Use when the user asks to commit/);
  assert.equal(parsed.data.name, "commit");
});

test("messy example is L1 and names the load problems", () => {
  const report = assess(path.join(repo, "examples/messy"));
  assert.equal(report.level, "L1");
  const codes = report.findings.map((item) => item.code);
  assert.ok(codes.includes("essay-description"));
  assert.ok(codes.includes("missing-trigger"));
  assert.ok(codes.includes("duplicate-name"));
});

test("tight example is L3", () => {
  const report = assess(path.join(repo, "examples/tight"));
  assert.equal(report.level, "L3");
  assert.equal(report.skillCount, 2);
  assert.equal(report.findings.length, 0);
});

test("this repo grades itself at L3", () => {
  const report = assess(repo);
  assert.equal(report.level, "L3");
  assert.equal(report.skillCount, 1);
  assert.equal(report.skills[0].name, "skill-doctor");
});

test("init on an empty tree writes a starter that scores L3", () => {
  const dir = tmp();
  const result = initTree(dir);
  assert.ok(result.created.includes(".grok/skills/review-diff/SKILL.md"));
  const report = assess(dir);
  assert.equal(report.level, "L3");
  const again = initTree(dir);
  assert.equal(again.created.length, 0);
});

test("fat body and a copied description are caught", () => {
  const dir = tmp();
  const body = `# Manual\n\n${"Step.\n".repeat(520)}`;
  write(
    path.join(dir, ".grok/skills/manual/SKILL.md"),
    `---
name: manual
description: Follow the release manual for production deploys. Use when the user asks to run a release.
---

${body}`,
  );
  write(
    path.join(dir, ".grok/skills/release-run/SKILL.md"),
    `---
name: release-run
description: Follow the release manual for production deploys. Use when the user asks to run a release checklist.
---

# Release

Run the checklist in references/checklist.md.
`,
  );
  const report = assess(dir);
  const codes = report.findings.map((item) => item.code);
  assert.ok(codes.includes("fat-body"));
  assert.ok(codes.includes("description-overlap"));
  assert.equal(report.level, "L1");
});

test("a split body over 200 lines is a warning, not a block", () => {
  const dir = tmp();
  const body = `# Steps\n\n${"Do the next reference step.\n".repeat(220)}`;
  write(
    path.join(dir, ".grok/skills/long-one/SKILL.md"),
    `---
name: long-one
description: Walk a long checklist. Use when the user asks to run the long checklist.
---

${body}`,
  );
  write(path.join(dir, ".grok/skills/long-one/references/rest.md"), "# Rest\n");
  const split = assess(dir);
  assert.equal(split.level, "L3");

  fs.rmSync(path.join(dir, ".grok/skills/long-one/references"), { recursive: true });
  const bare = assess(dir);
  assert.equal(bare.level, "L2");
  assert.ok(bare.findings.some((item) => item.code === "no-split"));
});

test("budget file lowers the catalog ceiling", () => {
  const dir = tmp();
  write(
    path.join(dir, ".grok/skills/skill-budget.yaml"),
    "catalog_token_budget: 20\ncatalog_token_warn: 10\n",
  );
  write(
    path.join(dir, ".grok/skills/notes/SKILL.md"),
    `---
name: notes
description: Take meeting notes from a transcript. Use when the user asks for notes after a call.
---

# Notes

Write decisions and owners.
`,
  );
  const report = assess(dir);
  assert.equal(report.budgetFile, ".grok/skills/skill-budget.yaml");
  assert.ok(report.findings.some((item) => item.code === "catalog-over-budget"));
  assert.equal(report.level, "L1");
});

test("missing frontmatter is blocking", () => {
  const dir = tmp();
  write(path.join(dir, "skills/bare/SKILL.md"), "# Bare\n\nDo the thing when asked.\n");
  const report = assess(dir);
  assert.equal(report.level, "L1");
  assert.ok(report.findings.some((item) => item.code === "missing-frontmatter"));
});

test("doctor exits 1 on L1 and 0 on L3", () => {
  const logs = [];
  const bad = main(
    ["node", "skill", "doctor", path.join(repo, "examples/messy")],
    { stdout: (line) => logs.push(line), stderr: () => {} },
  );
  assert.equal(bad, 1);
  assert.match(logs.join("\n"), /Skill Ready  L1/);

  const good = main(
    ["node", "skill", "doctor", path.join(repo, "examples/tight"), "--min", "L3"],
    { stdout: () => {}, stderr: () => {} },
  );
  assert.equal(good, 0);
});

test("json includes the level", () => {
  const logs = [];
  const code = main(
    ["node", "skill", "doctor", path.join(repo, "examples/tight"), "--json"],
    { stdout: (line) => logs.push(line), stderr: () => {} },
  );
  assert.equal(code, 0);
  const report = JSON.parse(logs.join("\n"));
  assert.equal(report.level, "L3");
  assert.equal(report.skillCount, 2);
});
