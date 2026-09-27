import { describe, expect, it } from 'vitest';
import { validate } from '../flow/validate';
import { NODE_DEFS } from '../nodes/registry';
import { draftSystemPrompt, draftToProject, layoutNodes, type DraftOutput } from './draftSpec';

const j = (v: unknown) => JSON.stringify(v);

// Roughly what the model returns for "a dice command with a 5-second cooldown".
const dice: DraftOutput = {
  name: '주사위 봇',
  description: '/주사위로 1~6을 굴립니다.',
  nodes: [
    { id: 'n1', type: 'trigger.slashCommand', props: [{ key: 'name', value: j('주사위') }, { key: 'description', value: j('주사위를 굴립니다') }] },
    { id: 'n2', type: 'logic.cooldown', props: [{ key: 'seconds', value: '5' }] },
    { id: 'n3', type: 'logic.random', props: [{ key: 'min', value: '1' }, { key: 'max', value: '6' }] },
    { id: 'n4', type: 'action.sendMessage', props: [{ key: 'content', value: j('🎲 {{n3.result}}') }] },
    { id: 'n5', type: 'action.sendMessage', props: [{ key: 'content', value: j('{{n2.remaining}}초 뒤에 다시') }, { key: 'ephemeral', value: 'true' }] },
  ],
  edges: [
    { from: 'n1', port: 'next', to: 'n2' },
    { from: 'n2', port: 'pass', to: 'n3' },
    { from: 'n3', port: 'next', to: 'n4' },
    { from: 'n2', port: 'blocked', to: 'n5' },
  ],
  notes: '',
};

describe('draftSystemPrompt', () => {
  it('lists every node type and is deterministic', () => {
    const a = draftSystemPrompt('ko');
    for (const type of NODE_DEFS.keys()) expect(a).toContain(`### ${type} — `);
    expect(a).toContain('opt_<option name>');
    expect(a).toBe(draftSystemPrompt('ko'));
  });
});

describe('draftToProject', () => {
  it('turns a draft into a valid flow', () => {
    const r = draftToProject(dice, 1);
    if (!r.ok) throw new Error(r.error);
    expect(r.project.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
    expect(validate(r.project.nodes, r.project.edges)).toEqual([]);
    expect(new Set(r.project.nodes.map((n) => `${n.position.x},${n.position.y}`)).size).toBe(5);
    expect(r.project.seq).toBe(6);
  });

  it('renumbers ids after existing nodes and rewires references', () => {
    const r = draftToProject(dice, 10);
    if (!r.ok) throw new Error(r.error);
    expect(r.project.nodes.map((n) => n.id)).toEqual(['n10', 'n11', 'n12', 'n13', 'n14']);
    expect(r.project.nodes[3].data.props.content).toBe('🎲 {{n12.result}}');
    expect(r.project.edges.map((e) => `${e.source}-${e.sourceHandle}-${e.target}`)).toContain('n11-blocked-n14');
  });

  it('drops unknown node types, dangling edges and odd values', () => {
    const r = draftToProject(
      {
        ...dice,
        nodes: [...dice.nodes, { id: 'x9', type: 'evil.node', props: [] }, { id: 'n6', type: 'data.text', props: [{ key: 'template', value: '{"nested":{"deep":1}}' }] }],
        edges: [...dice.edges, { from: 'n4', port: 'next', to: 'x9' }],
      },
      1,
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.project.nodes.some((n) => n.data.type === 'evil.node')).toBe(false);
    expect(r.project.dropped.join('\n')).toMatch(/evil\.node/);
    expect(r.project.dropped.join('\n')).toMatch(/연결 1개/);
    expect(r.project.nodes.find((n) => n.data.type === 'data.text')?.data.props.template).toBeUndefined();
  });

  it('fails when nothing usable came back', () => {
    expect(draftToProject({ ...dice, nodes: [{ id: 'a', type: 'nope', props: [] }], edges: [] }, 1).ok).toBe(false);
  });
});

describe('layoutNodes', () => {
  it('terminates on cycles and keeps nodes apart', () => {
    const r = draftToProject({ ...dice, edges: [...dice.edges, { from: 'n4', port: 'next', to: 'n2' }] }, 1);
    if (!r.ok) throw new Error(r.error);
    const laid = layoutNodes(r.project.nodes, r.project.edges, { x: 1000, y: 0 });
    expect(laid.every((n) => n.position.x >= 1000)).toBe(true);
    expect(new Set(laid.map((n) => `${n.position.x},${n.position.y}`)).size).toBe(laid.length);
  });
});
