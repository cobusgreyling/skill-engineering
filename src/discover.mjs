import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const PROJECT_ROOTS = [
  ".grok/skills",
  ".claude/skills",
  ".cursor/skills",
  ".agents/skills",
  ".codex/skills",
  "skills",
];

const SKIP = new Set(["node_modules", ".git", "dist", "coverage"]);

function walk(dir, visit) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else if (entry.isFile() && entry.name === "SKILL.md") visit(full);
  }
}

export function discover(rootDir) {
  const root = path.resolve(rootDir);
  const found = [];
  const seen = new Set();
  const rootsHit = [];
  for (const rel of PROJECT_ROOTS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue;
    const before = found.length;
    walk(abs, (file) => {
      let key = file;
      try {
        key = fs.realpathSync(file);
      } catch {
        key = file;
      }
      if (seen.has(key)) return;
      seen.add(key);
      found.push({
        file,
        relPath: path.relative(root, file),
        rootRel: rel,
        dirName: path.basename(path.dirname(file)),
        dir: path.dirname(file),
      });
    });
    if (found.length > before) rootsHit.push(rel);
  }
  found.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return { root, skills: found, roots: rootsHit };
}

export function userSkillDirs() {
  const home = os.homedir();
  return [
    path.join(home, ".grok/skills"),
    path.join(home, ".claude/skills"),
    path.join(home, ".cursor/skills"),
    path.join(home, ".codex/skills"),
    path.join(home, ".agents/skills"),
  ].filter((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory());
}
