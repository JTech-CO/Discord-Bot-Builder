import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { MAX_OUTPUT_TOKENS, type ModelId } from './models';
import { ProjectOutput } from './output';

export type GenerationErrorKind =
  | 'auth' | 'permission' | 'rate' | 'overloaded' | 'network' | 'bad_request'
  | 'refusal' | 'truncated' | 'invalid' | 'aborted' | 'unknown';

export class GenerationError extends Error {
  constructor(readonly kind: GenerationErrorKind, message: string) {
    super(message);
  }
}

export interface GenerationProgress {
  chars: number;
  files: number;
  current: string | null;
}

export interface GenerationResult {
  output: ProjectOutput;
  model: string;
  /** Set when a fallback model finished the request after the requested model declined. */
  servedBy: string | null;
  usage: { input: number; output: number };
}

interface GenerateOptions {
  apiKey: string;
  model: ModelId;
  prompt: string;
  signal: AbortSignal;
  onProgress: (p: GenerationProgress) => void;
}

const SYSTEM =
  'You are an expert TypeScript and discord.js developer. From the specification you are given, you write a complete, ' +
  'working Discord bot project that a beginner can install and run. Follow the specification exactly.';

// Server-side refusal fallbacks are documented for Claude Opus 5; other models run without them.
const FALLBACK_MODELS = new Set<ModelId>(['claude-opus-5']);

const PATH_IN_JSON = /"path"\s*:\s*"((?:[^"\\]|\\.)*)"/g;

function describeProgress(snapshot: string): GenerationProgress {
  let files = 0;
  let current: string | null = null;
  for (const m of snapshot.matchAll(PATH_IN_JSON)) {
    files++;
    current = m[1];
  }
  return { chars: snapshot.length, files, current };
}

function toGenerationError(err: unknown): GenerationError {
  if (err instanceof GenerationError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return new GenerationError('aborted', '생성을 취소했습니다.');
  if (err instanceof Anthropic.AuthenticationError) return new GenerationError('auth', 'API 키가 올바르지 않거나 만료되었습니다. 키를 다시 확인해 주세요.');
  if (err instanceof Anthropic.PermissionDeniedError) return new GenerationError('permission', '이 API 키로는 선택한 모델을 쓸 수 없습니다. 콘솔에서 권한과 결제 상태를 확인해 주세요.');
  if (err instanceof Anthropic.RateLimitError) return new GenerationError('rate', '요청 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요.');
  if (err instanceof Anthropic.BadRequestError) return new GenerationError('bad_request', `요청이 거절되었습니다: ${err.message}`);
  if (err instanceof Anthropic.InternalServerError) return new GenerationError('overloaded', 'Anthropic 서버가 바쁘거나 오류가 났습니다. 잠시 후 다시 시도해 주세요.');
  if (err instanceof Anthropic.APIConnectionError) return new GenerationError('network', '네트워크에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.');
  if (err instanceof Anthropic.APIError) return new GenerationError('unknown', `API 오류(${err.status ?? '알 수 없음'}): ${err.message}`);
  return new GenerationError('unknown', err instanceof Error ? err.message : '알 수 없는 오류가 났습니다.');
}

export async function generateProject({ apiKey, model, prompt, signal, onProgress }: GenerateOptions): Promise<GenerationResult> {
  // BYOK in the browser: the key belongs to the user and goes straight to api.anthropic.com.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  const fallback = FALLBACK_MODELS.has(model);

  try {
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        ...(fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high', format: zodOutputFormat(ProjectOutput) },
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal },
    );

    let last = 0;
    stream.on('text', (_delta, snapshot) => {
      const now = Date.now();
      if (now - last < 250) return;
      last = now;
      onProgress(describeProgress(snapshot));
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      throw new GenerationError('refusal', '모델이 이 요청을 거절했습니다. 흐름의 내용(특히 자연어 지시와 메시지 문구)을 확인해 주세요.');
    }
    if (message.stop_reason === 'max_tokens') {
      throw new GenerationError('truncated', '결과가 출력 한도를 넘어 잘렸습니다. 흐름을 나누거나 단순하게 만든 뒤 다시 시도해 주세요.');
    }
    const output = message.parsed_output;
    if (!output) {
      throw new GenerationError('invalid', '모델의 응답을 프로젝트 형식으로 읽지 못했습니다. 다시 시도해 주세요.');
    }

    const servedByFallback = message.content.some((b) => b.type === 'fallback');
    return {
      output,
      model,
      servedBy: servedByFallback ? message.model : null,
      usage: { input: message.usage.input_tokens, output: message.usage.output_tokens },
    };
  } catch (err) {
    throw toGenerationError(err);
  }
}
