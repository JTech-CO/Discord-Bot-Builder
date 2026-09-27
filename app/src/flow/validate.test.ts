import { describe, expect, it } from 'vitest';
import { DISCORD_TOKEN_LIKE, E, N } from '../test/graph';
import { validate } from './validate';

const messages = (...args: Parameters<typeof validate>) => validate(...args).map((i) => `${i.level} ${i.nodeId ?? '-'} ${i.message}`);

describe('validate', () => {
  it('accepts a clean flow', () => {
    const issues = validate(
      [N('n1', 'trigger.slashCommand', { name: 'dice', description: 'roll' }), N('n2', 'action.sendMessage', { target: 'reply', content: 'hi {{n1.user}}' })],
      [E('n1', 'next', 'n2')],
    );
    expect(issues).toEqual([]);
  });

  it('warns when a referenced step does not run on every path', () => {
    const out = messages(
      [
        N('n1', 'trigger.slashCommand', { name: 'a', description: 'd' }),
        N('n2', 'logic.chance', { percent: 50 }),
        N('n3', 'logic.random', { min: 1, max: 6 }),
        N('n4', 'action.sendMessage', { target: 'reply', content: '{{n3.result}}' }),
      ],
      [E('n1', 'next', 'n2'), E('n2', 'success', 'n3'), E('n3', 'next', 'n4'), E('n2', 'fail', 'n4')],
    );
    expect(out).toEqual([expect.stringMatching(/^warning n4 .*#3 노드를 거치지 않는 경로/)]);
  });

  it('rejects references to later, missing or unknown outputs', () => {
    const out = messages(
      [
        N('n1', 'trigger.slashCommand', { name: 'a', description: 'd' }),
        N('n2', 'action.sendMessage', { target: 'reply', content: '{{n3.result}} {{n9.x}} {{n1.nope}} {{junk}}' }),
        N('n3', 'logic.random', { min: 1, max: 6 }),
      ],
      [E('n1', 'next', 'n2'), E('n2', 'next', 'n3')],
    );
    expect(out.filter((m) => m.startsWith('error n2'))).toHaveLength(4);
  });

  it('checks context and value types', () => {
    const out = messages(
      [
        N('n1', 'trigger.member', { event: 'join' }),
        N('n2', 'logic.random', { min: 1, max: 6 }),
        N('n3', 'action.sendMessage', { target: 'reply', content: 'hi' }),
        N('n4', 'action.role', { operation: 'add', member: '{{n2.result}}', roleId: '123456789012345678' }),
      ],
      [E('n1', 'next', 'n2'), E('n2', 'next', 'n3'), E('n3', 'next', 'n4')],
    );
    expect(out).toContainEqual(expect.stringMatching(/^error n3 이벤트로 시작한 흐름/));
    expect(out).toContainEqual(expect.stringMatching(/^error n4 .*숫자입니다/));
  });

  it('flags secrets typed into fields', () => {
    const out = messages(
      [
        N('n1', 'trigger.slashCommand', { name: 'a', description: 'd' }),
        N('n2', 'action.sendMessage', { target: 'reply', content: `token ${DISCORD_TOKEN_LIKE}` }),
        N('n3', 'integration.http', { method: 'GET', url: 'https://x.test', headers: [{ name: 'Authorization', value: `Bearer sk-ant-${'a'.repeat(30)}` }] }),
      ],
      [E('n1', 'next', 'n2'), E('n2', 'next', 'n3')],
    );
    expect(out.filter((m) => m.includes('비밀값'))).toHaveLength(2);
  });

  it('enforces the 28-day timeout limit across units', () => {
    const base = [N('n1', 'trigger.slashCommand', { name: 'a', description: 'd' })];
    const timeout = (duration: number, unit: string) =>
      messages([...base, N('n2', 'action.moderate', { operation: 'timeout', member: '{{n1.member}}', duration, unit })], [E('n1', 'next', 'n2')]);
    expect(timeout(28, 'days')).toEqual([]);
    expect(timeout(29, 'days')).toContainEqual(expect.stringMatching(/28일/));
  });
});
