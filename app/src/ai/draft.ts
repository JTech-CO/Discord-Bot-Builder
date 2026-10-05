import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { DraftOutput, draftSystemPrompt } from './draftSpec';
import { FALLBACK_MODELS, GenerationError, toGenerationError } from './generate';
import type { ModelId } from './models';
import { t } from '../i18n/t';

export interface DraftRequest {
  runtime: 'browser' | 'node';
  apiKey: string;
  model: ModelId;
  description: string;
  locale: 'ko' | 'en';
  signal: AbortSignal;
}

export interface DraftResponse {
  draft: DraftOutput;
  usage: { input: number; output: number };
}

/** Asks Claude to sketch a flow from a plain-language description. */
export async function draftFlow({ runtime, apiKey, model, description, locale, signal }: DraftRequest): Promise<DraftResponse> {
  const client = new Anthropic({ apiKey, maxRetries: 2, ...(runtime === 'browser' ? { dangerouslyAllowBrowser: true } : {}) });
  try {
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: 16_000,
        ...(FALLBACK_MODELS.has(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high', format: zodOutputFormat(DraftOutput) },
        // The catalog is identical on every call, so it is cached.
        system: [{ type: 'text', text: draftSystemPrompt(locale), cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `Draft a flow for this bot:\n${JSON.stringify(description)}` }],
      },
      { signal },
    );
    const message = await stream.finalMessage();
    if (message.stop_reason === 'refusal') throw new GenerationError('refusal', t('모델이 이 설명으로는 초안을 만들지 않았습니다. 설명을 바꿔 다시 시도해 주세요.'));
    if (message.stop_reason === 'max_tokens') throw new GenerationError('truncated', t('초안이 너무 커서 잘렸습니다. 봇을 더 작게 나눠 설명해 주세요.'));
    if (!message.parsed_output) throw new GenerationError('invalid', t('초안을 읽지 못했습니다. 다시 시도해 주세요.'));
    return { draft: message.parsed_output, usage: { input: message.usage.input_tokens, output: message.usage.output_tokens } };
  } catch (err) {
    throw toGenerationError(err);
  }
}
