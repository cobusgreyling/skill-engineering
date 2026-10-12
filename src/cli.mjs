import fs from "node:fs";
import path from "node:path";
import { initTree } from "./init.mjs";
import { renderReport } from "./report.mjs";
import { assess } from "./score.mjs";

const HELP = `skill — grade the skills an agent loads before the task starts

Usage
  skill doctor [path] [--json] [--user] [--min L2]
  skill init [path]

doctor  Score SKILL.md files under path. Default path is the current directory.
        Project roots: .grok/skills .claude/skills .cursor/skills .agents/skills .codex/skills skills
init    Write .grok/skills/skill-budget.yaml. If the tree has no skills, also write one starter.

--user  Also scan skill folders in the home directory.
--json  Print the report as JSON.
--min   Minimum level that exits 0. Default L2. L0 and L1 fail a CI gate.

The description is the load. The body is paid only when the skill is selected.
`;

const RANK = { L0: 0, L1: 1, L2: 2, L3: 3 };

function takePath(args) {
  const pathArg = args.find((arg) => !arg.startsWith("--"));
  return path.resolve(pathArg || ".");
}

export function main(argv, io = {}) {
  const stdout = io.stdout || ((line) => console.log(line));
  const stderr = io.stderr || ((line) => console.error(line));
  const args = argv.slice(2);
  const command = args[0] && !args[0].startsWith("--") ? args[0] : "doctor";
  const rest = command === args[0] ? args.slice(1) : args;

  if (command === "help" || command === "--help" || command === "-h") {
    stdout(HELP.trimEnd());
    return 0;
  }
  if (command !== "doctor" && command !== "init") {
    stderr(`Unknown command: ${command}`);
    stderr(HELP.trimEnd());
    return 2;
  }

  const dir = takePath(rest);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    stderr(`Not a directory: ${dir}`);
    return 2;
  }

  if (command === "init") {
    stdout(initTree(dir).text);
    return 0;
  }

  const report = assess(dir, { user: rest.includes("--user") });
  if (rest.includes("--json")) stdout(JSON.stringify(report, null, 2));
  else stdout(renderReport(report));

  const minFlag = rest.indexOf("--min");
  const min = minFlag === -1 ? "L2" : String(rest[minFlag + 1] || "L2").toUpperCase();
  if (!(min in RANK)) {
    stderr(`Unknown level: ${min}`);
    return 2;
  }
  return RANK[report.level] >= RANK[min] ? 0 : 1;
}
