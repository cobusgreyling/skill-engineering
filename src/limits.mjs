export const DEFAULT_LIMITS = {
  descriptionWarnChars: 280,
  descriptionBlockChars: 500,
  thinChars: 40,
  bodyWarnLines: 200,
  bodyBlockLines: 500,
  catalogWarnTokens: 2000,
  catalogBlockTokens: 4000,
  overlap: 0.6,
};

export function estimateTokens(text) {
  const value = String(text ?? "");
  if (!value) return 0;
  return Math.ceil(value.length / 4);
}
