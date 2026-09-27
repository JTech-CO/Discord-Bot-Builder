import { describe, expect, it } from 'vitest';
import { diceExample } from '../flow/examples';
import { fromFile } from '../flow/file';
import { NODE_DEFS } from '../nodes/registry';
import type { SimValue } from '../nodes/types';
import { E, N } from '../test/graph';
import { runSimulation, triggerInputs } from './run';

const dice = () => {
  const r = fromFile(diceExample);
  if (!r.ok) throw new Error(r.error);
  return r.project;
};

describe('runSimulation', () => {
  it('every node can be simulated', () => {
    for (const def of NODE_DEFS.values()) {
      if (def.category === 'trigger') {
        expect(def.simulateTrigger, def.type).toBeTypeOf('function');
        expect(def.simInputs, def.type).toBeTypeOf('function');
      } else {
        expect(def.simulate, def.type).toBeTypeOf('function');
      }
    }
  });

  it('follows the dice flow down the high branch, then hits the cooldown', () => {
    const { nodes, edges } = dice();
    const store = new Map<string, SimValue>();
    const input = triggerInputs(nodes[0], nodes, edges);
    let t = 1_000_000;
    const opts = { random: () => 0.99, now: () => t };

    const first = runSimulation(nodes, edges, 'n1', input, store, opts);
    expect(first.status).toBe('done');
    expect(first.steps.map((s) => s.nodeId)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
    expect(first.steps[2].outputs.result).toBe(6);
    const effect = first.steps[4].effect;
    expect(effect?.kind === 'message' && effect.embed?.title).toBe('🎲 6');
    expect(first.edges).toHaveLength(4);

    t += 2_000;
    const second = runSimulation(nodes, edges, 'n1', input, store, opts);
    expect(second.steps.map((s) => s.nodeId)).toEqual(['n1', 'n2', 'n6']);
    const blocked = second.steps[2].effect;
    expect(blocked?.kind === 'message' && blocked.content).toBe('3초 뒤에 다시 굴릴 수 있어요.');
    expect(blocked?.kind === 'message' && blocked.ephemeral).toBe(true);
  });

  it('takes the low branch with a low roll', () => {
    const { nodes, edges } = dice();
    const run = runSimulation(nodes, edges, 'n1', triggerInputs(nodes[0], nodes, edges), new Map(), { random: () => 0 });
    expect(run.steps.at(-1)?.nodeId).toBe('n7');
    const effect = run.steps.at(-1)?.effect;
    expect(effect?.kind === 'message' && effect.content).toBe('🎲 1… 다음엔 더 높게 나올 거예요.');
  });

  it('does not start when a message does not match', () => {
    const nodes = [N('n1', 'trigger.message', { match: 'contains', keywords: ['안녕'] }), N('n2', 'action.sendMessage', { target: 'reply', content: 'hi' })];
    const edges = [E('n1', 'next', 'n2')];
    const run = runSimulation(nodes, edges, 'n1', { user: 'a', content: '잘 가' }, new Map());
    expect(run.status).toBe('no-match');
    expect(run.steps).toHaveLength(1);
    expect(runSimulation(nodes, edges, 'n1', { user: 'a', content: '다들 안녕!' }, new Map()).status).toBe('done');
  });

  it('keeps stored data between runs', () => {
    const nodes = [
      N('n1', 'trigger.slashCommand', { name: 'point', description: 'd' }),
      N('n2', 'data.variable', { scope: 'user', key: 'point', operation: 'add', value: '10', initial: '0' }),
      N('n3', 'action.sendMessage', { target: 'reply', content: '{{n1.user}}: {{n2.value}}점' }),
    ];
    const edges = [E('n1', 'next', 'n2'), E('n2', 'next', 'n3')];
    const store = new Map<string, SimValue>();
    runSimulation(nodes, edges, 'n1', { user: '민수' }, store);
    const run = runSimulation(nodes, edges, 'n1', { user: '민수' }, store);
    const effect = run.steps[2].effect;
    expect(effect?.kind === 'message' && effect.content).toBe('@민수: 20점');
    const other = runSimulation(nodes, edges, 'n1', { user: '지수' }, store).steps[2].effect;
    expect(other?.kind === 'message' && other.content).toBe('@지수: 10점');
  });
});
