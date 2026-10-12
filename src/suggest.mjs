import { AIM_DESCRIPTION_CHARS } from "./limits.mjs";

const TRIGGER_PICK =
  /\bWHEN\s*:[^.]+|\b(?:use this skill when|use when|when the user|when you|whenever|if the user|triggers include)\b[^.]*/i;

export function suggestCut(description, whenToUse, aim = AIM_DESCRIPTION_CHARS) {
  const text = String(description || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || aim < 8) return "";
  const sentence = (text.split(/(?<=[.!?])\s/)[0] || text).trim();
  const fromBody = text.match(TRIGGER_PICK);
  const trigger = (fromBody ? fromBody[0] : String(whenToUse || ""))
    .replace(/\s+/g, " ")
    .trim();
  let cut = sentence;
  const probe = trigger.slice(0, 24).toLowerCase();
  if (trigger && probe && !cut.toLowerCase().includes(probe)) {
    const base = cut.replace(/[.]+$/, "");
    cut = `${base}. ${trigger}`;
    if (!/[.!?]$/.test(cut)) cut += ".";
  }
  if (cut.length > aim) cut = `${cut.slice(0, aim - 1).trimEnd()}…`;
  return cut;
}
