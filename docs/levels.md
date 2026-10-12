# Skill Ready

The level describes selection. The score describes the catalog.

| Level | Meaning |
|-------|---------|
| L0 | No `SKILL.md` on the scanned roots. |
| L1 | At least one blocking finding. A skill will not load, or the catalog is over its budget. |
| L2 | Nothing blocking. Warnings remain. |
| L3 | Nothing blocking and nothing to warn about. |

`skill doctor` exits 0 at L2 or better. `--min L3` makes warnings fail CI.

The score is 100 while description tokens are at or under the warn line (default 2000). It falls to 0 at the budget (default 4000). A tree can be L1 and still score 100: the catalog is cheap, and a skill in it is wrong.

Descriptions are paid on every turn, for every skill, before the task starts. Bodies are paid when a skill is selected.

`--baseline report.json` compares `catalogTokens` with a previous `doctor --json` report and prints the delta.

Defaults live in `src/limits.mjs`. `.grok/skills/skill-budget.yaml` overrides them. `description_chars` is the aim that turns on `long-description`. `description_chars_max` is the spec block line.
