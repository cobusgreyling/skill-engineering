function section(title, items) {
  if (!items.length) return [];
  const lines = ["", title];
  for (const item of items) {
    lines.push(`  ${item.code}`);
    lines.push(`    ${item.message}`);
  }
  return lines;
}

export function renderReport(report) {
  const lines = [
    `Skill Ready  ${report.level}  ${report.score}/100`,
    `${report.skillCount === 1 ? "1 skill" : `${report.skillCount} skills`}  ·  catalog ~${report.catalogTokens} tokens of ${report.catalogBudget}`,
  ];
  if (report.budgetFile) lines.push(`budget  ${report.budgetFile}`);
  if (report.roots?.length) lines.push(`roots  ${report.roots.join("  ")}`);
  lines.push("");

  if (report.skillCount === 0) {
    lines.push(
      "No SKILL.md under .grok/skills, .claude/skills, .cursor/skills, .agents/skills, .codex/skills, or skills/.",
    );
    lines.push("");
    lines.push("Next");
    lines.push("  skill init .");
    return lines.join("\n");
  }

  const nameW = Math.max(4, ...report.skills.map((skill) => skill.relPath.length));
  lines.push(`${"PATH".padEnd(nameW)}  LEVEL  TOKENS  FINDINGS`);
  for (const skill of report.skills) {
    const notes = skill.findings.map((item) => item.code).join(", ") || "ok";
    lines.push(
      `${skill.relPath.padEnd(nameW)}  ${skill.level.padEnd(5)}  ${String(skill.descriptionTokens).padStart(6)}  ${notes}`,
    );
  }

  const blocking = report.findings.filter((item) => item.severity === "blocking");
  const warnings = report.findings.filter((item) => item.severity === "warning");
  lines.push(...section("Blocking", blocking));
  lines.push(...section("Warnings", warnings));
  lines.push("");
  lines.push("Next");
  if (report.level === "L1") {
    lines.push("  Fix each blocking finding, then run skill doctor again.");
  } else if (report.level === "L2") {
    lines.push("  Warnings are the remaining load. Clear them to reach L3.");
  } else {
    lines.push("  Catalog is inside the budget. Add a skill only when its description names a distinct trigger.");
  }
  return lines.join("\n");
}
