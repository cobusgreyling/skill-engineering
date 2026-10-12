import fs from "node:fs";
import path from "node:path";
import { discover, scanSkillDir, userSkillDirs } from "./discover.mjs";
import { AIM_DESCRIPTION_CHARS, DEFAULT_LIMITS, catalogScore, estimateTokens } from "./limits.mjs";
import { asText, isKebabName, parseSkillMarkdown, parseYamlSubset } from "./parse.mjs";
import { suggestCut } from "./suggest.mjs";

const TRIGGER_RE =
  /\b(?:use this skill when|use when|when the user|when you|whenever|if the user|triggers include)\b|\bwhen\s*:/i;
const STOP = new Set(
  `use when user users asks asked ask want wants wanted with this that your from into
   they them have what does the and for you are how its not can will should whenever
   about skill skills their than then just only also onto over under after before`
    .split(/\s+/)
    .filter(Boolean),
);

function contentWords(text) {
  const words = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP.has(word));
  return new Set(words);
}

function jaccard(left, right) {
  let inter = 0;
  for (const word of left) if (right.has(word)) inter += 1;
  const union = left.size + right.size - inter;
  return union === 0 ? 0 : inter / union;
}

function sharedWords(left, right) {
  const words = [];
  for (const word of left) if (right.has(word)) words.push(word);
  words.sort();
  return words;
}

function hasTrigger(description, whenToUse) {
  if (whenToUse.length >= 20) return true;
  return TRIGGER_RE.test(description) || TRIGGER_RE.test(whenToUse);
}

function exclusionSentences(description) {
  return String(description)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /\b(do not|don't|never)\b/i.test(sentence) && /\b(use|for)\b/i.test(sentence))
    .slice(0, 2);
}

function withExclusions(message, description) {
  const lines = exclusionSentences(description);
  if (!lines.length) return message;
  return `${message} Exclusion: ${lines[0]}`;
}

function finding(severity, code, message) {
  return { severity, code, message };
}

function skillLevel(findings) {
  if (findings.some((item) => item.severity === "blocking")) return "L1";
  if (findings.some((item) => item.severity === "warning")) return "L2";
  return "L3";
}

function readBudget(rootDir) {
  const candidates = [
    path.join(rootDir, ".grok/skills/skill-budget.yaml"),
    path.join(rootDir, "skill-budget.yaml"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const data = parseYamlSubset(fs.readFileSync(file, "utf8"));
    const limits = { ...DEFAULT_LIMITS };
    const num = (key, dest) => {
      if (data[key] === undefined || data[key] === "") return;
      const value = Number(data[key]);
      if (Number.isFinite(value) && value > 0) limits[dest] = value;
    };
    num("description_chars", "descriptionWarnChars");
    num("description_chars_max", "descriptionBlockChars");
    num("body_lines", "bodyWarnLines");
    num("body_lines_max", "bodyBlockLines");
    num("catalog_token_warn", "catalogWarnTokens");
    num("catalog_token_budget", "catalogBlockTokens");
    return { limits, file: path.relative(rootDir, file) };
  }
  return { limits: { ...DEFAULT_LIMITS }, file: null };
}

function siblingDir(dir, name) {
  const target = path.join(dir, name);
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

function topPointsAtSplit(body) {
  const top = String(body || "")
    .split("\n")
    .slice(0, 40)
    .join("\n");
  return /(?:references|scripts)\//.test(top);
}

function linkedFiles(skill) {
  const missing = [];
  const text = String(skill.body || "");
  const linkRe = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of text.matchAll(linkRe)) {
    let target = (match[1] || match[2] || "").trim();
    if (!target || target.startsWith("#")) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    target = target.split("#")[0].split("?")[0];
    if (!target) continue;
    try {
      target = decodeURIComponent(target);
    } catch {
      continue;
    }
    const abs = path.resolve(skill.dir, target);
    if (!fs.existsSync(abs)) missing.push(target);
  }
  return [...new Set(missing)];
}

function loadSkill(entry) {
  const text = fs.readFileSync(entry.file, "utf8");
  const parsed = parseSkillMarkdown(text);
  const description = asText(parsed.data.description);
  const whenToUse = asText(parsed.data["when-to-use"]);
  const declared = asText(parsed.data.name);
  return {
    relPath: entry.relPath,
    rootRel: entry.rootRel,
    dirName: entry.dirName,
    dir: entry.dir,
    declaredName: declared,
    name: declared || entry.dirName,
    description,
    whenToUse,
    body: parsed.body,
    parseError: parsed.error,
    hasReferences: siblingDir(entry.dir, "references"),
    hasScripts: siblingDir(entry.dir, "scripts"),
  };
}

function overAim(description, limits) {
  if (description.length > limits.descriptionBlockChars) return true;
  return (
    limits.descriptionWarnChars < limits.descriptionBlockChars &&
    description.length > limits.descriptionWarnChars
  );
}

function scoreOne(skill, limits) {
  const findings = [];
  if (skill.parseError) {
    findings.push(
      finding(
        "blocking",
        "missing-frontmatter",
        `${skill.relPath} has no YAML frontmatter. name and description never reach the loader.`,
      ),
    );
  }

  const nameSource = skill.declaredName || skill.dirName;
  if (!isKebabName(nameSource)) {
    findings.push(
      finding(
        "blocking",
        "bad-name",
        `${skill.relPath} uses "${nameSource}". Skill names are lowercase kebab-case, 1–64 characters.`,
      ),
    );
  } else if (skill.declaredName && skill.declaredName !== skill.dirName) {
    findings.push(
      finding(
        "warning",
        "name-mismatch",
        `${skill.relPath} declares name ${skill.declaredName} in directory ${skill.dirName}.`,
      ),
    );
  }

  const description = skill.description;
  const triggered = hasTrigger(description, skill.whenToUse);
  if (!description && !skill.whenToUse) {
    findings.push(
      finding(
        "blocking",
        "missing-description",
        `${skill.relPath} has no description. The loader then guesses from the body, which is the expensive part.`,
      ),
    );
  } else if (!triggered) {
    findings.push(
      finding(
        "blocking",
        "missing-trigger",
        `${skill.relPath} never says when to run. Add "Use when …" or "WHEN:" to the description, or set when-to-use.`,
      ),
    );
  }

  if (description.length > limits.descriptionBlockChars) {
    findings.push(
      finding(
        "blocking",
        "essay-description",
        withExclusions(
          `${skill.relPath} description is ${description.length} characters (~${estimateTokens(description)} tokens). The spec limit is ${limits.descriptionBlockChars}. Every description is loaded on every turn.`,
          description,
        ),
      ),
    );
  } else if (
    limits.descriptionWarnChars < limits.descriptionBlockChars &&
    description.length > limits.descriptionWarnChars
  ) {
    findings.push(
      finding(
        "warning",
        "long-description",
        withExclusions(
          `${skill.relPath} description is ${description.length} characters (~${estimateTokens(description)} tokens). The budget aim is ${limits.descriptionWarnChars}.`,
          description,
        ),
      ),
    );
  } else if (description && description.length < limits.thinChars && triggered) {
    findings.push(
      finding(
        "warning",
        "thin-description",
        `${skill.relPath} description is ${description.length} characters. Name the task as well as the trigger.`,
      ),
    );
  }

  const missing = linkedFiles(skill);
  if (missing.length) {
    findings.push(
      finding(
        "warning",
        "missing-file",
        `${skill.relPath} links to ${missing.join(", ")}, and that file is not in the skill folder.`,
      ),
    );
  }

  const bodyLines = skill.body ? skill.body.split("\n").length : 0;
  const split = skill.hasReferences || skill.hasScripts;
  if (bodyLines > limits.bodyBlockLines) {
    if (topPointsAtSplit(skill.body)) {
      findings.push(
        finding(
          "warning",
          "fat-body",
          `${skill.relPath} body is ${bodyLines} lines. The top points at references/ or scripts/, so this manual is paid only when the skill is selected.`,
        ),
      );
    } else {
      findings.push(
        finding(
          "blocking",
          "fat-body",
          `${skill.relPath} body is ${bodyLines} lines. Point the top of the file at references/ or scripts/, or move the procedure there.`,
        ),
      );
    }
  } else if (bodyLines > limits.bodyWarnLines && !split) {
    findings.push(
      finding(
        "warning",
        "no-split",
        `${skill.relPath} body is ${bodyLines} lines and the folder has no references/ or scripts/.`,
      ),
    );
  }

  const aim = Math.min(AIM_DESCRIPTION_CHARS, limits.descriptionWarnChars);
  return {
    name: skill.name,
    relPath: skill.relPath,
    rootRel: skill.rootRel,
    descriptionTokens: estimateTokens(`${description}\n${skill.whenToUse}`),
    bodyLines,
    suggestion: overAim(description, limits) ? suggestCut(description, skill.whenToUse, aim) : "",
    findings,
    level: skillLevel(findings),
  };
}

export function scoreLoaded(skills, limits = DEFAULT_LIMITS) {
  const scored = skills.map((skill) => scoreOne(skill, limits));
  const findings = scored.flatMap((skill) =>
    skill.findings.map((item) => ({ ...item, skill: skill.name, relPath: skill.relPath })),
  );

  const byName = new Map();
  for (const skill of scored) {
    if (!byName.has(skill.name)) byName.set(skill.name, []);
    byName.get(skill.name).push(skill);
  }
  for (const [name, group] of byName) {
    if (group.length < 2) continue;
    const paths = group.map((skill) => skill.relPath).join(", ");
    findings.push(
      finding(
        "blocking",
        "duplicate-name",
        `${paths} share the name ${name}. The loader keeps one and drops the other.`,
      ),
    );
  }

  const wordSets = skills.map((skill) => ({
    name: skill.declaredName || skill.dirName,
    relPath: skill.relPath,
    words: contentWords(`${skill.description} ${skill.whenToUse}`),
  }));
  for (let i = 0; i < wordSets.length; i += 1) {
    for (let j = i + 1; j < wordSets.length; j += 1) {
      const left = wordSets[i];
      const right = wordSets[j];
      if (left.words.size < 4 || right.words.size < 4) continue;
      const score = jaccard(left.words, right.words);
      if (score < limits.overlap) continue;
      const words = sharedWords(left.words, right.words).slice(0, 8);
      findings.push(
        finding(
          "warning",
          "description-overlap",
          `${left.relPath} and ${right.relPath} describe the same job (${Math.round(score * 100)}% word overlap: ${words.join(", ")}). Merge them or make the triggers mutually exclusive.`,
        ),
      );
    }
  }

  const catalogTokens = scored.reduce((sum, skill) => sum + skill.descriptionTokens, 0);
  if (catalogTokens > limits.catalogBlockTokens) {
    findings.push(
      finding(
        "blocking",
        "catalog-over-budget",
        `Descriptions add up to ~${catalogTokens} tokens. Budget is ${limits.catalogBlockTokens}. The model pays this before the task starts.`,
      ),
    );
  } else if (catalogTokens > limits.catalogWarnTokens) {
    findings.push(
      finding(
        "warning",
        "catalog-heavy",
        `Descriptions add up to ~${catalogTokens} tokens, above the warn line of ${limits.catalogWarnTokens}.`,
      ),
    );
  }

  const blocking = findings.filter((item) => item.severity === "blocking").length;
  const warnings = findings.filter((item) => item.severity === "warning").length;
  let level = "L3";
  if (scored.length === 0) level = "L0";
  else if (blocking > 0) level = "L1";
  else if (warnings > 0) level = "L2";
  const score = scored.length === 0 ? 0 : catalogScore(catalogTokens, limits);

  return {
    level,
    score,
    skillCount: scored.length,
    catalogTokens,
    catalogBudget: limits.catalogBlockTokens,
    catalogWarn: limits.catalogWarnTokens,
    skills: scored,
    findings,
    blocking,
    warnings,
  };
}

function realKey(file) {
  try {
    return fs.realpathSync(file);
  } catch {
    return file;
  }
}

export function assess(rootDir, options = {}) {
  const root = path.resolve(rootDir);
  const budget = readBudget(root);
  const found = discover(root);
  const loaded = [];
  const seen = new Set();
  const roots = [...found.roots];

  function add(entries, absolute) {
    for (const entry of entries) {
      const key = realKey(entry.file);
      if (seen.has(key)) continue;
      seen.add(key);
      const skill = loadSkill(entry);
      if (absolute) {
        skill.relPath = entry.file;
        skill.rootRel = entry.rootRel;
      }
      loaded.push(skill);
    }
  }

  add(found.skills, false);

  const extraDirs = [
    ...(options.user ? userSkillDirs() : []),
    ...(options.userDirs || []),
    ...(options.roots || []),
  ];
  for (const dir of extraDirs) {
    const abs = path.resolve(dir);
    const extra = scanSkillDir(abs);
    add(extra, true);
    if (extra.length) roots.push(abs);
  }

  const report = scoreLoaded(loaded, budget.limits);
  report.roots = roots;
  report.budgetFile = budget.file;
  report.root = root;
  return report;
}

export function applyBaseline(report, baseline) {
  const tokens = Number(baseline && baseline.catalogTokens);
  if (!Number.isFinite(tokens)) {
    const error = new Error("Baseline JSON needs a catalogTokens number.");
    error.code = "bad-baseline";
    throw error;
  }
  report.baselineTokens = tokens;
  report.catalogDelta = report.catalogTokens - tokens;
  report.addedSkills = [];
  report.removedSkills = [];
  if (Array.isArray(baseline.skills)) {
    const before = new Set(baseline.skills.map((skill) => skill.name).filter(Boolean));
    const after = new Set(report.skills.map((skill) => skill.name));
    report.addedSkills = [...after].filter((name) => !before.has(name)).sort();
    report.removedSkills = [...before].filter((name) => !after.has(name)).sort();
  }
  return report;
}
