# Skill Engineering

> **Stop collecting skills. Design the load. Get a score.**

The description of every skill is loaded on every turn, before the task starts. The body is loaded only when a skill is selected. A long description is not documentation. It is a tax.

```bash
git clone https://github.com/cobusgreyling/skill-engineering.git
cd skill-engineering
node bin/skill.mjs doctor examples/messy
```

Grade a project you already have:

```bash
node /path/to/skill-engineering/bin/skill.mjs doctor /path/to/your/repo
node /path/to/skill-engineering/bin/skill.mjs init /path/to/your/repo
```

`doctor` reads `SKILL.md` files under `.grok/skills`, `.claude/skills`, `.cursor/skills`, `.agents/skills`, `.codex/skills`, and `skills/`. `--user` adds the same folders in your home directory. Exit code is `0` at L2 or better, so a CI job can use `--min L3`.

This repository scores itself:

```bash
node bin/skill.mjs doctor .
```

```
Skill Ready  L3  100/100
1 skill  ·  catalog ~36 tokens of 4000
```

## A folder that fails

`examples/messy` has an essay where a trigger should be, a second skill with the same name, and a description that never says when to run.

```
Skill Ready  L1  40/100
3 skills  ·  catalog ~179 tokens of 4000
roots  .grok/skills  .claude/skills

PATH                            LEVEL  TOKENS  FINDINGS
.claude/skills/commit/SKILL.md  L3         35  ok
.grok/skills/commit/SKILL.md    L1        139  missing-trigger, essay-description
.grok/skills/ship-it/SKILL.md   L1          5  missing-trigger

Blocking
  missing-trigger
    .grok/skills/commit/SKILL.md never says when to run. Add "Use when …" to the description, or set when-to-use.
  essay-description
    .grok/skills/commit/SKILL.md description is 552 characters. Every description is loaded on every turn. Cut it under 500 and move the essay into the body.
  missing-trigger
    .grok/skills/ship-it/SKILL.md never says when to run. Add "Use when …" to the description, or set when-to-use.
  duplicate-name
    .claude/skills/commit/SKILL.md, .grok/skills/commit/SKILL.md share the name commit. The loader keeps one and drops the other.
```

## A folder that passes

```
Skill Ready  L3  100/100
2 skills  ·  catalog ~63 tokens of 4000
roots  .grok/skills

PATH                                  LEVEL  TOKENS  FINDINGS
.grok/skills/commit-message/SKILL.md  L3         31  ok
.grok/skills/review-diff/SKILL.md     L3         32  ok
```

A passing description names the job and the trigger:

```yaml
description: Review a code diff for scope, tests, and regressions. Use when the user asks for a review of a pull request or a local diff.
```

## Levels

| Level | Meaning |
|-------|---------|
| L0 | No `SKILL.md` on the scanned roots. |
| L1 | A blocking finding. The catalog is wrong. |
| L2 | Nothing blocking. Warnings remain. |
| L3 | Nothing blocking and nothing to warn about. |

Checks, thresholds, and the token estimate: [docs/checks.md](docs/checks.md). How a level is chosen: [docs/levels.md](docs/levels.md).

`init` writes `.grok/skills/skill-budget.yaml`. On an empty tree it also writes one starter skill that scores L3. It does not overwrite a budget or a skill you already have.

```bash
node bin/skill.mjs doctor . --json
node bin/skill.mjs doctor . --min L3
```

Token counts are `ceil(characters / 4)`. They are a stable estimate so the score does not move when a tokenizer does.

MIT. Node 18 or newer. No dependencies.

[中文](README.zh-CN.md)
