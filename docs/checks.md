# Checks

Each finding is blocking or a warning. Blocking findings hold the tree at L1. The score is separate: it measures the catalog, and blocking findings do not subtract from it.

| Code | Severity | What it catches |
|------|----------|-----------------|
| `missing-frontmatter` | blocking | No YAML frontmatter, so `name` and `description` never load. |
| `bad-name` | blocking | Name is not lowercase kebab-case (1–64 characters, no doubled hyphen). |
| `missing-description` | blocking | No `description` and no `when-to-use`. |
| `missing-trigger` | blocking | Nothing says when the skill should run. |
| `essay-description` | blocking | Description is over 1024 characters, the Agent Skills spec limit. |
| `fat-body` | blocking, or a warning | Body is over 500 lines. Blocking when the top of the file does not point at `references/` or `scripts/`. A warning when it does, because that manual is paid only when the skill is selected. |
| `duplicate-name` | blocking | Two skills share a name. One of them will be dropped. |
| `catalog-over-budget` | blocking | Description tokens exceed 4000. |
| `name-mismatch` | warning | `name` does not match the directory name. |
| `long-description` | warning | Description is over the budget aim, and still under the spec limit. The aim is off until `skill-budget.yaml` sets `description_chars` (init writes 280). |
| `thin-description` | warning | Description has a trigger and is under 40 characters. |
| `no-split` | warning | Body is over 200 lines and the folder has no `references/` or `scripts/`. |
| `missing-file` | warning | A markdown link points at a file the skill folder does not contain. |
| `description-overlap` | warning | Two descriptions share 60% or more of their content words. The message names the shared words. |
| `catalog-heavy` | warning | Description tokens exceed 2000 and are still under the block line. |

A trigger is any of these:

- "Use when", "Use this skill when", "when the user", "when you", "whenever", "if the user"
- "Triggers include"
- a `WHEN:` keyword list
- a `when-to-use` value of at least 20 characters

An exclusion sentence (`Do NOT use …`) stays in the finding so a routing line is not cut by accident. Descriptions over the aim also get a pasteable cut: the first sentence plus the trigger, under 280 characters.

Token counts are `ceil(characters / 4)`. They are a stable estimate, not a model tokenizer. The text report sorts skills by that cost and prints a running total.

Scanned project roots:

- `.grok/skills`
- `.claude/skills`
- `.cursor/skills`
- `.agents/skills`
- `.codex/skills`
- `skills`

Passing a skills directory, or one whose children are skill folders, grades those `SKILL.md` files directly.

`--user` also scans:

- `~/.grok/skills`, `~/.claude/skills`, `~/.cursor/skills`, `~/.codex/skills`, `~/.agents/skills`
- `~/.grok/bundled/skills`
- marketplace `skills` folders under `~/.grok/marketplace-cache`, `~/.claude/plugins`, and `~/.codex/plugins`

`--root dir` adds another skills directory. Repeat the flag to add more.
