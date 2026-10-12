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

test("a failing description shows the shape of a passing one", () => {
  const logs = [];
  main(["node", "skill", "doctor", path.join(repo, "examples/messy")], {
    stdout: (line) => logs.push(line),
    stderr: () => {},
  });
  const text = logs.join("\n");
  assert.match(text, /Shape/);
  assert.match(text, /Use when the user asks to <trigger>/);
});

test("a passing tree does not print the shape", () => {
  const logs = [];
  main(["node", "skill", "doctor", path.join(repo, "examples/tight")], {
    stdout: (line) => logs.push(line),
    stderr: () => {},
  });
  assert.doesNotMatch(logs.join("\n"), /^Shape$/m);
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

test("a keyword trigger is a trigger, and 600 characters is inside the spec", () => {
  const dir = tmp();
  write(
    path.join(dir, ".grok/skills/cluster/SKILL.md"),
    `---
name: cluster
description: "Plan a cluster. WHEN: create a cluster, secure a cluster."
---

# Cluster
`,
  );
  const keyword = assess(dir);
  assert.equal(keyword.level, "L3");

  const prose = `${"Routing detail. ".repeat(40)}Use when the user asks to route.`;
  write(
    path.join(dir, ".grok/skills/router/SKILL.md"),
    `---
name: router
description: "${prose}"
---

# Router
`,
  );
  const underSpec = assess(dir);
  assert.ok(prose.length > 500 && prose.length < 1024);
  assert.ok(!underSpec.findings.some((item) => item.code === "essay-description"));
  assert.ok(!underSpec.findings.some((item) => item.relPath.endsWith("router/SKILL.md") && item.code === "long-description"));

  write(path.join(dir, ".grok/skills/skill-budget.yaml"), "description_chars: 280\ndescription_chars_max: 1024\n");
  const aimed = assess(dir);
  const router = aimed.skills.find((skill) => skill.name === "router");
  assert.equal(aimed.level, "L2");
  assert.ok(router.findings.some((item) => item.code === "long-description"));
  assert.ok(router.suggestion);
  assert.ok(router.suggestion.length <= 280);
});

test("a body that points at references is a warning past 500 lines", () => {
  const dir = tmp();
  const body = `# Steps\n\nRead [the rest](references/rest.md) first.\n\n${"Do the next reference step.\n".repeat(520)}`;
  write(
    path.join(dir, ".grok/skills/manual/SKILL.md"),
    `---
name: manual
description: Follow the release manual. Use when the user asks to run a release.
---

${body}`,
  );
  write(path.join(dir, ".grok/skills/manual/references/rest.md"), "# Rest\n");
  const pointed = assess(dir);
  const fat = pointed.findings.find((item) => item.code === "fat-body");
  assert.equal(fat.severity, "warning");
  assert.equal(pointed.level, "L2");
});

test("a markdown link to a missing file is a warning", () => {
  const dir = tmp();
  write(
    path.join(dir, ".grok/skills/handbook/SKILL.md"),
    `---
name: handbook
description: Run the release handbook. Use when the user asks to follow the handbook.
---

Read [the checklist](references/checklist.md).
`,
  );
  const report = assess(dir);
  assert.equal(report.level, "L2");
  assert.ok(report.findings.some((item) => item.code === "missing-file"));
});

test("a skill directory grades without a project root", () => {
  const dir = tmp();
  write(
    path.join(dir, "notes/SKILL.md"),
    `---
name: notes
description: Take meeting notes from a transcript. Use when the user asks for notes after a call.
---

# Notes
`,
  );
  const report = assess(dir);
  assert.equal(report.level, "L3");
  assert.equal(report.skillCount, 1);

  const hidden = tmp();
  write(
    path.join(hidden, "nested/deep/SKILL.md"),
    `---
name: deep
description: Take meeting notes from a transcript. Use when the user asks for notes after a call.
---

# Deep
`,
  );
  assert.equal(assess(hidden).level, "L0");
});

test("root and baseline report the catalog delta", () => {
  const dir = tmp();
  write(
    path.join(dir, "notes/SKILL.md"),
    `---
name: notes
description: Take meeting notes from a transcript. Use when the user asks for notes after a call.
---

# Notes
`,
  );
  const baseline = path.join(dir, "baseline.json");
  write(baseline, JSON.stringify({ catalogTokens: 10, skills: [{ name: "old-notes" }] }));
  const empty = tmp();
  const logs = [];
  const code = main(
    ["node", "skill", "doctor", empty, "--root", dir, "--baseline", baseline, "--min", "L3"],
    { stdout: (line) => logs.push(line), stderr: () => {} },
  );
  const text = logs.join("\n");
  assert.equal(code, 0);
  assert.match(text, /catalog  10 → \d+   \+\d+ tokens/);
  assert.match(text, /added  notes/);
  assert.match(text, /removed  old-notes/);
});

test("overlap names the shared words", () => {
  const dir = tmp();
  write(
    path.join(dir, ".grok/skills/manual/SKILL.md"),
    `---
name: manual
description: Follow the release manual for production deploys. Use when the user asks to run a release.
---

# Manual
`,
  );
  write(
    path.join(dir, ".grok/skills/release-run/SKILL.md"),
    `---
name: release-run
description: Follow the release manual for production deploys. Use when the user asks to run a release checklist.
---

# Release
`,
  );
  const report = assess(dir);
  const overlap = report.findings.find((item) => item.code === "description-overlap");
  assert.match(overlap.message, /release/);
});

test("the catalog example warns instead of blocking a WHEN trigger", () => {
  const report = assess(path.join(repo, "examples/catalog"));
  assert.equal(report.level, "L2");
  assert.equal(report.score, 100);
  const codes = report.findings.map((item) => item.code);
  assert.ok(codes.includes("long-description"));
  assert.ok(codes.includes("missing-file"));
  assert.ok(!codes.includes("missing-trigger"));
  assert.ok(!codes.includes("essay-description"));
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
