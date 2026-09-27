import { z } from 'zod';
import { fromFile, type ProjectFile } from '../flow/file';
import { indexGraph } from '../flow/graph';
import type { BotEdge, BotNode } from '../flow/model';
import { CATEGORIES, NODE_DEFS, defaultProps, defsByCategory, portsOf } from '../nodes/registry';
import type { FieldDef, GraphView, NodeDef } from '../nodes/types';

/**
 * What the drafting model returns. Structured outputs need every object's keys declared up
 * front, so props come back as key/value pairs whose value is JSON text.
 */
export const DraftOutput = z.object({
  name: z.string(),
  description: z.string(),
  nodes: z.array(z.object({ id: z.string(), type: z.string(), props: z.array(z.object({ key: z.string(), value: z.string() })) })),
  edges: z.array(z.object({ from: z.string(), port: z.string(), to: z.string() })),
  notes: z.string(),
});
export type DraftOutput = z.infer<typeof DraftOutput>;

export const MAX_DESCRIPTION = 2000;
const MAX_NODES = 120;
const EMPTY_GRAPH: GraphView = { nodesOfType: () => [] };

// ── Catalog prompt ────────────────────────────────────

function describeField(f: FieldDef): string {
  const bits: string[] = [];
  switch (f.kind) {
    case 'text':
    case 'textarea':
      bits.push('string');
      if (f.maxLength) bits.push(`≤${f.maxLength} chars`);
      if (f.refs) bits.push('refs allowed');
      if (f.default !== undefined) bits.push(`default ${JSON.stringify(f.default)}`);
      break;
    case 'number':
      bits.push('number');
      if (f.min !== undefined || f.max !== undefined) bits.push(`${f.min ?? '…'}–${f.max ?? '…'}`);
      if (f.default !== undefined) bits.push(`default ${f.default}`);
      break;
    case 'boolean':
      bits.push('boolean');
      if (f.default !== undefined) bits.push(`default ${f.default}`);
      break;
    case 'select':
      bits.push(`one of ${f.options.map((o) => JSON.stringify(o.value)).join(' | ')}`, `default ${JSON.stringify(f.default)}`);
      break;
    case 'color':
      bits.push('"#RRGGBB"');
      break;
    case 'list':
      bits.push(`array of strings, ≤${f.maxItems}`);
      break;
    case 'table':
      bits.push(
        `array of objects { ${f.columns
          .map((c) => `${c.key}: ${c.kind === 'select' ? c.options!.map((o) => JSON.stringify(o.value)).join('|') : c.kind === 'boolean' ? 'boolean' : 'string'}`)
          .join(', ')} }, ≤${f.maxRows}`,
      );
      break;
  }
  if (f.required) bits.push('required');
  if ('pattern' in f && f.pattern) bits.push(`rule: ${f.pattern.message}`);
  if (f.when) bits.push('only used in some modes');
  return `  - ${f.key} (${bits.join(', ')})`;
}

function describeNode(def: NodeDef): string {
  const props = defaultProps(def);
  const outputs = def.outputs?.(props, EMPTY_GRAPH) ?? [];
  const ports = portsOf(def, props);
  const lines = [
    `### ${def.type} — ${def.label}`,
    def.description,
    def.fields.length ? `- fields:\n${def.fields.map(describeField).join('\n')}` : '- fields: none',
    `- outputs: ${outputs.length ? outputs.map((o) => `${o.key} (${o.type})`).join(', ') : 'none'}`,
    `- ports: ${ports.length === 0 ? 'none (the flow ends here)' : ports.map((p) => p.id).join(', ')}`,
  ];
  if (def.draftHint) lines.push(`- note: ${def.draftHint}`);
  return lines.join('\n');
}

export function draftSystemPrompt(locale: 'ko' | 'en'): string {
  const catalog = CATEGORIES.map((c) => defsByCategory(c.id).map(describeNode).join('\n\n')).join('\n\n');
  const language = locale === 'ko' ? 'Korean' : 'English';
  return `You design Discord bots for a visual flow editor. Turn the user's description into a flow built only from the node types listed below. A person will review and edit your draft, so prefer a small, correct flow over a large one.

## Flow rules
- Every flow starts at a trigger node and continues along edges. An edge goes from one port of a node ("port") to another node. Each port connects to at most one node; several edges may enter the same node. No cycles.
- Name node ids n1, n2, n3, … in the order you create them.
- props: set only the fields you need; omitted fields use their defaults. Each value is JSON text: strings in quotes, numbers, booleans, arrays, objects for table rows.
- String fields marked "refs allowed" may contain {{nX.key}} to insert output "key" of node nX. Only reference nodes that run before on every path to this node. Use {{env.NAME}} for secrets; never invent tokens, keys or webhook URLs.
- IDs of real Discord roles, channels or messages are unknown: prefer outputs such as {{n1.channel}}; otherwise leave the field empty so the user fills it in.
- Buttons in action.sendMessage start a trigger.button flow with the same customId; action.showModal starts a trigger.modalSubmit flow with the same customId.
- When something cannot be expressed with these nodes, use custom.instruction with a precise description.
- Write the bot's own message text, the flow name and description in ${language}. Put anything the user must do afterwards (IDs to fill in, tokens to add) in notes, briefly.

## Node types

${catalog}
`;
}

// ── Draft → project ───────────────────────────────────

export interface DraftProject {
  name: string;
  description: string;
  nodes: BotNode[];
  edges: BotEdge[];
  seq: number;
  notes: string;
  /** Parts of the model's answer that were left out, in Korean. */
  dropped: string[];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function remapDeep(value: unknown, ids: Map<string, string>, pattern: RegExp): unknown {
  if (typeof value === 'string') return value.replace(pattern, (_m, sp: string, id: string) => `{{${sp}${ids.get(id)}.`);
  if (Array.isArray(value)) return value.map((v) => remapDeep(v, ids, pattern));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remapDeep(v, ids, pattern)]));
  return value;
}

const plainCell = (v: unknown) => typeof v === 'string' || typeof v === 'boolean';
const acceptable = (v: unknown) =>
  typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) ||
  (Array.isArray(v) && v.every((x) => typeof x === 'string' || (x && typeof x === 'object' && !Array.isArray(x) && Object.values(x).every(plainCell))));

/** Validates the model's draft and turns it into canvas nodes, with ids starting at `startSeq`. */
export function draftToProject(raw: DraftOutput, startSeq: number): { ok: true; project: DraftProject } | { ok: false; error: string } {
  const dropped: string[] = [];
  const seen = new Set<string>();
  const kept = raw.nodes.filter((n) => {
    if (!NODE_DEFS.has(n.type)) {
      dropped.push(`알 수 없는 노드 종류 "${n.type}"`);
      return false;
    }
    if (seen.has(n.id)) {
      dropped.push(`중복된 노드 ID "${n.id}"`);
      return false;
    }
    seen.add(n.id);
    return true;
  });
  if (kept.length > MAX_NODES) {
    dropped.push(`노드가 너무 많아 앞의 ${MAX_NODES}개만 남겼습니다`);
    kept.length = MAX_NODES;
  }
  if (kept.length === 0) return { ok: false, error: '쓸 수 있는 노드가 없는 초안이 왔습니다. 설명을 조금 더 구체적으로 적어 다시 시도해 주세요.' };

  const ids = new Map(kept.map((n, i) => [n.id, `n${startSeq + i}`]));
  const pattern = new RegExp(`\\{\\{(\\s*)(${[...ids.keys()].map(escapeRe).join('|')})\\.`, 'g');

  const nodes: ProjectFile['nodes'] = kept.map((n) => {
    const props: Record<string, unknown> = {};
    for (const { key, value } of n.props) {
      let v: unknown;
      try {
        v = JSON.parse(value);
      } catch {
        v = value;
      }
      v = remapDeep(v, ids, pattern);
      if (typeof v === 'string' && v.length > 20_000) v = v.slice(0, 20_000);
      if (acceptable(v)) props[key] = v;
      else dropped.push(`${n.id}의 "${key}" 값`);
    }
    return { id: ids.get(n.id)!, type: n.type, position: { x: 0, y: 0 }, props: props as ProjectFile['nodes'][number]['props'] };
  });

  const edges: ProjectFile['edges'] = raw.edges
    .filter((e) => ids.has(e.from) && ids.has(e.to))
    .map((e) => ({ source: ids.get(e.from)!, sourcePort: e.port.slice(0, 64), target: ids.get(e.to)! }));
  if (edges.length < raw.edges.length) dropped.push(`없는 노드를 잇는 연결 ${raw.edges.length - edges.length}개`);

  const loaded = fromFile({
    format: 'discord-bot-builder',
    version: 2,
    meta: { name: raw.name.slice(0, 100) || '새 봇', description: raw.description.slice(0, 2000), commandScope: 'guild', locale: 'ko' },
    nodes,
    edges,
  });
  if (!loaded.ok) return { ok: false, error: loaded.error };

  return {
    ok: true,
    project: {
      name: loaded.project.meta.name,
      description: loaded.project.meta.description,
      nodes: layoutNodes(loaded.project.nodes, loaded.project.edges),
      edges: loaded.project.edges,
      seq: startSeq + kept.length,
      notes: raw.notes.slice(0, 2000),
      dropped,
    },
  };
}

// ── Layout ────────────────────────────────────────────

const COL = 288;
const ROW = 176;

/**
 * Top-down layered layout: each connected group gets its own column band, nodes sit on the
 * row of their longest path from a start node.
 */
export function layoutNodes(nodes: BotNode[], edges: BotEdge[], origin = { x: 0, y: 0 }): BotNode[] {
  const idx = indexGraph(nodes, edges);
  const order = new Map(nodes.map((n, i) => [n.id, i]));

  // Connected groups (ignoring direction).
  const group = new Map<string, number>();
  let groups = 0;
  for (const n of nodes) {
    if (group.has(n.id)) continue;
    const stack = [n.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (group.has(id)) continue;
      group.set(id, groups);
      for (const e of idx.out.get(id) ?? []) stack.push(e.target);
      for (const e of idx.in.get(id) ?? []) stack.push(e.source);
    }
    groups++;
  }

  // Longest-path layers via Kahn's algorithm; nodes left on a cycle go below everything else.
  const layer = new Map<string, number>();
  const indegree = new Map(nodes.map((n) => [n.id, idx.in.get(n.id)?.length ?? 0]));
  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  queue.forEach((id) => layer.set(id, 0));
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of idx.out.get(id) ?? []) {
      layer.set(e.target, Math.max(layer.get(e.target) ?? 0, layer.get(id)! + 1));
      const d = indegree.get(e.target)! - 1;
      indegree.set(e.target, d);
      if (d === 0) queue.push(e.target);
    }
  }
  const deepest = Math.max(0, ...layer.values());
  for (const n of nodes) if (!layer.has(n.id) || indegree.get(n.id)! > 0) layer.set(n.id, deepest + 1);

  const positions = new Map<string, { x: number; y: number }>();
  let bandX = origin.x;
  for (let g = 0; g < groups; g++) {
    const members = nodes.filter((n) => group.get(n.id) === g);
    const rows = new Map<number, string[]>();
    for (const n of members) (rows.get(layer.get(n.id)!) ?? rows.set(layer.get(n.id)!, []).get(layer.get(n.id)!)!).push(n.id);
    const width = Math.max(...[...rows.values()].map((r) => r.length));
    for (const [row, ids] of rows) {
      ids.sort((a, b) => order.get(a)! - order.get(b)!);
      const offset = ((width - ids.length) * COL) / 2;
      ids.forEach((id, i) => positions.set(id, { x: bandX + offset + i * COL, y: origin.y + row * ROW }));
    }
    bandX += width * COL + COL / 2;
  }

  const snap = (v: number) => Math.round(v / 16) * 16;
  return nodes.map((n) => {
    const p = positions.get(n.id)!;
    return { ...n, position: { x: snap(p.x), y: snap(p.y) } };
  });
}
