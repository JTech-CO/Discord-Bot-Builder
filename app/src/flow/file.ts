import { z } from 'zod';
import { getDef } from '../nodes/registry';
import type { NodeDef, Props, TableRow } from '../nodes/types';
import { NODE_ID_RE, nodeNumber, type BotEdge, type BotNode, type ProjectMeta } from './model';
import { t } from '../i18n/t';

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_NODES = 500;
const MAX_EDGES = 2000;

const cell = z.union([z.string().max(10000), z.boolean()]);
const propValue = z.union([
  z.string().max(20000),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string().max(10000), z.record(z.string().max(64), cell)])).max(200),
]);

const nodeId = z.string().regex(NODE_ID_RE);

const fileSchema = z.object({
  format: z.literal('discord-bot-builder'),
  version: z.literal(2),
  meta: z.object({
    name: z.string().max(100),
    description: z.string().max(2000),
    commandScope: z.enum(['guild', 'global']),
    locale: z.enum(['ko', 'en']),
  }),
  nodes: z
    .array(
      z.object({
        id: nodeId,
        type: z.string().max(64),
        position: z.object({ x: z.number(), y: z.number() }),
        props: z.record(z.string().max(64), propValue),
      }),
    )
    .max(MAX_NODES),
  edges: z
    .array(z.object({ source: nodeId, sourcePort: z.string().max(64), target: nodeId }))
    .max(MAX_EDGES),
});

export type ProjectFile = z.infer<typeof fileSchema>;

export interface LoadedProject {
  meta: ProjectMeta;
  nodes: BotNode[];
  edges: BotEdge[];
  seq: number;
}

export const edgeId = (source: string, port: string, target: string) => `e-${source}-${port}-${target}`;

export function toFile(meta: ProjectMeta, nodes: BotNode[], edges: BotEdge[]): ProjectFile {
  return {
    format: 'discord-bot-builder',
    version: 2,
    meta,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.type,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      props: n.data.props as ProjectFile['nodes'][number]['props'],
    })),
    edges: edges.map((e) => ({ source: e.source, sourcePort: e.sourceHandle ?? 'next', target: e.target })),
  };
}

/** Copies only the keys the node definition knows, in the shapes it expects. */
function sanitizeProps(def: NodeDef, raw: Record<string, unknown>): Props {
  const props: Props = {};
  for (const f of def.fields) {
    if (!Object.hasOwn(raw, f.key)) continue;
    const v = raw[f.key];
    if (f.kind === 'table') {
      if (!Array.isArray(v)) continue;
      props[f.key] = v
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r) => {
          const row: TableRow = {};
          for (const c of f.columns) {
            const cellValue = Object.hasOwn(r, c.key) ? r[c.key] : undefined;
            if (typeof cellValue === 'string' || typeof cellValue === 'boolean') row[c.key] = cellValue;
          }
          return row;
        });
    } else if (f.kind === 'list') {
      if (Array.isArray(v)) props[f.key] = v.filter((s) => typeof s === 'string');
    } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      props[f.key] = v;
    }
  }
  return props;
}

export type LoadResult = { ok: true; project: LoadedProject } | { ok: false; error: string };

export function fromFile(data: unknown): LoadResult {
  const parsed = fileSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: t('프로젝트 파일 형식이 올바르지 않습니다. ({0}: {1})', [first?.path.join('.') || t('최상위'), first?.message]) };
  }
  const file = parsed.data;

  const ids = new Set<string>();
  const nodes: BotNode[] = [];
  for (const n of file.nodes) {
    const def = getDef(n.type);
    if (!def) return { ok: false, error: t('지원하지 않는 노드 종류가 있습니다: {0}', [n.type]) };
    if (ids.has(n.id)) return { ok: false, error: t('노드 ID가 중복됩니다: {0}', [n.id]) };
    ids.add(n.id);
    nodes.push({ id: n.id, type: 'bot', position: n.position, data: { type: n.type, props: sanitizeProps(def, n.props) } });
  }

  const edges: BotEdge[] = [];
  const seen = new Set<string>();
  for (const e of file.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    const id = edgeId(e.source, e.sourcePort, e.target);
    if (seen.has(id)) continue;
    seen.add(id);
    edges.push({ id, source: e.source, sourceHandle: e.sourcePort, target: e.target });
  }

  const seq = nodes.reduce((max, n) => Math.max(max, Number(nodeNumber(n.id))), 0) + 1;
  return { ok: true, project: { meta: file.meta, nodes, edges, seq } };
}

export function parseProjectText(text: string): LoadResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: t('JSON 파일을 읽을 수 없습니다.') };
  }
  return fromFile(data);
}
