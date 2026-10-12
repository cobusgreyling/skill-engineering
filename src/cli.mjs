import fs from "node:fs";
import path from "node:path";
import { initTree } from "./init.mjs";
import { renderReport } from "./report.mjs";
import { applyBaseline, assess } from "./score.mjs";

const HELP = `skill — grade the skills an agent loads before the task starts

Usage
  skill doctor [path] [--json] [--user] [--min L2] [--root dir] [--baseline report.json]
  skill init [path]

doctor  Score SKILL.md files under path. Default path is the current directory.
        Project roots: .grok/skills .claude/skills .cursor/skills .agents/skills .codex/skills skills
        A directory of skill folders is graded directly.
init    Write .grok/skills/skill-budget.yaml. If the tree has no skills, also write one starter.

--user      Also scan skill folders in the home directory, including bundled skills and marketplace plugins.
--root      Add a skills directory. Repeat for more than one.
--baseline  JSON from a previous doctor --json run. Prints the catalog token delta.
--json      Print the report as JSON.
--min       Minimum level that exits 0. Default L2. L0 and L1 fail a CI gate.

The score is the catalog. Descriptions are paid on every turn.
The level is selection: a trigger, a distinct name, a description inside the spec limit.
`;

const RANK = { L0: 0, L1: 1, L2: 2, L3: 3 };
const VALUE_FLAGS = new Set(["--min", "--root", "--baseline"]);

function parseArgs(args) {
  const positional = [];
  const roots = [];
  let min = null;
  let baseline = null;
  let json = false;
  let user = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") json = true;
    else if (arg === "--user") user = true;
    else if (VALUE_FLAGS.has(arg)) {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) return { error: `${arg} needs a value` };
      i += 1;
      if (arg === "--min") min = value;
      else if (arg === "--root") roots.push(value);
      else baseline = value;
    } else if (arg.startsWith("--")) return { error: `Unknown flag: ${arg}` };
    else positional.push(arg);
  }
  if (positional.length > 1) return { error: `Unexpected argument: ${positional[1]}` };
  return { positional, roots, min, baseline, json, user };
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

  const parsed = parseArgs(rest);
  if (parsed.error) {
    stderr(parsed.error);
    stderr(HELP.trimEnd());
    return 2;
  }

  const dir = path.resolve(parsed.positional[0] || ".");
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    stderr(`Not a directory: ${dir}`);
    return 2;
  }

  if (command === "init") {
    stdout(initTree(dir).text);
    return 0;
  }

  const report = assess(dir, { user: parsed.user, roots: parsed.roots.map((root) => path.resolve(root)) });
  if (parsed.baseline) {
    const file = path.resolve(parsed.baseline);
    if (!fs.existsSync(file)) {
      stderr(`No baseline: ${file}`);
      return 2;
    }
    try {
      applyBaseline(report, JSON.parse(fs.readFileSync(file, "utf8")));
    } catch (error) {
      stderr(error.code === "bad-baseline" ? error.message : `Baseline is not JSON: ${file}`);
      return 2;
    }
  }

  if (parsed.json) stdout(JSON.stringify(report, null, 2));
  else stdout(renderReport(report));

  const min = parsed.min == null ? "L2" : String(parsed.min).toUpperCase();
  if (!(min in RANK)) {
    stderr(`Unknown level: ${min}`);
    return 2;
  }
  return RANK[report.level] >= RANK[min] ? 0 : 1;
}
