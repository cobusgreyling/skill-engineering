# Skill Ready

The level describes the load, not the prose style.

| Level | Meaning |
|-------|---------|
| L0 | No `SKILL.md` on the scanned roots. |
| L1 | At least one blocking finding. The catalog is wrong. |
| L2 | Nothing blocking. Warnings remain. |
| L3 | Nothing blocking and nothing to warn about. |

`skill doctor` exits 0 at L2 or better. `--min L3` makes warnings fail CI.

Descriptions are paid on every turn, for every skill, before the task starts. Bodies are paid when a skill is selected. A Skill Ready score is a statement about that bill.

Defaults live in `src/limits.mjs`. `.grok/skills/skill-budget.yaml` overrides them.
