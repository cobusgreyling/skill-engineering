# Skill Engineering

<p align="center">
  <img src="assets/header.png" alt="Skill Engineering. Design the load. Stop collecting skills. Skill Ready L3, catalog 63 of 4000, score 100, 2 skills." width="100%" />
</p>

> **Stop collecting skills. Design the load. Get a score.**

The description of every skill is loaded on every turn, before the task starts. The body is loaded only when a skill is selected. A long description is not documentation. It is a tax.

The score is that tax. 100 means the catalog is inside the warn line. The level is selection: a trigger, a distinct name, a description inside the spec limit of 1024 characters. A folder can score 100 and still be L1.

```bash
npx @cobusgreyling/skill doctor .
```

Or from a checkout:

```bash
git clone https://github.com/cobusgreyling/skill-engineering.git
cd skill-engineering
node bin/skill.mjs doctor examples/messy
```

Grade a project you already have:

```bash
npx @cobusgreyling/skill doctor /path/to/your/repo
npx @cobusgreyling/skill init /path/to/your/repo
```

`doctor` reads `SKILL.md` files under `.grok/skills`, `.claude/skills`, `.cursor/skills`, `.agents/skills`, `.codex/skills`, and `skills/`. A directory of skill folders is graded directly. `--root` adds another one. `--user` adds the same folders in your home directory, plus `~/.grok/bundled/skills` and marketplace `skills` folders.

On a pull request:

```yaml
- uses: cobusgreyling/skill-engineering@main
  with:
    path: .
    min: L2
    baseline: skill-baseline.json
```

Exit code is `0` at L2 or better. `--min L3` makes warnings fail CI. `--baseline` is a previous `doctor --json` report. The action comments the catalog delta.

This repository scores itself:

```bash
node bin/skill.mjs doctor .
```

```
Skill Ready  L3  catalog 36/4000
score 100  ·  1 skill
```

## A folder that fails

`examples/messy` has an essay where a trigger should be, a second skill with the same name, and a description that never says when to run. The catalog is still small, so the score stays 100. L1 means a skill will not load.

```
Skill Ready  L1  catalog 305/4000
score 100  ·  3 skills
roots  .grok/skills  .claude/skills

TOKENS   TOTAL  LEVEL  PATH                            FINDINGS
   265     265  L1     .grok/skills/commit/SKILL.md    missing-trigger, essay-description
    35     300  L3     .claude/skills/commit/SKILL.md  ok
     5     305  L1     .grok/skills/ship-it/SKILL.md   missing-trigger

Blocking
  missing-trigger
    .grok/skills/commit/SKILL.md never says when to run. Add "Use when …" or "WHEN:" to the description, or set when-to-use.
  essay-description
    .grok/skills/commit/SKILL.md description is 1057 characters (~265 tokens). The spec limit is 1024. Every description is loaded on every turn. Exclusion: Do NOT use this skill for writing release notes.
  duplicate-name
    .claude/skills/commit/SKILL.md, .grok/skills/commit/SKILL.md share the name commit. The loader keeps one and drops the other.

Cuts
  .grok/skills/commit/SKILL.md
    This skill explains the entire philosophy of version control, the history of conventional commits, why teams argue about footers, how to write a changelog, how to squash, how to rebase, how to talk to reviewers, and how to think about atomic changes in a monorepo.
```

The table is sorted by description tokens. TOTAL is the running catalog. The Cuts line is a shorter description you can paste. The exclusion sentence stays in the finding so a routing line is not thrown away by accident.

## A folder that passes

```
Skill Ready  L3  catalog 63/4000
score 100  ·  2 skills
roots  .grok/skills

TOKENS   TOTAL  LEVEL  PATH                                  FINDINGS
    32      32  L3     .grok/skills/review-diff/SKILL.md     ok
    31      63  L3     .grok/skills/commit-message/SKILL.md  ok
```

A passing description names the job and the trigger:

```yaml
description: Review a code diff for scope, tests, and regressions. Use when the user asks for a review of a pull request or a local diff.
```

`WHEN: create a cluster, plan an upgrade` is a trigger too. So is "Triggers include".

## A catalog with a budget

`examples/catalog` sets `description_chars: 280` in its budget file. The cluster skill uses a `WHEN:` list and an exclusion, and it is 10 characters over that aim. The handbook links to a file that is not there. Nothing is blocking.

```bash
node bin/skill.mjs doctor examples/catalog
```

```
Skill Ready  L2  catalog 114/4000
score 100  ·  3 skills

TOKENS   TOTAL  LEVEL  PATH                                 FINDINGS
    73      73  L2     .grok/skills/cluster/SKILL.md        long-description
    22      95  L3     .grok/skills/meeting-notes/SKILL.md  ok
    19     114  L2     .grok/skills/handbook/SKILL.md       missing-file
```

Without a budget file, a description under 1024 characters is not a warning. 280 is the aim you opt into.

## Levels

| Level | Meaning |
|-------|---------|
| L0 | No `SKILL.md` on the scanned roots. |
| L1 | A blocking finding. A skill will not load, or the catalog is over its budget. |
| L2 | Nothing blocking. Warnings remain. |
| L3 | Nothing blocking and nothing to warn about. |

The score is 100 at or under the warn line (default 2000 tokens) and 0 at the budget (default 4000).

Checks, thresholds, and the token estimate: [docs/checks.md](docs/checks.md). How a level is chosen: [docs/levels.md](docs/levels.md).

`init` writes `.grok/skills/skill-budget.yaml` with a 280-character aim and a 1024-character spec limit. On an empty tree it also writes one starter skill that scores L3. It does not overwrite a budget or a skill you already have.

```bash
node bin/skill.mjs doctor . --json > skill-baseline.json
node bin/skill.mjs doctor . --baseline skill-baseline.json
node bin/skill.mjs doctor ~/.grok/bundled/skills
```

Token counts are `ceil(characters / 4)`. They are a stable estimate so the score does not move when a tokenizer does.

MIT. Node 18 or newer. No dependencies.

[中文](README.zh-CN.md)
