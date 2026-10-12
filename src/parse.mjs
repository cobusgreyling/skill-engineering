const NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export function isKebabName(name) {
  return NAME_RE.test(name) && !name.includes("--");
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseYamlSubset(raw) {
  const lines = String(raw).split(/\r?\n/);
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) {
      i += 1;
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      i += 1;
      continue;
    }
    const key = match[1];
    const rest = match[2].trim();
    if (rest === ">" || rest === "|" || rest === ">-" || rest === "|-") {
      const literal = rest.startsWith("|");
      const chunks = [];
      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        const indented = /^[ \t]/.test(next);
        if (!indented) {
          if (next.trim() === "") {
            const look = lines[i + 1];
            if (look !== undefined && /^[ \t]/.test(look)) {
              chunks.push("");
              i += 1;
              continue;
            }
          }
          break;
        }
        chunks.push(next.replace(/^[ \t]/, "").replace(/^[ \t]/, ""));
        i += 1;
      }
      data[key] = literal
        ? chunks.join("\n").trim()
        : chunks.join(" ").replace(/\s+/g, " ").trim();
      continue;
    }
    if (rest === "") {
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        items.push(stripQuotes(lines[j].replace(/^\s+-\s+/, "").trim()));
        j += 1;
      }
      data[key] = items.length ? items.join(", ") : "";
      i = items.length ? j : i + 1;
      continue;
    }
    data[key] = stripQuotes(rest);
    i += 1;
  }
  return data;
}

export function parseSkillMarkdown(text) {
  const normalized = String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n") && normalized !== "---") {
    return { data: {}, body: normalized, error: "missing-frontmatter" };
  }
  const end = normalized.indexOf("\n---", 3);
  if (end === -1) {
    return { data: {}, body: normalized, error: "missing-frontmatter" };
  }
  const raw = normalized.slice(4, end);
  const body = normalized.slice(end + 4).replace(/^\n/, "");
  return { data: parseYamlSubset(raw), body, error: null };
}

export function asText(value) {
  if (value == null) return "";
  return String(value).trim();
}
