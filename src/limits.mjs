export const DEFAULT_LIMITS = {
  // Warn only when a budget file sets this below the spec block line.
  descriptionWarnChars: 1024,
  descriptionBlockChars: 1024,
  thinChars: 40,
  bodyWarnLines: 200,
  bodyBlockLines: 500,
  catalogWarnTokens: 2000,
  catalogBlockTokens: 4000,
  overlap: 0.6,
};

export const AIM_DESCRIPTION_CHARS = 280;

export function estimateTokens(text) {
  const value = String(text ?? "");
  if (!value) return 0;
  return Math.ceil(value.length / 4);
}

export function catalogScore(tokens, limits = DEFAULT_LIMITS) {
  const warn = limits.catalogWarnTokens;
  const block = limits.catalogBlockTokens;
  if (block <= 0) return 0;
  if (tokens >= block) return 0;
  if (warn >= block || tokens <= warn) return 100;
  return Math.round((100 * (block - tokens)) / (block - warn));
}
