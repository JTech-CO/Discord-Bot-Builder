/**
 * Credentials that must never end up in a project file or a prompt sent to an AI.
 * Authors should reference them as {{env.NAME}} instead.
 */
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: '디스코드 봇 토큰', re: /\b[MNO][A-Za-z\d_-]{23,27}\.[A-Za-z\d_-]{6}\.[A-Za-z\d_-]{27,40}\b/g },
  { name: '디스코드 웹훅 URL', re: /https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/g },
  { name: 'Anthropic API 키', re: /\bsk-ant-[A-Za-z\d_-]{20,}/g },
  { name: 'OpenAI API 키', re: /\bsk-(?:proj-)?[A-Za-z\d_-]{20,}/g },
  { name: 'Google API 키', re: /\bAIza[\w-]{35}\b/g },
  { name: 'GitHub 토큰', re: /\bgh[pousr]_[A-Za-z\d]{36,}\b/g },
  { name: 'Slack 토큰', re: /\bxox[abprs]-[A-Za-z\d-]{10,}/g },
  { name: '개인 키', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

export const REDACTED = '[REDACTED secret: move it to an environment variable]';

/** Name of the first credential-looking value in `text`, if any. */
export function findSecret(text: string): string | null {
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) return name;
  }
  return null;
}

export function redactSecrets(text: string): string {
  return PATTERNS.reduce((s, { re }) => s.replace(re, REDACTED), text);
}
