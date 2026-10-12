# 技能工程

<p align="center">
  <img src="assets/header.png" alt="Skill Engineering. Design the load. Stop collecting skills. Skill Ready L3, catalog 63 of 4000, score 100, 2 skills." width="100%" />
</p>

> **别再收集技能。设计加载。拿到分数。**

每个技能的 `description` 会在每一轮开始前被加载。正文只在选中该技能时才加载。写得很长的描述不是文档，是每次请求都要付的税。

分数衡量的是这笔税。100 表示目录还在警告线以内。等级衡量的是能不能被选中：有触发条件、名字不重复、描述不超过规范上限 1024 个字符。一个目录可以是 100 分，同时仍是 L1。

```bash
npx @cobusgreyling/skill doctor .
```

或者从本仓库运行：

```bash
git clone https://github.com/cobusgreyling/skill-engineering.git
cd skill-engineering
node bin/skill.mjs doctor examples/messy
```

给已有项目打分：

```bash
npx @cobusgreyling/skill doctor /path/to/your/repo
npx @cobusgreyling/skill init /path/to/your/repo
```

`doctor` 读取这些目录里的 `SKILL.md`：`.grok/skills`、`.claude/skills`、`.cursor/skills`、`.agents/skills`、`.codex/skills`、`skills/`。直接传入一个技能目录也会打分。`--root` 再加一个目录。`--user` 会加上用户主目录里的同名文件夹、`~/.grok/bundled/skills`，以及 marketplace 里的 `skills` 文件夹。

在 pull request 里：

```yaml
- uses: cobusgreyling/skill-engineering@main
  with:
    path: .
    min: L2
    baseline: skill-baseline.json
```

L2 及以上退出码为 0。`--min L3` 会让警告也导致 CI 失败。`--baseline` 是上一次 `doctor --json` 的报告，Action 会在 PR 里评论目录 token 的变化。

本仓库给自己打分：

```bash
node bin/skill.mjs doctor .
```

```
Skill Ready  L3  catalog 36/4000
score 100  ·  1 skill
```

## 一个不及格的目录

`examples/messy` 里有三段问题：描述写成了短文、两个技能同名、描述里没有触发条件。目录仍然很小，所以分数是 100。L1 表示有技能加载不了。

```
Skill Ready  L1  catalog 305/4000
score 100  ·  3 skills
```

完整输出见英文首页。阻塞项是 `missing-trigger`、`essay-description` 和 `duplicate-name`。报告按描述 token 从高到低排列，并给出一条可以贴回去的缩短描述。

## 一个及格的目录

`examples/tight` 是 L3，catalog 63/4000，score 100。合格的描述同时写出任务和触发条件：

```yaml
description: Review a code diff for scope, tests, and regressions. Use when the user asks for a review of a pull request or a local diff.
```

`WHEN: create a cluster, plan an upgrade` 也算触发条件。`Triggers include` 同样算。

## 一个带预算的目录

`examples/catalog` 在预算文件里把 `description_chars` 设为 280。其中的 cluster 技能用了 `WHEN:` 列表，只超出这个目标 10 个字符，所以是警告，不是阻塞。handbook 链到一个不存在的文件。等级是 L2，分数是 100。

没有预算文件时，1024 个字符以内的描述不会产生警告。280 是你自己打开的目标。

## 等级

| 等级 | 含义 |
|------|------|
| L0 | 扫描路径上没有 `SKILL.md`。 |
| L1 | 有阻塞项。某个技能加载不了，或者目录超出预算。 |
| L2 | 没有阻塞项，仍有警告。 |
| L3 | 没有阻塞项，也没有警告。 |

分数在警告线以内（默认 2000 token）为 100，到达预算（默认 4000）时为 0。

检查项和阈值：[docs/checks.md](docs/checks.md)。等级如何判定：[docs/levels.md](docs/levels.md)。

`init` 会写入 `.grok/skills/skill-budget.yaml`，里面是 280 字符的目标和 1024 字符的规范上限。目录里还没有任何技能时，再写一个能打到 L3 的示例技能。已有的预算文件和技能不会被覆盖。

```bash
node bin/skill.mjs doctor . --json > skill-baseline.json
node bin/skill.mjs doctor . --baseline skill-baseline.json
```

Token 按 `ceil(字符数 / 4)` 估算，所以分数不跟着分词器变。

MIT。Node 18 或更高。没有依赖。

[English](README.md)
