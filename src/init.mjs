import fs from "node:fs";
import path from "node:path";
import { discover } from "./discover.mjs";

const BUDGET = `# Load budget read by skill doctor.
# Descriptions are paid on every turn. Bodies are paid only when a skill is selected.
catalog_token_budget: 4000
catalog_token_warn: 2000
description_chars: 280
description_chars_max: 1024
body_lines: 200
body_lines_max: 500
`;

const STARTER = `---
name: review-diff
description: Review a code diff for scope, tests, and regressions. Use when the user asks for a review of a pull request or a local diff.
---

# Review the diff

1. Read the diff and name the behavior change in one sentence.
2. Run the tests the change claims to cover.
3. Report what passed, what failed, and what you did not run.
`;

export function initTree(rootDir) {
  const root = path.resolve(rootDir);
  const created = [];
  const kept = [];
  const skillsDir = path.join(root, ".grok/skills");
  fs.mkdirSync(skillsDir, { recursive: true });

  const budgetPath = path.join(skillsDir, "skill-budget.yaml");
  if (fs.existsSync(budgetPath)) kept.push(".grok/skills/skill-budget.yaml");
  else {
    fs.writeFileSync(budgetPath, BUDGET);
    created.push(".grok/skills/skill-budget.yaml");
  }

  const existing = discover(root);
  if (existing.skills.length === 0) {
    const starterDir = path.join(skillsDir, "review-diff");
    fs.mkdirSync(starterDir, { recursive: true });
    const starterPath = path.join(starterDir, "SKILL.md");
    fs.writeFileSync(starterPath, STARTER);
    created.push(".grok/skills/review-diff/SKILL.md");
  }

  const lines = [];
  if (created.length) {
    lines.push("Created");
    for (const file of created) lines.push(`  ${file}`);
  }
  if (kept.length) {
    lines.push("Kept");
    for (const file of kept) lines.push(`  ${file}`);
  }
  if (!created.length && existing.skills.length) {
    lines.push("Skills already exist. Nothing written.");
  }
  lines.push("");
  lines.push("Next");
  lines.push("  skill doctor .");
  return { created, kept, text: lines.join("\n") };
}
