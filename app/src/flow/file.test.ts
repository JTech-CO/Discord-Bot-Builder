import { describe, expect, it } from 'vitest';
import { fromFile, parseProjectText } from './file';

const meta = { name: 'x', description: '', commandScope: 'guild', locale: 'ko' };
const file = (nodes: unknown[], edges: unknown[] = []) => ({ format: 'discord-bot-builder', version: 2, meta, nodes, edges });

describe('project file import', () => {
  it('rejects unknown node types and bad ids', () => {
    expect(fromFile(file([{ id: 'n1', type: 'evil.node', position: { x: 0, y: 0 }, props: {} }])).ok).toBe(false);
    expect(fromFile(file([{ id: '../x', type: 'logic.random', position: { x: 0, y: 0 }, props: {} }])).ok).toBe(false);
    expect(parseProjectText('not json').ok).toBe(false);
  });

  it('keeps only known props and drops dangling edges', () => {
    const props = JSON.parse('{"min":1,"__proto__":{"polluted":true},"evil":"x"}');
    const r = fromFile(file([{ id: 'n1', type: 'logic.random', position: { x: 0, y: 0 }, props }], [{ source: 'n1', sourcePort: 'next', target: 'n99' }]));
    if (!r.ok) throw new Error(r.error);
    expect(r.project.nodes[0].data.props).toEqual({ min: 1 });
    expect(r.project.edges).toEqual([]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(r.project.seq).toBe(2);
  });
});
