import { Bot, Globe, Rss, Webhook } from 'lucide-react';
import type { NodeDef } from '../types';
import { ENV_NAME, clip, num, rows, str } from '../helpers';

const AI_PROVIDERS: Record<string, { name: string; env: string; pkg: string; model?: string }> = {
  anthropic: { name: 'Anthropic Claude', env: 'ANTHROPIC_API_KEY', pkg: '@anthropic-ai/sdk', model: 'claude-opus-5' },
  openai: { name: 'OpenAI', env: 'OPENAI_API_KEY', pkg: 'openai' },
  gemini: { name: 'Google Gemini', env: 'GEMINI_API_KEY', pkg: '@google/genai' },
};
const provider = (p: Record<string, unknown>) => AI_PROVIDERS[str(p, 'provider')] ?? AI_PROVIDERS.anthropic;

export const http: NodeDef = {
  type: 'integration.http',
  category: 'integration',
  label: 'HTTP 요청',
  description: '외부 API를 호출하고 응답을 받습니다.',
  icon: Globe,
  fields: [
    {
      key: 'method', label: '메서드', kind: 'select', default: 'GET',
      options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m })),
    },
    {
      key: 'url', label: 'URL', kind: 'text', required: true, maxLength: 2048, refs: true, placeholder: 'https://api.example.com/items',
      pattern: { regex: /^(https?:\/\/|\{\{)/, message: 'http:// 또는 https:// 로 시작해야 합니다.' },
    },
    {
      key: 'headers', label: '헤더', kind: 'table', maxRows: 20, addLabel: '헤더 추가',
      help: 'API 키 같은 비밀값은 직접 적지 말고 {{env.이름}} 으로 넣으세요. 생성된 봇의 .env에서 읽습니다.',
      columns: [
        { key: 'name', label: '이름', kind: 'text', required: true, maxLength: 100, placeholder: 'Authorization' },
        { key: 'value', label: '값', kind: 'text', required: true, maxLength: 1000, placeholder: 'Bearer {{env.API_KEY}}' },
      ],
    },
    { key: 'body', label: '본문 (JSON)', kind: 'textarea', maxLength: 10000, refs: true, when: (p) => !['GET', 'DELETE'].includes(str(p, 'method') || 'GET') },
    { key: 'extract', label: '응답에서 꺼낼 값', kind: 'text', maxLength: 200, placeholder: 'data.items[0].name', help: '비워 두면 응답 전체를 씁니다.' },
  ],
  outputs: (p) => [
    { key: 'status', label: '상태 코드', type: 'number' },
    { key: 'data', label: '응답 데이터', type: 'object' },
    ...(str(p, 'extract') ? [{ key: 'value', label: '꺼낸 값', type: 'any' as const }] : []),
  ],
  summary: (p) => clip(`${str(p, 'method') || 'GET'} ${str(p, 'url') || 'URL 없음'}`, 40),
  simulate: (c) => ({
    outputs: { status: 200, data: { mock: true }, ...(str(c.props, 'extract') ? { value: '(모의 값)' } : {}) },
    log: `${str(c.props, 'method') || 'GET'} ${c.text('url')} 요청이 성공했다고 가정합니다. (실제로 보내지 않음)`,
  }),
  draftHint: 'Output value exists only when extract is set.',
  spec: (p, f) => {
    const method = str(p, 'method') || 'GET';
    const headers = rows(p, 'headers').filter((h) => h.name).map((h) => `${f.text(h.name)}: ${f.text(h.value)}`).join(', ');
    const body = !['GET', 'DELETE'].includes(method) && str(p, 'body').trim() ? ` and the JSON body ${f.text(p.body)}` : '';
    const extract = str(p, 'extract').trim()
      ? ` Output value is the value at path ${f.text(p.extract)} inside data (empty if missing).`
      : '';
    return `Send an HTTP ${method} request to ${f.text(p.url)}${headers ? ` with headers ${headers}` : ''}${body}. URL-encode placeholder values inserted into the URL. Time out after 10 seconds. Output status is the HTTP status (0 on network error or timeout); data is the parsed JSON body, or the text body if it is not JSON, or null on error.${extract}`;
  },
  requires: () => ({ slow: true }),
};

export const ai: NodeDef = {
  type: 'integration.ai',
  category: 'integration',
  label: 'AI 응답',
  description: '생성된 봇이 실행 중에 AI 모델에게 묻고 답을 받습니다.',
  icon: Bot,
  fields: [
    {
      key: 'provider', label: '제공자', kind: 'select', default: 'anthropic',
      options: [
        { value: 'anthropic', label: 'Anthropic (Claude)' },
        { value: 'openai', label: 'OpenAI' },
        { value: 'gemini', label: 'Google Gemini' },
      ],
    },
    { key: 'model', label: '모델', kind: 'text', maxLength: 100, placeholder: 'claude-opus-5', help: '비워 두면 제공자의 최신 권장 모델을 씁니다.' },
    { key: 'system', label: '역할 지시', kind: 'textarea', maxLength: 4000, refs: true, placeholder: '너는 친절한 서버 도우미야.' },
    { key: 'prompt', label: '질문', kind: 'textarea', required: true, maxLength: 4000, refs: true, placeholder: '{{n1.content}}' },
    { key: 'maxLength', label: '답변 최대 길이(자)', kind: 'number', min: 50, max: 2000, default: 1500 },
  ],
  outputs: () => [{ key: 'reply', label: 'AI 답변', type: 'text' }],
  summary: (p) => ({ anthropic: 'Claude', openai: 'OpenAI', gemini: 'Gemini' })[str(p, 'provider')] ?? 'Claude',
  simulate: (c) => ({
    outputs: { reply: `(모의 AI 답변) ${clip(c.text('prompt'), 40)}` },
    log: 'AI 호출은 실제로 하지 않고 모의 답변을 썼습니다.',
  }),
  spec: (p, f) => {
    const ai = provider(p);
    const model = str(p, 'model').trim() ? f.text(p.model) : ai.model ? f.text(ai.model) : "the provider's current recommended general model";
    const system = str(p, 'system').trim() ? f.text(p.system) : 'none';
    return `Ask ${ai.name} (model ${model}, official SDK, API key from ${ai.env}) with system prompt ${system} and user message ${f.text(p.prompt)}. Time out after 30 seconds and truncate the reply to ${num(p, 'maxLength') ?? 1500} characters. Output reply is the answer; on any error, log it and use a short apology in the bot's language instead.`;
  },
  requires: (p) => {
    const ai = provider(p);
    return { slow: true, env: [{ name: ai.env, purpose: `${ai.name} API key` }], packages: [ai.pkg] };
  },
};

export const webhook: NodeDef = {
  type: 'integration.webhook',
  category: 'integration',
  label: '웹훅 보내기',
  description: '디스코드나 외부 서비스의 웹훅으로 메시지를 보냅니다.',
  icon: Webhook,
  fields: [
    {
      key: 'urlEnv', label: '웹훅 URL 환경변수', kind: 'text', required: true, pattern: ENV_NAME, placeholder: 'ALERT_WEBHOOK_URL',
      help: '웹훅 URL은 비밀값이라 생성된 봇의 .env에 넣습니다. 여기에는 변수 이름만 적습니다.',
    },
    { key: 'content', label: '내용', kind: 'textarea', required: true, maxLength: 2000, refs: true },
    { key: 'username', label: '보내는 이름', kind: 'text', maxLength: 80 },
  ],
  summary: (p) => str(p, 'urlEnv') || '환경변수 없음',
  simulate: (c) => {
    const text = `웹훅(${str(c.props, 'urlEnv')})으로 보냄: "${clip(c.text('content'), 60)}"`;
    return { effect: { kind: 'action', text }, log: `${text} (실제로 보내지 않음)` };
  },
  spec: (p, f) =>
    `POST a message to the webhook URL stored in environment variable ${f.text(p.urlEnv)} with content ${f.text(p.content)}${str(p, 'username').trim() ? ` and username ${f.text(p.username)}` : ''}, with all mentions disabled. Log failures and continue.`,
  requires: (p) => ({
    slow: true,
    env: ENV_NAME.regex.test(str(p, 'urlEnv')) ? [{ name: str(p, 'urlEnv'), purpose: 'webhook URL (keep secret)' }] : [],
  }),
};

export const rss: NodeDef = {
  type: 'integration.rss',
  category: 'integration',
  label: 'RSS 새 글',
  description: 'RSS 피드에 새 글이 있는지 확인합니다. 예약 실행과 함께 씁니다.',
  icon: Rss,
  fields: [
    {
      key: 'url', label: '피드 URL', kind: 'text', required: true, maxLength: 2048, placeholder: 'https://example.com/rss',
      pattern: { regex: /^https?:\/\//, message: 'http:// 또는 https:// 로 시작해야 합니다.' },
    },
  ],
  ports: () => [
    { id: 'new', label: '새 글 있음' },
    { id: 'none', label: '없음' },
  ],
  outputs: () => [
    { key: 'title', label: '글 제목', type: 'text' },
    { key: 'link', label: '글 링크', type: 'text' },
  ],
  summary: (p) => clip(str(p, 'url').replace(/^https?:\/\//, '') || 'URL 없음'),
  simulate: () => ({
    port: 'new',
    outputs: { title: '(모의 새 글 제목)', link: 'https://example.com/post' },
    log: '새 글이 있다고 가정했습니다. (피드를 실제로 읽지 않음)',
  }),
  spec: (p, f) =>
    `Fetch the RSS or Atom feed at ${f.text(p.url)} (timeout 10 seconds). Persist the id (guid, else link) of the newest item this step has seen. If the feed has a newer item than the stored one, take exit "new" with outputs title and link of the newest item and store its id; otherwise take exit "none". On the very first run, store the newest item and take "none" so old posts are not announced. On fetch errors, log and take "none".`,
  requires: () => ({ slow: true, storage: true, packages: ['rss-parser'] }),
};

export const integrationDefs = [http, ai, webhook, rss];

