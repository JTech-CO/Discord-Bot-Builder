import { Bot, Globe, Rss, Webhook } from 'lucide-react';
import type { NodeDef } from '../types';
import { ENV_NAME, clip, str } from '../helpers';

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
    { key: 'model', label: '모델', kind: 'text', maxLength: 100, placeholder: 'claude-opus-5-5', help: '비워 두면 제공자의 최신 권장 모델을 씁니다.' },
    { key: 'system', label: '역할 지시', kind: 'textarea', maxLength: 4000, refs: true, placeholder: '너는 친절한 서버 도우미야.' },
    { key: 'prompt', label: '질문', kind: 'textarea', required: true, maxLength: 4000, refs: true, placeholder: '{{n1.content}}' },
    { key: 'maxLength', label: '답변 최대 길이(자)', kind: 'number', min: 50, max: 2000, default: 1500 },
  ],
  outputs: () => [{ key: 'reply', label: 'AI 답변', type: 'text' }],
  summary: (p) => ({ anthropic: 'Claude', openai: 'OpenAI', gemini: 'Gemini' })[str(p, 'provider')] ?? 'Claude',
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
};

export const integrationDefs = [http, ai, webhook, rss];

