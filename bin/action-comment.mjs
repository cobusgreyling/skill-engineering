import { execFileSync } from "node:child_process";
import fs from "node:fs";

const report = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const output = process.env.GITHUB_OUTPUT;
if (output) {
  const delta = report.catalogDelta == null ? "" : String(report.catalogDelta);
  fs.appendFileSync(
    output,
    `level=${report.level}\ncatalog-tokens=${report.catalogTokens}\ncatalog-delta=${delta}\n`,
  );
}

if (process.env.GITHUB_EVENT_NAME !== "pull_request" || !process.env.GH_TOKEN) process.exit(0);
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const pr = event.pull_request && event.pull_request.number;
if (!pr) process.exit(0);

const sign = report.catalogDelta > 0 ? "+" : "";
const delta =
  report.catalogDelta == null
    ? ""
    : `\n\nCatalog ${report.baselineTokens} → ${report.catalogTokens} · ${sign}${report.catalogDelta} tokens`;
const body = `<!-- skill-engineering -->\n**Skill Ready ${report.level}** · catalog ${report.catalogTokens}/${report.catalogBudget} · score ${report.score}${delta}\n`;
const marker = "<!-- skill-engineering -->";
const repo = process.env.GITHUB_REPOSITORY;
const list = JSON.parse(
  execFileSync("gh", ["api", `repos/${repo}/issues/${pr}/comments`], { encoding: "utf8" }),
);
const existing = list.find((comment) => String(comment.body || "").includes(marker));
if (existing) {
  execFileSync(
    "gh",
    ["api", "--method", "PATCH", `repos/${repo}/issues/comments/${existing.id}`, "-f", `body=${body}`],
    { stdio: "inherit" },
  );
} else {
  execFileSync(
    "gh",
    ["api", "--method", "POST", `repos/${repo}/issues/${pr}/comments`, "-f", `body=${body}`],
    { stdio: "inherit" },
  );
}
