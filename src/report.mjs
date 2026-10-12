const SHAPE_CODES = new Set([
  "missing-description",
  "missing-trigger",
  "essay-description",
  "long-description",
  "thin-description",
]);

function shapeLines(report) {
  if (!report.findings.some((item) => SHAPE_CODES.has(item.code))) return [];
  return [
    "",
    "Shape",
    "  <what it does, one sentence>. Use when the user asks to <trigger>.",
    "  WHEN: keyword, keyword is a trigger too.",
    "  Aim under 280 characters when the budget asks. The spec limit is 1024.",
    "  Put the procedure in the body.",
  ];
}

function section(title, items) {
  if (!items.length) return [];
  const lines = ["", title];
  for (const item of items) {
    lines.push(`  ${item.code}`);
    lines.push(`    ${item.message}`);
  }
  return lines;
}

function skillPhrase(count) {
  return count === 1 ? "1 skill" : `${count} skills`;
}

function deltaLine(report) {
  if (report.catalogDelta == null) return [];
  const sign = report.catalogDelta > 0 ? "+" : "";
  const lines = [
    `catalog  ${report.baselineTokens} → ${report.catalogTokens}   ${sign}${report.catalogDelta} tokens`,
  ];
  if (report.addedSkills?.length) lines.push(`added  ${report.addedSkills.join("  ")}`);
  if (report.removedSkills?.length) lines.push(`removed  ${report.removedSkills.join("  ")}`);
  return lines;
}

export function renderReport(report) {
  const lines = [
    `Skill Ready  ${report.level}  catalog ${report.catalogTokens}/${report.catalogBudget}`,
    `score ${report.score}  ·  ${skillPhrase(report.skillCount)}`,
    ...deltaLine(report),
  ];
  if (report.budgetFile) lines.push(`budget  ${report.budgetFile}`);
  if (report.roots?.length) lines.push(`roots  ${report.roots.join("  ")}`);
  lines.push("");

  if (report.skillCount === 0) {
    lines.push(
      "No SKILL.md under .grok/skills, .claude/skills, .cursor/skills, .agents/skills, .codex/skills, or skills/.",
    );
    lines.push("A skills directory can be graded with --root, or by passing that directory as the path.");
    lines.push("");
    lines.push("Next");
    lines.push("  skill init .");
    return lines.join("\n");
  }

  const ranked = [...report.skills].sort(
    (a, b) => b.descriptionTokens - a.descriptionTokens || a.relPath.localeCompare(b.relPath),
  );
  const nameW = Math.max(4, ...ranked.map((skill) => skill.relPath.length));
  lines.push(`${"TOKENS".padStart(6)}  ${"TOTAL".padStart(6)}  LEVEL  ${"PATH".padEnd(nameW)}  FINDINGS`);
  let running = 0;
  for (const skill of ranked) {
    running += skill.descriptionTokens;
    const notes = skill.findings.map((item) => item.code).join(", ") || "ok";
    lines.push(
      `${String(skill.descriptionTokens).padStart(6)}  ${String(running).padStart(6)}  ${skill.level.padEnd(5)}  ${skill.relPath.padEnd(nameW)}  ${notes}`,
    );
  }

  const blocking = report.findings.filter((item) => item.severity === "blocking");
  const warnings = report.findings.filter((item) => item.severity === "warning");
  lines.push(...section("Blocking", blocking));
  lines.push(...section("Warnings", warnings));

  const cuts = ranked.filter((skill) => skill.suggestion);
  if (cuts.length) {
    lines.push("", "Cuts");
    for (const skill of cuts) {
      lines.push(`  ${skill.relPath}`);
      lines.push(`    ${skill.suggestion}`);
    }
  }

  lines.push(...shapeLines(report));
  lines.push("");
  lines.push("Next");
  if (report.level === "L1") {
    lines.push("  Fix each blocking finding, then run skill doctor again.");
    if (cuts.length) lines.push("  The Cuts section is a shorter description you can paste.");
  } else if (report.level === "L2") {
    lines.push("  Warnings are the remaining load. Clear them to reach L3.");
    if (cuts.length) lines.push("  Paste a cut to shrink the catalog.");
  } else {
    lines.push("  Catalog is inside the budget. Add a skill only when its description names a distinct trigger.");
  }
  return lines.join("\n");
}
