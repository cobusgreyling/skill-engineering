---
name: skill-doctor
description: Grade SKILL.md files for trigger, catalog cost, and body size. Use when the user asks for a Skill Ready score or wants a skill folder audited.
---

# Skill doctor

From this repository:

```bash
node bin/skill.mjs doctor . --json
```

Report the level, the catalog tokens, the score, and the blocking findings. The score is the catalog. The level is selection. Sort by description tokens and propose the cut that saves the most tokens first. Fix blocking findings before adding another skill.

Thresholds live in `src/limits.mjs` and [docs/checks.md](../../../docs/checks.md). This file is the copy an agent needs when the skill is selected.

## Shape

`<what it does, one sentence>. Use when the user asks to <trigger>.`

`WHEN: keyword, keyword` counts as a trigger. So does "Triggers include" and a `when-to-use` value of at least 20 characters.

Aim under 280 characters when `.grok/skills/skill-budget.yaml` sets `description_chars`. The spec block line is 1024. Put the procedure in the body.

## Checks

| Code | Severity | What to do |
|------|----------|------------|
| `missing-frontmatter` | blocking | Add `name` and `description` in YAML frontmatter. |
| `bad-name` | blocking | Lowercase kebab-case, 1–64 characters, no doubled hyphen. |
| `missing-description` | blocking | Add a description. The loader must not guess from the body. |
| `missing-trigger` | blocking | Say when the skill runs. |
| `essay-description` | blocking | Cut under 1024 characters. Keep one exclusion sentence if the description says where the skill must not run. |
| `fat-body` | blocking, or a warning | Over 500 lines. Point the top of the file at `references/` or `scripts/` and it becomes a warning. |
| `duplicate-name` | blocking | Keep one skill. The loader drops the other. |
| `catalog-over-budget` | blocking | The descriptions together exceed 4000 tokens. Cut the largest first. |
| `name-mismatch` | warning | Make `name` match the directory. |
| `long-description` | warning | Over the budget aim (init writes 280). Under the spec limit. Paste the Cuts line. |
| `thin-description` | warning | Name the task as well as the trigger. |
| `no-split` | warning | Over 200 lines and no `references/` or `scripts/` folder. |
| `missing-file` | warning | A markdown link points at a file that is not there. |
| `description-overlap` | warning | The message lists the shared words. Merge the skills, or make the triggers exclusive. |
| `catalog-heavy` | warning | Descriptions exceed 2000 tokens and are still under 4000. |

## Load

Descriptions are paid on every turn. Bodies are paid when the skill is selected. A long body that opens by pointing at `references/` or `scripts/` is a warning, not a failed catalog.

`--baseline report.json` prints how many catalog tokens a change added. `--root` grades a skills directory. `--user` adds home, bundled, and marketplace skills.
