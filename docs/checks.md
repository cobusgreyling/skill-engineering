# Checks

Each finding is blocking or a warning. Blocking findings hold the tree at L1.

| Code | Severity | What it catches |
|------|----------|-----------------|
| `missing-frontmatter` | blocking | No YAML frontmatter, so `name` and `description` never load. |
| `bad-name` | blocking | Name is not lowercase kebab-case (1–64 characters, no doubled hyphen). |
| `missing-description` | blocking | No `description` and no `when-to-use`. |
| `missing-trigger` | blocking | Nothing says when the skill should run. |
| `essay-description` | blocking | Description is over 500 characters. It is loaded on every turn. |
| `fat-body` | blocking | Body is over 500 lines. Move procedures into `references/` or `scripts/`. |
| `duplicate-name` | blocking | Two skills share a name. One of them will be dropped. |
| `catalog-over-budget` | blocking | Description tokens exceed 4000. |
| `name-mismatch` | warning | `name` does not match the directory name. |
| `long-description` | warning | Description is over 280 characters and still under the block line. |
| `thin-description` | warning | Description has a trigger and is under 40 characters. |
| `no-split` | warning | Body is over 200 lines and the folder has no `references/` or `scripts/`. |
| `description-overlap` | warning | Two descriptions share 60% or more of their content words. |
| `catalog-heavy` | warning | Description tokens exceed 2000 and are still under the block line. |

A trigger is the phrase "Use when", "when the user", "when you", "whenever", or "if the user", or a `when-to-use` value of at least 20 characters.

Token counts are `ceil(characters / 4)`. They are a stable estimate, not a model tokenizer.

Scanned project roots:

- `.grok/skills`
- `.claude/skills`
- `.cursor/skills`
- `.agents/skills`
- `.codex/skills`
- `skills`

`--user` also scans `~/.grok/skills`, `~/.claude/skills`, `~/.cursor/skills`, `~/.codex/skills`, and `~/.agents/skills`.
