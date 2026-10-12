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

function skillEntry(root, file) {
  return {
    file,
    relPath: path.relative(root, file),
    rootRel: root,
    dirName: path.basename(path.dirname(file)),
    dir: path.dirname(file),
  };
}

export function scanSkillDir(rootDir) {
  const root = path.resolve(rootDir);
  const found = [];
  const seen = new Set();
  walk(root, (file) => {
    let key = file;
    try {
      key = fs.realpathSync(file);
    } catch {
      key = file;
    }
    if (seen.has(key)) return;
    seen.add(key);
    found.push(skillEntry(root, file));
  });
  found.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return found;
}

function shallowSkillDir(rootDir) {
  const root = path.resolve(rootDir);
  const files = [];
  const top = path.join(root, "SKILL.md");
  if (fs.existsSync(top)) files.push(top);
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
    const file = path.join(root, entry.name, "SKILL.md");
    if (fs.existsSync(file)) files.push(file);
  }
  return files.map((file) => skillEntry(root, file));
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
  if (found.length === 0) {
    const shallow = shallowSkillDir(root);
    if (shallow.length) {
      shallow.sort((a, b) => a.relPath.localeCompare(b.relPath));
      return { root, skills: shallow, roots: [path.basename(root)] };
    }
  }
  found.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return { root, skills: found, roots: rootsHit };
}

function isDir(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function pluginSkillDirs(home) {
  const bases = [
    path.join(home, ".grok/marketplace-cache"),
    path.join(home, ".claude/plugins"),
    path.join(home, ".codex/plugins"),
  ];
  const found = [];
  const seen = new Set();
  function walkDirs(dir, depth) {
    if (depth > 8) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === "skills") {
        let key = full;
        try {
          key = fs.realpathSync(full);
        } catch {
          key = full;
        }
        if (!seen.has(key)) {
          seen.add(key);
          found.push(full);
        }
        continue;
      }
      walkDirs(full, depth + 1);
    }
  }
  for (const base of bases) {
    if (isDir(base)) walkDirs(base, 0);
  }
  return found;
}

export function userSkillDirs() {
  const home = os.homedir();
  const fixed = [
    ".grok/skills",
    ".claude/skills",
    ".cursor/skills",
    ".codex/skills",
    ".agents/skills",
    ".grok/bundled/skills",
  ].map((rel) => path.join(home, rel));
  return [...fixed, ...pluginSkillDirs(home)].filter(isDir);
}
