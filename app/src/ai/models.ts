// Prices in USD per million tokens (Anthropic first-party rates). Used for estimates only.
export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', hint: '기본 · 가장 정확', input: 4, output: 20 },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', hint: '더 저렴하고 빠름', input: 2, output: 10 },
] as const;

export type ModelId = (typeof MODELS)[number]['id'];

export const DEFAULT_MODEL: ModelId = 'claude-opus-5-5';

/** Output cap per generation. Large enough for a multi-file bot; streaming avoids HTTP timeouts. */
export const MAX_OUTPUT_TOKENS = 64_000;

export const modelInfo = (id: string) => MODELS.find((m) => m.id === id) ?? MODELS[0];

export function costUSD(model: string, inputTokens: number, outputTokens: number): number {
  const m = modelInfo(model);
  return (inputTokens * m.input + outputTokens * m.output) / 1_000_000;
}

export const formatUSD = (usd: number) => (usd < 0.01 ? '$0.01 미만' : `$${usd.toFixed(2)}`);
